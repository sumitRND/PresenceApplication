import {
  getDepartmentLocation,
  IIT_GUWAHATI_LOCATION,
} from "@/constants/geofenceLocation";
import { useAttendanceStore } from "@/store/attendanceStore";
import { LatLng, MapLayer, MapMarker, MapShape } from "@/types/geofence";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import { MapShapeType } from "react-native-leaflet-view";

interface AttendanceCoordinates {
  latitude: number;
  longitude: number;
  location?: string | null;
  timestamp: Date;
}

type AttendanceUpdateCallback = (coordinates: AttendanceCoordinates) => void;

// Create a variable outside the hook to act as an in-memory cache
let cachedHtml: string | null = null;

export function useGeofence(
  userLocationType?: "CAMPUS" | "FIELDTRIP" | null,
  isFieldTrip?: boolean,
  onLocationUpdate?: AttendanceUpdateCallback,
) {
  const [html, setHtml] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [initialPos, setInitialPos] = useState<LatLng | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const department = useAttendanceStore((state) => state.department);

  const activeGeofenceLocations = useMemo(() => {
    if (userLocationType === "FIELDTRIP") {
      return [];
    }

    if (!department) {
      return [IIT_GUWAHATI_LOCATION];
    }

    const departmentLocation = getDepartmentLocation(department);

    if (!departmentLocation) {
      console.warn(`Department ${department} not found in configuration`);
      return [IIT_GUWAHATI_LOCATION];
    }

    return [IIT_GUWAHATI_LOCATION, departmentLocation];
  }, [department, userLocationType]);

  const haversine = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3;
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const φ1 = toRad(lat1);
      const φ2 = toRad(lat2);
      const Δφ = toRad(lat2 - lat1);
      const Δλ = toRad(lon2 - lon1);
      const a =
        Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    [],
  );

  const checkGeofences = useCallback(
    (position: LatLng) => {
      if (userLocationType === "FIELDTRIP") {
        return "Outside IIT (Field Trip)";
      }

      if (activeGeofenceLocations.length < 2) {
        return null;
      }

      const iit = activeGeofenceLocations[0];
      const departmentLocation = activeGeofenceLocations[1];

      const distToIIT = haversine(
        position.lat,
        position.lng,
        iit.center.lat,
        iit.center.lng,
      );

      const distToDepartment = haversine(
        position.lat,
        position.lng,
        departmentLocation.center.lat,
        departmentLocation.center.lng,
      );

      if (distToIIT <= iit.radius) {
        if (distToDepartment <= departmentLocation.radius) {
          return departmentLocation.label;
        }
        return "Inside IIT (Outside Department)";
      }

      return "Outside IIT Guwahati";
    },
    [haversine, activeGeofenceLocations, userLocationType],
  );

  const updateAttendanceLocation = useCallback(
    (position: LatLng, detectedLocation: string | null) => {
      if (onLocationUpdate) {
        const coordinates: AttendanceCoordinates = {
          latitude: position.lat,
          longitude: position.lng,
          location: detectedLocation,
          timestamp: new Date(),
        };
        onLocationUpdate(coordinates);
      }
    },
    [onLocationUpdate],
  );

  const checkGeofencesRef = useRef(checkGeofences);
  useEffect(() => {
    checkGeofencesRef.current = checkGeofences;
  }, [checkGeofences]);

  const updateAttendanceLocationRef = useRef(updateAttendanceLocation);
  useEffect(() => {
    updateAttendanceLocationRef.current = updateAttendanceLocation;
  }, [updateAttendanceLocation]);

// In hooks/useGeofence.ts, update the captureLocationForAttendance function:

const captureLocationForAttendance = useCallback(async (): Promise<AttendanceCoordinates | null> => {
  try {
    // Try with high accuracy first
    const locationOptions = {
      accuracy: Platform.OS === 'android'
        ? Location.Accuracy.High
        : Location.Accuracy.BestForNavigation,
    };

    const { coords } = await Location.getCurrentPositionAsync(locationOptions);

    const position: LatLng = {
      lat: coords.latitude,
      lng: coords.longitude,
    };

    const detectedLocation = checkGeofences(position);

    const coordinates: AttendanceCoordinates = {
      latitude: position.lat,
      longitude: position.lng,
      location: detectedLocation,
      timestamp: new Date(),
    };

    if (onLocationUpdate) {
      onLocationUpdate(coordinates);
    }

    return coordinates;
  } catch (error) {
    console.error("Error capturing location for attendance:", error);
    
    // Try with lower accuracy on Android
    if (Platform.OS === 'android') {
      try {
        const { coords } = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const position: LatLng = {
          lat: coords.latitude,
          lng: coords.longitude,
        };

        const detectedLocation = checkGeofences(position);

        const coordinates: AttendanceCoordinates = {
          latitude: position.lat,
          longitude: position.lng,
          location: detectedLocation,
          timestamp: new Date(),
        };

        if (onLocationUpdate) {
          onLocationUpdate(coordinates);
        }

        return coordinates;
      } catch (androidError) {
        console.error("Android low accuracy also failed:", androidError);
      }
    }

    // Try last known location as final fallback
    try {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 30000, // Accept location from last 30 seconds
        requiredAccuracy: 500, // Accept within 500 meters accuracy
      });

      if (lastKnown) {
        const position: LatLng = {
          lat: lastKnown.coords.latitude,
          lng: lastKnown.coords.longitude,
        };

        const detectedLocation = checkGeofences(position);

        const coordinates: AttendanceCoordinates = {
          latitude: position.lat,
          longitude: position.lng,
          location: detectedLocation,
          timestamp: new Date(),
        };

        if (onLocationUpdate) {
          onLocationUpdate(coordinates);
        }

        Alert.alert(
          "Location Notice",
          "Using recent location. For best accuracy, ensure GPS has clear sky view.",
          [{ text: "OK" }]
        );

        return coordinates;
      }
    } catch (lastKnownError) {
      console.error("Last known location also failed:", lastKnownError);
    }

    Alert.alert(
      "Location Error",
      "Failed to get your current location. Please ensure location services are enabled, you have a clear GPS signal, and the app has location permissions.",
      [
        { 
          text: "Open Settings", 
          onPress: () => {
            if (Platform.OS === 'android') {
              IntentLauncher.startActivityAsync(
                IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
              );
            } else {
              Linking.openURL("app-settings:");
            }
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
    return null;
  }
}, [checkGeofences, onLocationUpdate]);

  const mapShapes = useMemo(
    (): MapShape[] =>
      activeGeofenceLocations.map((geofence, index) => ({
        shapeType: MapShapeType.CIRCLE,
        color: index === 0 ? "#00a8ff" : "#ff6b6b",
        id: geofence.id,
        center: geofence.center,
        radius: geofence.radius,
      })),
    [activeGeofenceLocations],
  );

  const mapLayers = useMemo(
    (): MapLayer[] => [
      {
        baseLayerName: "OpenStreetMap",
        baseLayerIsChecked: true,
        baseLayer: true,
        url: process.env.EXPO_PUBLIC_OPENSTREETMAP_URL!,
        attribution: process.env.EXPO_PUBLIC_OPENSTREETMAP_ATTRIBUTION!,
      },
    ],
    [],
  );

  const staticLabelMarkers = useMemo(
    (): MapMarker[] =>
      activeGeofenceLocations.map((g, idx) => {
        const offsetLat = g.center.lat + 0.00015 * (idx + 1);
        const offsetLng = g.center.lng;

        return {
          id: g.id + "_label",
          position: { lat: offsetLat, lng: offsetLng },
          icon: `
            <div style="
              position: relative;
              background: ${idx === 0 ? "#00a8ff" : "#ff6b6b"};
              border: 2px solid #fff;
              border-radius: 8px;
              padding: 6px 10px;
              font-size: 12px;
              font-weight: bold;
              color: #fff;
              white-space: nowrap;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              min-width: 100px;
              text-align: center;
            ">
              ${g.label}
              <div style="
                position: absolute;
                left: 50%;
                bottom: -8px;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 8px solid ${idx === 0 ? "#00a8ff" : "#ff6b6b"};
              "></div>
            </div>
          `,
          size: [120, 35],
          anchor: [60, 35],
        };
      }),
    [activeGeofenceLocations],
  );

  const mapMarkers = useMemo((): MapMarker[] => {
    const markers = [...staticLabelMarkers];

    if (userPos) {
      markers.push({
        id: "myPosition",
        position: userPos,
        icon: `
          <div style="
            position: relative;
            width: 10px;
            height: 10px;
            background: #ff0000;
            border: 3px solid #fff;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          ">
          </div>
        `,
        size: [26, 26],
        anchor: [13, 13],
      });
    }

    return markers;
  }, [userPos, staticLabelMarkers]);

  const mapCenter = useMemo((): LatLng | null => {
    if (activeGeofenceLocations.length === 0) {
      return initialPos;
    }

    if (activeGeofenceLocations.length === 1) {
      return activeGeofenceLocations[0].center;
    }

    const totalLat = activeGeofenceLocations.reduce(
      (sum, loc) => sum + loc.center.lat,
      0,
    );
    const totalLng = activeGeofenceLocations.reduce(
      (sum, loc) => sum + loc.center.lng,
      0,
    );

    return {
      lat: totalLat / activeGeofenceLocations.length,
      lng: totalLng / activeGeofenceLocations.length,
    };
  }, [activeGeofenceLocations, initialPos]);

  useEffect(() => {
    const initializeHtml = async () => {
      // If the HTML is already cached, use it immediately
      if (cachedHtml) {
        setHtml(cachedHtml);
        return;
      }
      // If not cached, perform the slow file read operation once
      try {
        const asset = Asset.fromModule(require("../assets/leaflet.html"));
        await asset.downloadAsync();
        const htmlContent = await FileSystem.readAsStringAsync(asset.localUri!);

        // Store the content in our cache and set the state
        cachedHtml = htmlContent;
        setHtml(htmlContent);
      } catch (e) {
        Alert.alert("HTML Load Error", (e as Error).message);
      }
    };

    initializeHtml();
  }, []);


  // hooks/useGeofence.ts - Replace the entire useEffect with location initialization

useEffect(() => {
  let subscription: Location.LocationSubscription | undefined;
  let isComponentMounted = true;

  const initializeLocation = async () => {
    try {
      // Check if location services are enabled at device level
      const locationServicesEnabled = await Location.hasServicesEnabledAsync();

      if (!locationServicesEnabled) {
        Alert.alert(
          "Location Services Disabled",
          "Location services are turned off on your device. Please enable them to use this feature.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                if (Platform.OS === "android") {
                  IntentLauncher.startActivityAsync(
                    IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
                  );
                } else {
                  Linking.openURL("app-settings:");
                }
              },
            },
          ]
        );
        return;
      }

      // Check for app permissions
      let { status } = await Location.getForegroundPermissionsAsync();

      if (status !== "granted") {
        // Request permission if not granted
        const permissionResponse = await Location.requestForegroundPermissionsAsync();
        status = permissionResponse.status;

        if (status !== "granted") {
          Alert.alert(
            "Permission Denied",
            "Location permission is required for attendance tracking. Please grant permission in your device settings.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Open Settings",
                onPress: () => {
                  if (Platform.OS === "android") {
                    Linking.openSettings();
                  } else {
                    Linking.openURL("app-settings:");
                  }
                },
              },
            ]
          );
          return;
        }
      }

      // Try to get current position with platform-specific accuracy
      try {
        const locationOptions = {
          accuracy: Platform.OS === 'android' 
            ? Location.Accuracy.Balanced 
            : Location.Accuracy.High,
        };

        const { coords } = await Location.getCurrentPositionAsync(locationOptions);

        const initialPosition = {
          lat: coords.latitude,
          lng: coords.longitude,
        };

        if (isComponentMounted) {
          setUserPos(initialPosition);
          setInitialPos(initialPosition);
          const detectedLocation = checkGeofencesRef.current(initialPosition);
          setCurrentLocation(detectedLocation);
          setIsInitialized(true);
          updateAttendanceLocationRef.current(initialPosition, detectedLocation);
        }
      } catch (locationError) {
        console.error("Error getting location:", locationError);

        // Android-specific: Try with lower accuracy as fallback
        if (Platform.OS === 'android') {
          try {
            const { coords } = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });

            const fallbackPosition = {
              lat: coords.latitude,
              lng: coords.longitude,
            };

            if (isComponentMounted) {
              setUserPos(fallbackPosition);
              setInitialPos(fallbackPosition);
              const detectedLocation = checkGeofencesRef.current(fallbackPosition);
              setCurrentLocation(detectedLocation);
              setIsInitialized(true);
              updateAttendanceLocationRef.current(fallbackPosition, detectedLocation);
            }
            return;
          } catch (androidFallbackError) {
            console.error("Android fallback location failed:", androidFallbackError);
          }
        }

        // Try with last known location as final fallback
        try {
          const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: 60000, // Accept location from last 60 seconds
            requiredAccuracy: 1000, // Accept within 1000 meters accuracy
          });
          
          if (lastKnown && isComponentMounted) {
            const fallbackPosition = {
              lat: lastKnown.coords.latitude,
              lng: lastKnown.coords.longitude,
            };

            setUserPos(fallbackPosition);
            setInitialPos(fallbackPosition);
            const detectedLocation = checkGeofencesRef.current(fallbackPosition);
            setCurrentLocation(detectedLocation);
            setIsInitialized(true);
            updateAttendanceLocationRef.current(fallbackPosition, detectedLocation);

            Alert.alert(
              "Using Last Known Location",
              "Unable to get current location. Using last known location. Please ensure you have good GPS signal."
            );
          } else {
            throw new Error("No location available");
          }
        } catch (fallbackError) {
          Alert.alert(
            "Location Error",
            "Unable to determine your location. Please ensure:\n\n" +
              "1. Location services are enabled\n" +
              "2. GPS/Location is turned on\n" +
              "3. You have good GPS signal\n" +
              "4. App has location permission",
            [
              { text: "Retry", onPress: () => initializeLocation() },
              { text: "Cancel", style: "cancel" },
            ]
          );
        }
      }

      // Continue with location watching with Android-specific settings
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Platform.OS === 'android' 
            ? Location.Accuracy.Balanced 
            : Location.Accuracy.High,
          timeInterval: Platform.OS === 'android' ? 5000 : 3000, // Slower updates on Android
          distanceInterval: Platform.OS === 'android' ? 5 : 2, // Less sensitive on Android
        },
        ({ coords }) => {
          if (!isComponentMounted) return;

          const newPos: LatLng = {
            lat: coords.latitude,
            lng: coords.longitude,
          };

          const detectedLocation = checkGeofencesRef.current(newPos);
          setUserPos(newPos);
          setCurrentLocation(detectedLocation);
          updateAttendanceLocationRef.current(newPos, detectedLocation);
        }
      );
    } catch (e) {
      if (isComponentMounted) {
        console.error("Location initialization error:", e);
        Alert.alert(
          "Location Setup Failed",
          (e as Error).message || "Failed to initialize location services",
          [
            { text: "Retry", onPress: () => initializeLocation() },
            { text: "Cancel", style: "cancel" },
          ]
        );
      }
    }
  };

  initializeLocation();

  return () => {
    isComponentMounted = false;
    subscription?.remove();
  };
}, []);


  const requestPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  };

  return {
    html,
    userPos,
    initialPos,
    currentLocation,
    isInitialized,
    mapShapes,
    mapLayers,
    mapMarkers,
    mapCenter: mapCenter || initialPos,
    activeGeofenceLocations,
    requestPermission,
    captureLocationForAttendance,
    updateAttendanceLocation,
  };
}
