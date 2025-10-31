import { expandedMapStyles } from "@/constants/style";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React from "react";
import {
  Pressable,
  StatusBar,
  StyleSheet,
  View,
  Platform,
  SafeAreaView,
} from "react-native";

interface ExpandedMapViewProps {
  onClose: () => void;
  mapComponent: React.ReactNode;
}

export function ExpandedMapView({
  onClose,
  mapComponent,
}: ExpandedMapViewProps) {
  return (
    <SafeAreaView
      style={[
        expandedMapStyles.container,
        Platform.OS === "android" && { paddingTop: StatusBar.currentHeight },
      ]}
    >
      <StatusBar backgroundColor="transparent" translucent />

      {/* Close Button - Top Left */}
      <Pressable
        onPress={onClose}
        style={[expandedMapStyles.closeButton, styles.closeButton]}
      >
        <FontAwesome6 name="xmark" size={24} color="white" />
      </Pressable>

      {/* Map Container */}
      <View style={expandedMapStyles.mapContainer}>{mapComponent}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    zIndex: 1002,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
