import { colors } from "@/constants/colors";
import { actionButtonStyles } from "@/constants/style";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { CameraCapturedPicture } from "expo-camera";
import React from "react";
import { Alert, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { AudioRecording } from "../../types/attendance";

interface ActionButtonsProps {
  photos: CameraCapturedPicture[];
  audioRecording: AudioRecording | null;
  onTakePhotos: () => void;
  onRetakeAll: () => void;
  onUpload: () => void;
  uploading: boolean;
  totalPhotos: number;
  canSubmit: boolean;
  validationReason?: string;
  onScrollToTop?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ActionButtons({
  photos,
  audioRecording,
  onRetakeAll,
  onUpload,
  uploading,
  totalPhotos,
  canSubmit,
  validationReason,
  onScrollToTop,
}: ActionButtonsProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handleUploadPress = () => {
    if (!canSubmit) {
      // Show alert with validation error
      Alert.alert(
        "Cannot Mark Attendance",
        validationReason || "Please check your location and ensure you're within the required area during working hours.",
        [
          {
            text: "View Details",
            onPress: () => {
              if (onScrollToTop) {
                onScrollToTop();
              }
            },
          },
          {
            text: "OK",
            style: "cancel",
          },
        ]
      );
      return;
    }
    onUpload();
  };

  const isComplete = photos.length === totalPhotos && audioRecording !== null;

  return (
    <View style={actionButtonStyles.container}>
      {photos.length > 0 && (
        <View style={actionButtonStyles.buttonGroup}>
          <AnimatedPressable
            onPress={handleUploadPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[
              actionButtonStyles.primaryButton,
              animatedStyle,
              uploading && actionButtonStyles.buttonDisabled,
            ]}
            disabled={uploading}
          >
            <View
              style={[
                actionButtonStyles.brutalistButton,
                canSubmit && !uploading
                  ? actionButtonStyles.successButton
                  : actionButtonStyles.disabledButton,
              ]}
            >
              <FontAwesome6
                name={uploading ? "spinner" : "cloud-arrow-up"}
                size={20}
                color={colors.white}
              />
              <Text style={actionButtonStyles.brutalistButtonText}>
                {uploading ? "Uploading..." : "Submit Attendance"}
              </Text>
            </View>
          </AnimatedPressable>

          <Pressable
            onPress={onRetakeAll}
            style={actionButtonStyles.secondaryButton}
            disabled={uploading}
          >
            <FontAwesome6
              name="arrow-rotate-left"
              size={18}
              color={colors.black}
            />
            <Text style={actionButtonStyles.secondaryButtonText}>Retake</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}