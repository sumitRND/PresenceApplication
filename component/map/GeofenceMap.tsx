import { IIT_GUWAHATI_LOCATION } from "@/constants/geofenceLocation";
import { mapStyles } from "@/constants/style";
import { LatLng, MapLayer, MapMarker, MapShape } from "@/types/geofence";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { LeafletView } from "react-native-leaflet-view";

interface GeofenceMapProps {
  html: string | null;
  userPos: LatLng | null;
  initialPos: LatLng | null;
  isInitialized: boolean;
  mapShapes: MapShape[];
  mapLayers: MapLayer[];
  mapMarkers: MapMarker[];
  mapCenter: LatLng | null;
}

export const GeofenceMap = React.memo(function GeofenceMap({
  html,
  userPos,
  initialPos,
  isInitialized,
  mapShapes,
  mapLayers,
  mapMarkers,
  mapCenter,
}: GeofenceMapProps) {
  const [centerToUse, setCenterToUse] = useState<LatLng>(userPos ?? IIT_GUWAHATI_LOCATION.center);
  const [recenterKey, setRecenterKey] = useState(0);
  const [following, setFollowing] = useState(true);

  useEffect(() => {
    if (following && userPos) {
      setCenterToUse(userPos);
      setRecenterKey(Date.now());
    }
  }, [userPos, following]);

  if (!html || !userPos || !initialPos || !isInitialized) {
    return (
      <View style={mapStyles.loadingContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={mapStyles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  const handleRecenter = () => {
    setCenterToUse(userPos);
    setRecenterKey(Date.now());
    setFollowing(true);
  };

  const handleMessageReceived = (message: any) => {
    if (message.msgType === "ON_MOVE_START") {
      setFollowing(false);
    }
  };

  // ✅ Updated location resolution for field trips
  const position = userPos;
  const iit = IIT_GUWAHATI_LOCATION;
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(iit.center.lat - position.lat);
  const dLng = toRad(iit.center.lng - position.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(position.lat)) *
      Math.cos(toRad(iit.center.lat)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const insideIIT = R * c <= iit.radius;

  const effectiveZoom = insideIIT ? 13.5 : 15;

  const mapKey = `${centerToUse.lat}-${centerToUse.lng}-${mapShapes.length}-${recenterKey}`;

  return (
    <View style={mapStyles.container}>
      <LeafletView
        key={mapKey}
        source={{ html }}
        mapCenterPosition={centerToUse}
        zoom={effectiveZoom}
        mapLayers={mapLayers}
        mapShapes={mapShapes}
        mapMarkers={mapMarkers}
        doDebug={false}
        onMessageReceived={handleMessageReceived}
      />
      <Pressable
        onPress={handleRecenter}
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          padding: 12,
          borderRadius: 50,
          elevation: 4,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        }}
      >
        <FontAwesome6 name="location-crosshairs" size={24} color="white" />
      </Pressable>
    </View>
  );
});