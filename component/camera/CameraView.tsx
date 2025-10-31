import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import {
  CameraCapturedPicture,
  CameraView as ExpoCameraView,
} from "expo-camera";
import { Image } from "expo-image";
import { FlipType, manipulateAsync, SaveFormat } from "expo-image-manipulator";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { colors } from "@/constants/colors";
import { cameraViewStyles } from "@/constants/style";
import { CameraControls } from "./CameraControl";

interface CameraViewProps {
  camera: any;
  currentPhotoIndex: number;
  retakeMode: boolean;
  totalPhotos: number;
  onPhotoTaken: (photo: any) => void;
  onBack: () => void;
}

export function CameraView({
  camera,
  currentPhotoIndex,
  retakeMode,
  totalPhotos,
  onPhotoTaken,
  onBack,
}: CameraViewProps) {
  const [capturedPhoto, setCapturedPhoto] =
    useState<CameraCapturedPicture | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const shutterOpacity = useSharedValue(0);

  const shutterAnimatedStyle = useAnimatedStyle(() => ({
    opacity: shutterOpacity.value,
  }));

  const handleTakePicture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      const photo = await camera.takePicture();
      if (photo) {
        let processedPhoto = photo;

        // Fix mirroring issue for iOS front-facing camera
        if (Platform.OS === "ios" && camera.facing === "front") {
          const manipulatedImage = await manipulateAsync(
            photo.uri,
            [{ flip: FlipType.Horizontal }],
            { compress: 0.9, format: SaveFormat.JPEG },
          );
          processedPhoto = {
            ...photo,
            uri: manipulatedImage.uri,
            width: manipulatedImage.width,
            height: manipulatedImage.height,
          };
        }

        setCapturedPhoto(processedPhoto);
        setShowPreview(true);
      }
    } catch (error) {
      console.error("Error taking picture:", error);
    }
    setIsCapturing(false);
  };

  const handleKeep = () => {
    if (capturedPhoto) {
      onPhotoTaken(capturedPhoto);
      setCapturedPhoto(null);
      setShowPreview(false);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setShowPreview(false);
  };

  // If showing preview, render the preview screen
  if (showPreview && capturedPhoto) {
    return (
      <View style={cameraViewStyles.previewContainer}>
        {/* Preview Header */}
        <View style={cameraViewStyles.previewHeader}>
          <Text style={cameraViewStyles.previewTitle}>REVIEW YOUR PHOTO</Text>
          <Text style={cameraViewStyles.previewSubtitle}>
            Make sure your face is clearly visible
          </Text>
        </View>

        {/* Photo Display */}
        <View style={cameraViewStyles.photoDisplayContainer}>
          <Image
            source={{ uri: capturedPhoto.uri }}
            style={cameraViewStyles.photoDisplay}
            contentFit="cover"
          />

          {/* Position Badge */}
          <View style={cameraViewStyles.positionBadge}>
            <FontAwesome6
              name="user"
              size={16}
              color={colors.black}
            />
            <Text style={cameraViewStyles.positionBadgeText}>FRONT FACE</Text>
          </View>

          {/* Photo Info */}
          <View style={cameraViewStyles.photoInfo}>
            <Text style={cameraViewStyles.photoInfoText}>
              PHOTO {currentPhotoIndex + 1} OF {totalPhotos}
            </Text>
          </View>
        </View>

        {/* Timestamp */}
        <View style={cameraViewStyles.timestampContainer}>
          <Text style={cameraViewStyles.timestampText}>
            {new Date().toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={cameraViewStyles.previewActions}>
          <Pressable style={cameraViewStyles.retakeButton} onPress={handleRetake}>
            <FontAwesome6 name="camera-rotate" size={20} color={colors.black} />
            <Text style={cameraViewStyles.retakeButtonText}>RETAKE</Text>
          </Pressable>

          <Pressable style={cameraViewStyles.usePhotoButton} onPress={handleKeep}>
            <FontAwesome6 name="check" size={20} color={colors.black} />
            <Text style={cameraViewStyles.usePhotoButtonText}>USE THIS PHOTO</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Camera View
  return (
    <View style={cameraViewStyles.container}>
      {/* Camera feed */}
      <ExpoCameraView
        style={StyleSheet.absoluteFillObject}
        ref={camera.ref}
        mode="picture"
        facing={camera.facing}
        mute={false}
        responsiveOrientationWhenOrientationLocked
      />

      {/* Shutter flash overlay */}
      <Animated.View
        style={[cameraViewStyles.shutterEffect, shutterAnimatedStyle]}
        pointerEvents="none"
      />

      {/* Controls & Overlays */}
      <View style={cameraViewStyles.overlayContainer}>

        {/* Top Controls */}
        <View style={cameraViewStyles.topControls}>
          <Pressable onPress={onBack} style={cameraViewStyles.backButton}>
            <FontAwesome6 name="arrow-left" size={24} color="white" />
          </Pressable>

          <View style={cameraViewStyles.counterOverlay}>
            <Text style={cameraViewStyles.counterText}>
              {retakeMode
                ? `Retaking Photo`
                : `Front Face`}
            </Text>
          </View>

          <View style={cameraViewStyles.helpButton} />
        </View>

        {/* Face Guide */}
        <View style={cameraViewStyles.faceGuideContainer}>
          <View style={cameraViewStyles.faceGuide}>
            <View style={[cameraViewStyles.corner, cameraViewStyles.topLeft]} />
            <View style={[cameraViewStyles.corner, cameraViewStyles.topRight]} />
            <View style={[cameraViewStyles.corner, cameraViewStyles.bottomLeft]} />
            <View style={[cameraViewStyles.corner, cameraViewStyles.bottomRight]} />

            <View style={cameraViewStyles.positionIndicator}>
              <FontAwesome6
                name="user"
                size={30}
                color="rgba(255,255,255,0.5)"
              />
              <Text style={cameraViewStyles.positionText}>Face Forward</Text>
            </View>
          </View>
        </View>

        {/* Bottom shutter button */}
        <View style={cameraViewStyles.bottomControls}>
          <CameraControls onTakePicture={handleTakePicture} />
        </View>
      </View>
    </View>
  );
}