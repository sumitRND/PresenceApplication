import { audioSectionStyles } from "@/constants/style";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AudioRecording } from "../../types/attendance";
import { AudioPlayer } from "../audio/AudioPlayer";

interface AudioSectionProps {
  audioRecording: AudioRecording | null;
  onRecordAudio: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AudioSection({
  audioRecording,
  onRecordAudio,
}: AudioSectionProps) {
  const pulseScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  React.useEffect(() => {
    if (!audioRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000 }),
          withTiming(1, { duration: 1000 }),
        ),
        -1,
      );
    } else {
      pulseScale.value = withTiming(1);
    }
  }, [audioRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1);
  };

  return (
    <View style={audioSectionStyles.container}>
      {audioRecording ? (
        <View style={audioSectionStyles.brutalistCard}>
          <View style={audioSectionStyles.brutalistCardHeader}>
            <View style={audioSectionStyles.brutalistCardIcon}>
              <FontAwesome6 name="circle-check" size={24} color="#fff" />
            </View>
            <Text style={audioSectionStyles.brutalistCardAlert}>Audio Recorded</Text>
          </View>
          <View style={audioSectionStyles.brutalistCardMessage}>
            <AudioPlayer audioRecording={audioRecording} />
          </View>
        </View>
      ) : (
        <AnimatedPressable
          onPress={onRecordAudio}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[audioSectionStyles.brutalistCard, buttonStyle]}
        >
          <View style={audioSectionStyles.brutalistCardHeader}>
            <Animated.View style={[audioSectionStyles.brutalistCardIcon, pulseStyle]}>
              <FontAwesome6 name="microphone" size={24} color="#fff" />
            </Animated.View>
            <Text style={audioSectionStyles.brutalistCardAlert}>Record Audio</Text>
          </View>
          <View style={audioSectionStyles.brutalistCardMessage}>
            <Text style={audioSectionStyles.recordButtonText}>Tap to Record</Text>
            <Text style={audioSectionStyles.recordHintText}>
              Say today&apos;s date clearly
            </Text>
          </View>
        </AnimatedPressable>
      )}
    </View>
  );
}

