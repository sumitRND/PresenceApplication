import { brutalistColors } from "@/constants/colors";
import { attendancePhotoGridStyles } from "@/constants/style";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { CameraCapturedPicture } from "expo-camera";
import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

interface PhotoGridProps {
  photos: CameraCapturedPicture[];
  onRetakePhoto: (index: number) => void;
  onTakePhoto: () => void;
  totalPhotos: number;
}


export function PhotoGrid({ photos, onRetakePhoto, onTakePhoto }: PhotoGridProps) {
  return (
    <View style={attendancePhotoGridStyles.container}>
      <Animated.View entering={ZoomIn} style={attendancePhotoGridStyles.singlePhotoContainer}>
        {photos[0] ? (
          <View style={attendancePhotoGridStyles.photoWrapper}>
            <Image
              source={{ uri: photos[0].uri }}
              style={attendancePhotoGridStyles.photoPreview}
              contentFit="cover"
            />
            <Pressable
              onPress={() => onRetakePhoto(0)}
              style={({ pressed }) => [
                attendancePhotoGridStyles.retakeOverlay,
                pressed && attendancePhotoGridStyles.retakeOverlayPressed,
              ]}
            >
              <View style={attendancePhotoGridStyles.iconWrapper}>
                <FontAwesome6
                  name="arrow-rotate-left"
                  size={24}
                  color={brutalistColors.black}
                />
              </View>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={onTakePhoto} style={attendancePhotoGridStyles.emptySlot}>
            <FontAwesome6
              name="camera"
              size={36}
              color={brutalistColors.black}
            />
            <Text style={attendancePhotoGridStyles.emptyText}>TAP TO OPEN CAMERA</Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}
