import { getDepartmentLocation, IIT_GUWAHATI_LOCATION } from '@/constants/geofenceLocation';
import { validationService } from '@/services/attendanceValidationService';
import { LocationCoordinates, locationService } from '@/services/locationService';
import { useAttendanceStore } from '@/store/attendanceStore';
import { LatLng, MapLayer, MapMarker, MapShape } from '@/types/geofence';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { MapShapeType } from 'react-native-leaflet-view';

let cachedHtml: string | null = null;

export function useGeofence(
  userLocationType?: 'CAMPUS' | 'FIELDTRIP' | null,
  onLocationUpdate?: (location: LocationCoordinates) => void
) {
  const [html, setHtml] = useState<string | null>(cachedHtml);
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [initialPos, setInitialPos] = useState<LatLng | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isWatching, setIsWatching] = useState(false);

  const department = useAttendanceStore((state) => state.department);
  const currentView = useAttendanceStore((state) => state.currentView);
  const todayAttendanceMarked = useAttendanceStore((state) => state.todayAttendanceMarked);

  const shouldWatch = useMemo(() => {
    return currentView === 'home' && !todayAttendanceMarked;
  }, [currentView, todayAttendanceMarked]);

  const activeGeofenceLocations = useMemo(() => {
    if (userLocationType === 'FIELDTRIP') return [];
    if (!department) return [IIT_GUWAHATI_LOCATION];

    const departmentLocation = getDepartmentLocation(department);
    if (!departmentLocation) return [IIT_GUWAHATI_LOCATION];

    return [IIT_GUWAHATI_LOCATION, departmentLocation];
  }, [department, userLocationType]);

  const mapShapes = useMemo((): MapShape[] =>
    activeGeofenceLocations.map((geofence, index) => ({
      shapeType: MapShapeType.CIRCLE,
      color: index === 0 ? '#00a8ff' : '#ff6b6b',
      id: geofence.id,
      center: geofence.center,
      radius: geofence.radius,
    })),
    [activeGeofenceLocations]
  );

  const mapLayers = useMemo((): MapLayer[] => [{
    baseLayerName: 'OpenStreetMap',
    baseLayerIsChecked: true,
    baseLayer: true,
    url: process.env.EXPO_PUBLIC_OPENSTREETMAP_URL!,
    attribution: process.env.EXPO_PUBLIC_OPENSTREETMAP_ATTRIBUTION!,
  }], []);

  const mapMarkers = useMemo((): MapMarker[] => {
    const markers: MapMarker[] = [];

    activeGeofenceLocations.forEach((g, idx) => {
      markers.push({
        id: g.id + '_label',
        position: {
          lat: g.center.lat + 0.00015 * (idx + 1),
          lng: g.center.lng
        },
        icon: `
          <div style="
            background: ${idx === 0 ? '#00a8ff' : '#ff6b6b'};
            border: 2px solid #fff;
            border-radius: 8px;
            padding: 6px 10px;
            font-size: 12px;
            font-weight: bold;
            color: #fff;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            text-align: center;
          ">
            ${g.label}
          </div>
        `,
        size: [120, 35],
        anchor: [60, 35],
      });
    });

    if (userPos) {
      markers.push({
        id: 'myPosition',
        position: userPos,
        icon: `
          <div style="
            width: 10px;
            height: 10px;
            background: #ff0000;
            border: 3px solid #fff;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          "> </div>
        `,
        size: [16, 16],
        anchor: [8, 8],
      });
    }

    return markers;
  }, [userPos, activeGeofenceLocations]);

  const mapCenter = useMemo((): LatLng | null => {
    if (userPos) return userPos;
    if (activeGeofenceLocations.length === 0) return initialPos;
    if (activeGeofenceLocations.length === 1) return activeGeofenceLocations[0].center;

    const totalLat = activeGeofenceLocations.reduce(
      (sum, loc) => sum + loc.center.lat, 0
    );
    const totalLng = activeGeofenceLocations.reduce(
      (sum, loc) => sum + loc.center.lng, 0
    );

    return {
      lat: totalLat / activeGeofenceLocations.length,
      lng: totalLng / activeGeofenceLocations.length,
    };
  }, [activeGeofenceLocations, initialPos, userPos]);

  useEffect(() => {
    if (cachedHtml) {
      setHtml(cachedHtml);
      return;
    }

    const loadHtml = async () => {
      try {
        const asset = Asset.fromModule(require('../assets/leaflet.html'));
        await asset.downloadAsync();
        const htmlContent = await FileSystem.readAsStringAsync(asset.localUri!);
        cachedHtml = htmlContent;
        setHtml(htmlContent);
      } catch (error) {
        console.error('Error loading HTML:', error);
        Alert.alert('Error', 'Failed to load map resources');
      }
    };

    loadHtml();
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const initialized = await locationService.initialize({
        enableHighAccuracy: false,
        updateInterval: 10000,
        distanceInterval: 10,
      });

      if (initialized) {
        const location = await locationService.getCurrentLocation();
        if (location) {
          const latLng = locationService.toLatLng(location);
          setUserPos(latLng);
          setInitialPos(latLng);
          setIsInitialized(true);

          if (onLocationUpdate) {
            onLocationUpdate(location);
          }
        }
      }
    };

    initialize();

    return () => {
      locationService.stopWatching();
    };
  }, []);

  useEffect(() => {
    if (shouldWatch && !isWatching) {
      locationService.startWatching((location) => {
        const latLng = locationService.toLatLng(location);
        setUserPos(latLng);

        if (onLocationUpdate) onLocationUpdate(location);
      });
      setIsWatching(true);
    } else if (!shouldWatch && isWatching) {
      locationService.stopWatching();
      setIsWatching(false);
    }
  }, [shouldWatch, isWatching, onLocationUpdate]);

  const captureLocationForAttendance = useCallback(async (): Promise<LocationCoordinates | null> => {
    try {
      const location = await locationService.getCurrentLocation();
      if (!location) {
        Alert.alert(
          'Location Error',
          'Unable to get your location. Please ensure GPS is enabled and try again.'
        );
        return null;
      }

      if (department && userLocationType) {
        const validation = validationService.validateAttendance(
          locationService.toLatLng(location),
          department,
          userLocationType
        );

        if (!validation.isValid) {
          Alert.alert('Location Invalid', validation.reason || 'Invalid location');
          return null;
        }
      }

      if (onLocationUpdate) onLocationUpdate(location);

      return location;
    } catch (error) {
      console.error('Error capturing location:', error);
      Alert.alert('Error', 'Failed to capture location');
      return null;
    }
  }, [department, userLocationType, onLocationUpdate]);

  const getLocationStatus = useCallback((): string => {
    if (!userPos || !department) return 'Unknown';

    return validationService.getLocationStatus(
      userPos,
      department,
      userLocationType ?? null
    );
  }, [userPos, department, userLocationType]);

  const requestPermission = useCallback(async () => {
    return locationService.requestPermission();
  }, []);

  return {
    html,
    userPos,
    initialPos,
    isInitialized,
    mapShapes,
    mapLayers,
    mapMarkers,
    mapCenter,
    captureLocationForAttendance,
    getLocationStatus,
    requestPermission,
    isWatching,
  };
}
