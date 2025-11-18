import { AudioModule } from 'expo-audio';
import { CameraType, useCameraPermissions } from 'expo-camera';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';

interface PermissionStatus {
  camera: boolean;
  audio: boolean;
  location: boolean;
  allGranted: boolean;
}

interface UsePermissionsReturn {
  permissions: PermissionStatus;
  isLoading: boolean;
  requestAllPermissions: () => Promise<boolean>;
  checkPermissions: () => Promise<PermissionStatus>;
  cameraFacing: CameraType;
  setCameraFacing: (facing: CameraType) => void;
  cameraRef: React.RefObject<any>;
  isAudioPlaying: boolean;
  locationServicesEnabled: boolean;
  requestCameraPermission: () => Promise<boolean>;
  requestAudioPermission: () => Promise<boolean>;
  requestLocationPermission: () => Promise<boolean>;
}

class PermissionManager {
  private static instance: PermissionManager;
  private permissionPromises: Map<string, Promise<boolean>> = new Map();

  static getInstance(): PermissionManager {
    if (!this.instance) {
      this.instance = new PermissionManager();
    }
    return this.instance;
  }

  async requestPermission(type: string, requestFn: () => Promise<boolean>): Promise<boolean> {
    if (this.permissionPromises.has(type)) {
      return this.permissionPromises.get(type)!;
    }

    const promise = requestFn();
    this.permissionPromises.set(type, promise);

    try {
      const result = await promise;
      this.permissionPromises.delete(type);
      return result;
    } catch (error) {
      this.permissionPromises.delete(type);
      throw error;
    }
  }
}

export function usePermissions(): UsePermissionsReturn {
  const permissionManager = PermissionManager.getInstance();

  const [cameraPermission, requestCameraPermissionExpo] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<CameraType>('front');
  const cameraRef = useRef<any>(null);

  const [permissions, setPermissions] = useState<PermissionStatus>({
    camera: false,
    audio: false,
    location: false,
    allGranted: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isAudioPlaying] = useState(false);
  const [locationServicesEnabled, setLocationServicesEnabled] = useState(true);

  const checkPermissions = useCallback(async () => {
    try {
      const cameraGranted = cameraPermission?.granted || false;
      const audioStatus = await AudioModule.getRecordingPermissionsAsync();
      const audioGranted = audioStatus.granted;
      const locationStatus = await Location.getForegroundPermissionsAsync();
      const locationGranted = locationStatus.granted;
      const servicesEnabled = await Location.hasServicesEnabledAsync();

      setLocationServicesEnabled(servicesEnabled);

      const newPermissions: PermissionStatus = {
        camera: cameraGranted,
        audio: audioGranted,
        location: locationGranted,
        allGranted: cameraGranted && audioGranted && locationGranted,
      };

      setPermissions(newPermissions);
      return newPermissions;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return permissions;
    }
  }, [cameraPermission?.granted]);

  const requestCameraPermission = useCallback(async () => {
    return permissionManager.requestPermission('camera', async () => {
      const result = await requestCameraPermissionExpo();
      const granted = result?.granted || false;

      setPermissions(prev => ({
        ...prev,
        camera: granted,
        allGranted: granted && prev.audio && prev.location,
      }));

      return granted;
    });
  }, [requestCameraPermissionExpo]);

  const requestAudioPermission = useCallback(async () => {
    return permissionManager.requestPermission('audio', async () => {
      const result = await AudioModule.requestRecordingPermissionsAsync();
      const granted = result.granted;

      if (!granted) {
        Alert.alert('Microphone Permission Required', 'Audio recording is required for voice verification during attendance.', [{ text: 'OK' }]);
      }

      setPermissions(prev => ({
        ...prev,
        audio: granted,
        allGranted: prev.camera && granted && prev.location,
      }));

      if (granted) {
        await AudioModule.setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      }

      return granted;
    });
  }, []);

  const requestLocationPermission = useCallback(async () => {
    return permissionManager.requestPermission('location', async () => {
      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'android') {
                  IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS);
                } else {
                  Linking.openURL('app-settings:');
                }
              },
            },
          ]
        );
        return false;
      }

      const result = await Location.requestForegroundPermissionsAsync();
      const granted = result.granted;

      if (!granted) {
        Alert.alert('Location Permission Required', 'Location access is required to verify attendance location.', [{ text: 'OK' }]);
      }

      setPermissions(prev => ({
        ...prev,
        location: granted,
        allGranted: prev.camera && prev.audio && granted,
      }));

      return granted;
    });
  }, []);

  const requestAllPermissions = useCallback(async () => {
    if (isLoading) return false;

    setIsLoading(true);

    try {
      const [cameraGranted, audioGranted, locationGranted] = await Promise.all([
        requestCameraPermission(),
        requestAudioPermission(),
        requestLocationPermission(),
      ]);

      const allGranted = cameraGranted && audioGranted && locationGranted;

      if (!allGranted) {
        const denied: string[] = [];
        if (!cameraGranted) denied.push('Camera');
        if (!audioGranted) denied.push('Microphone');
        if (!locationGranted) denied.push('Location');

        Alert.alert(
          'Permissions Required',
          `The following permissions are required: ${denied.join(', ')}. Please grant all permissions to continue.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }

      return allGranted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, requestCameraPermission, requestAudioPermission, requestLocationPermission]);

  useEffect(() => {
    checkPermissions();
  }, []);

  return {
    permissions,
    isLoading,
    requestAllPermissions,
    checkPermissions,
    cameraFacing,
    setCameraFacing,
    cameraRef,
    isAudioPlaying,
    locationServicesEnabled,
    requestCameraPermission,
    requestAudioPermission,
    requestLocationPermission,
  };
}
