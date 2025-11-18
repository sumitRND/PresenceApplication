import { CameraType, CameraView } from "expo-camera";
import { useRef, useState } from "react";
import { Alert } from "react-native";

export function useCamera() {
  const [facing, setFacing] = useState<CameraType>("front");
  const ref = useRef<CameraView>(null);

  const takePicture = async () => {
    if (!ref.current) return null;

    try {
      const photo = await ref.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      return photo;
    } catch (error) {
      Alert.alert("Error", "Failed to take picture");
      console.error("Camera error:", error);
      return null;
    }
  };

  return {
    facing,
    setFacing,
    ref,
    takePicture,
  };
}
