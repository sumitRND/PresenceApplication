import { colors } from "@/constants/colors";
import { actionButtonStyles } from "@/constants/style";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { CameraCapturedPicture } from "expo-camera";
import React from "react";
import { Pressable, Text, View } from "react-native";
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

  const isComplete = photos.length === totalPhotos && audioRecording !== null;
  const isButtonDisabled = !isComplete || uploading || !canSubmit;

  return (
    <View style={actionButtonStyles.container}>
      {photos.length > 0 && (
        <View style={actionButtonStyles.buttonGroup}>
          <AnimatedPressable
            onPress={onUpload}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[
              actionButtonStyles.primaryButton,
              animatedStyle,
              isButtonDisabled && actionButtonStyles.buttonDisabled,
            ]}
            disabled={isButtonDisabled}
          >
            <View
              style={[
                actionButtonStyles.brutalistButton,
                !isButtonDisabled
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
