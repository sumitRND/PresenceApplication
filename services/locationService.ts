// services/locationService.ts

import { LatLng } from '@/types/geofence';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

interface LocationServiceConfig {
  enableHighAccuracy?: boolean;
  updateInterval?: number;
  distanceInterval?: number;
  maxAge?: number;
  requiredAccuracy?: number;
}

class SimpleEventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, listener: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  emit(event: string, ...args: any[]): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(...args));
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}

class LocationService extends SimpleEventEmitter {
  private static instance: LocationService;
  private watchSubscription: Location.LocationSubscription | null = null;
  private currentLocation: LocationCoordinates | null = null;
  private isWatching: boolean = false;
  private lastUpdateTime: number = 0;
  private readonly UPDATE_THROTTLE = 5000;

  private config: LocationServiceConfig = {
    enableHighAccuracy: Platform.OS === 'ios',
    updateInterval: Platform.OS === 'android' ? 5000 : 3000,
    distanceInterval: Platform.OS === 'android' ? 5 : 2,
    maxAge: 30000,
    requiredAccuracy: 500,
  };

  static getInstance(): LocationService {
    if (!this.instance) {
      this.instance = new LocationService();
    }
    return this.instance;
  }

  async initialize(config?: LocationServiceConfig): Promise<boolean> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    const servicesEnabled = await this.checkLocationServices();
    if (!servicesEnabled) return false;

    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) return false;
    }

    return true;
  }

  async checkLocationServices(): Promise<boolean> {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'android') {
                  IntentLauncher.startActivityAsync(
                    IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
                  );
                } else {
                  Linking.openURL('app-settings:');
                }
              },
            },
          ]
        );
      }
      return enabled;
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

  async checkPermission(): Promise<boolean> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  }

  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Location permission is required for attendance tracking.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
    return status === 'granted';
  }

  async getCurrentLocation(): Promise<LocationCoordinates | null> {
    if (this.currentLocation && Date.now() - this.lastUpdateTime < this.config.maxAge!) {
      return this.currentLocation;
    }

    try {
      const highAccuracyPromise = Location.getCurrentPositionAsync({
        accuracy: this.config.enableHighAccuracy
          ? Location.Accuracy.High
          : Location.Accuracy.Balanced,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Location request timed out')), 10000)
      );

      const location = await Promise.race([highAccuracyPromise, timeoutPromise]);

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        timestamp: new Date(location.timestamp),
      };

      this.lastUpdateTime = Date.now();
      this.emit('locationUpdate', this.currentLocation);
      return this.currentLocation;
    } catch (error) {
      console.warn('High accuracy location failed, trying lower accuracy:', error);

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });

        this.currentLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || undefined,
          timestamp: new Date(location.timestamp),
        };

        this.lastUpdateTime = Date.now();
        this.emit('locationUpdate', this.currentLocation);
        return this.currentLocation;
      } catch (lowAccuracyError) {
        console.error('Failed to get current location with any accuracy:', lowAccuracyError);

        try {
          const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: this.config.maxAge!,
            requiredAccuracy: this.config.requiredAccuracy!,
          });

          if (lastKnown) {
            this.currentLocation = {
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
              accuracy: lastKnown.coords.accuracy || undefined,
              timestamp: new Date(lastKnown.timestamp),
            };

            Alert.alert(
              'Using Last Known Location',
              'Unable to get current location. Using last known location.',
              [{ text: 'OK' }]
            );

            this.lastUpdateTime = Date.now();
            this.emit('locationUpdate', this.currentLocation);
            return this.currentLocation;
          }
        } catch (e) {
          console.error('Last known location also failed:', e);
        }

        Alert.alert(
          'Location Error',
          'Unable to determine your location. Please ensure GPS is enabled and you have a clear signal.',
          [{ text: 'OK' }]
        );

        return null;
      }
    }
  }

  async startWatching(callback?: (location: LocationCoordinates) => void): Promise<boolean> {
    if (this.isWatching) return true;

    const initialized = await this.initialize();
    if (!initialized) return false;

    try {
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: this.config.enableHighAccuracy
            ? Location.Accuracy.High
            : Location.Accuracy.Balanced,
          timeInterval: this.config.updateInterval,
          distanceInterval: this.config.distanceInterval,
        },
        (location) => {
          const now = Date.now();
          if (now - this.lastUpdateTime < this.UPDATE_THROTTLE) return;

          this.currentLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            timestamp: new Date(location.timestamp),
          };

          this.lastUpdateTime = now;
          this.emit('locationUpdate', this.currentLocation);
          if (callback) callback(this.currentLocation);
        }
      );

      this.isWatching = true;
      return true;

    } catch (error) {
      console.error('Failed to start location watching:', error);
      return false;
    }
  }

  stopWatching(): void {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
    this.isWatching = false;
  }

  getCachedLocation(): LocationCoordinates | null {
    return this.currentLocation;
  }

  toLatLng(location: LocationCoordinates): LatLng {
    return { lat: location.latitude, lng: location.longitude };
  }

  calculateDistance(point1: LocationCoordinates, point2: LocationCoordinates): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(point2.latitude - point1.latitude);
    const dLng = toRad(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(point1.latitude)) *
      Math.cos(toRad(point2.latitude)) *
      Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  cleanup(): void {
    this.stopWatching();
    this.currentLocation = null;
    this.lastUpdateTime = 0;
    this.removeAllListeners();
  }
}

export const locationService = LocationService.getInstance();