import { attendanceAudioRecorderStyles } from "@/constants/style";
import { useAudio } from "@/hooks/useAudio";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View, ViewStyle } from "react-native";
import Animated, {
  ZoomIn
} from "react-native-reanimated";
import { AudioRecording } from "../../types/attendance";

interface AudioRecorderProps {
  onBack: () => void;
  onRecordingComplete: (recording: AudioRecording) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const MAX_WAVEFORM_WIDTH = screenWidth - 60;
const WAVEFORM_BAR_WIDTH = 3;
const WAVEFORM_GAP = 3;
const WAVEFORM_ITEM_WIDTH = WAVEFORM_BAR_WIDTH + WAVEFORM_GAP;

export function AudioRecorder({
  onBack,
  onRecordingComplete,
}: AudioRecorderProps) {
  const audio = useAudio();
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [hasRecording, setHasRecording] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);

  const getFormattedDate = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString("default", { month: "long" });

    const getDayWithSuffix = (day: number) => {
      if (day >= 11 && day <= 13) {
        return `${day}th`;
      }
      switch (day % 10) {
        case 1:
          return `${day}st`;
        case 2:
          return `${day}nd`;
        case 3:
          return `${day}rd`;
        default:
          return `${day}th`;
      }
    };

    return `${getDayWithSuffix(day)} ${month}`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (audio.playerStatus?.isLoaded) {
      const currentTime = audio.playerStatus.currentTime ?? 0;
      const duration = audio.playerStatus.duration ?? 1;
      setPlaybackProgress(currentTime / duration);
    }
  }, [audio.playerStatus]);

  useEffect(() => {
    if (audio.recorderState.isRecording && audio.recorderState.metering !== undefined) {
      const normalized = Math.max(0, (audio.recorderState.metering + 160) / 160);
      const amplitude = normalized * 60; // Scale to similar range as before
      setWaveformData((prev) => [...prev, amplitude]);
    }
  }, [audio.recorderState]);

  useEffect(() => {
    if (audio.recorderState.isRecording) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [waveformData.length, audio.recorderState.isRecording]);

  useEffect(() => {
    let durationInterval: number | null = null;
    if (audio.recorderState.isRecording) {
      const startTime = Date.now();
      durationInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordingDuration(elapsed);
      }, 100);
    } else {
      if (durationInterval) {
        clearInterval(durationInterval);
      }
    }
    return () => {
      if (durationInterval) {
        clearInterval(durationInterval);
      }
    };
  }, [audio.recorderState.isRecording]);

  useEffect(() => {
    if (!audio.recorderState.isRecording && audio.currentRecording) {
      setHasRecording(true);
      // Do not overwrite with potentially incorrect duration from recording object
    }
  }, [audio.recorderState.isRecording, audio.currentRecording]);

  const handleStartRecording = async () => {
    try {
      setWaveformData([]);
      setHasRecording(false);
      setRecordingDuration(0);
      setPlaybackProgress(0);
      await audio.startRecording();
    } catch (error) {
      console.log("Recording start error:", error);
    }
  };

  const handleStopRecording = async () => {
    try {
      const recording = await audio.stopRecording();
      if (recording) {
        return recording;
      }
    } catch (error) {
      console.log("Recording stop error:", error);
    }
    return null;
  };

  const handlePlayRecording = async () => {
    try {
      if (audio.currentRecording) {
        await audio.playAudio(audio.currentRecording);
      }
    } catch (error) {
      console.log("Playback error:", error);
    }
  };

  const handleRetake = () => {
    setHasRecording(false);
    setWaveformData([]);
    setRecordingDuration(0);
    setPlaybackProgress(0);
    audio.setCurrentRecording(null);
  };

  const handleComplete = () => {
    if (audio.currentRecording) {
      // Use timer-based duration if recording duration is 0
      const finalDuration = audio.currentRecording.duration! > 0 ? audio.currentRecording.duration : recordingDuration;
      console.log("duration : ",audio.currentRecording.duration!)
      onRecordingComplete({ ...audio.currentRecording, duration: finalDuration });
    }
  };

  const contentContainerStyle = useMemo<ViewStyle>(() => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: waveformData.length * WAVEFORM_ITEM_WIDTH < MAX_WAVEFORM_WIDTH ? 'center' as const : 'flex-start' as const,
    paddingHorizontal: 10,
  }), [waveformData.length]);

  return (
    <View style={attendanceAudioRecorderStyles.container}>
      <View style={attendanceAudioRecorderStyles.header}>
        <Pressable onPress={onBack} style={attendanceAudioRecorderStyles.backButton}>
          <FontAwesome6 name="arrow-left" size={24} color="black" />
        </Pressable>
        <Text style={attendanceAudioRecorderStyles.title}>Record Audio</Text>
      </View>

      <View style={attendanceAudioRecorderStyles.content}>
        <View style={attendanceAudioRecorderStyles.datePrompt}>
          <Text style={attendanceAudioRecorderStyles.dateText}>
            Read the Text: &quot;Today is {getFormattedDate()}&quot;
          </Text>
        </View>

        <View style={attendanceAudioRecorderStyles.waveformContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={contentContainerStyle}
          >
            <View style={attendanceAudioRecorderStyles.waveform}>
              {waveformData.map((amplitude, index) => (
                <Animated.View
                  key={index}
                  entering={ZoomIn}
                  style={{
                    height: Math.max(amplitude, 4),
                    width: 3,
                    borderRadius: 2,
                    backgroundColor: audio.recorderState.isRecording
                      ? "#FF3B30"
                      : audio.isPlaying
                      ? "#007AFF"
                      : hasRecording
                      ? "#000"
                      : "#ccc",
                    opacity: audio.isPlaying
                      ? (index / waveformData.length < playbackProgress ? 1 : 0.3)
                      : 1,
                  }}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={attendanceAudioRecorderStyles.durationContainer}>
          <Text style={attendanceAudioRecorderStyles.durationText}>
            {audio.isPlaying
              ? formatTime(playbackProgress * recordingDuration)
              : "0:00"}
          </Text>
          <Text style={attendanceAudioRecorderStyles.durationText}>
            {formatTime(recordingDuration)}
          </Text>
        </View>

        <View style={attendanceAudioRecorderStyles.statusIndicator}>
          {audio.recorderState.isRecording && (
            <Animated.View style={attendanceAudioRecorderStyles.recordingDot} />
          )}
          <Text style={attendanceAudioRecorderStyles.statusText}>
            {audio.recorderState.isRecording
              ? `Recording...`
              : hasRecording
              ? "Recording Complete"
              : "Tap to Record"}
          </Text>
        </View>
      </View>

      <View style={attendanceAudioRecorderStyles.controlsContainer}>
        {!hasRecording ? (
          <Pressable
            onPress={
              audio.recorderState.isRecording
                ? handleStopRecording
                : handleStartRecording
            }
            style={[
              attendanceAudioRecorderStyles.controlButtonBase,
              audio.recorderState.isRecording
                ? attendanceAudioRecorderStyles.stopButton
                : attendanceAudioRecorderStyles.recordButton,
            ]}
          >
            <FontAwesome6
              name={audio.recorderState.isRecording ? "stop" : "microphone"}
              size={24}
              color="white"
            />
          </Pressable>
        ) : (
          <View style={attendanceAudioRecorderStyles.playbackControls}>
            <Pressable
              onPress={handleRetake}
              style={[
                attendanceAudioRecorderStyles.controlButtonBase,
                attendanceAudioRecorderStyles.retakeButton,
              ]}
            >
              <FontAwesome6 name="arrow-rotate-left" size={24} color="black" />
            </Pressable>
            <Pressable
              onPress={handlePlayRecording}
              style={[
                attendanceAudioRecorderStyles.controlButtonBase,
                attendanceAudioRecorderStyles.playPauseButton,
              ]}
            >
              <FontAwesome6
                name={audio.isPlaying ? "pause" : "play"}
                size={24}
                color="black"
              />
            </Pressable>
            <Pressable
              onPress={handleComplete}
              style={[
                attendanceAudioRecorderStyles.controlButtonBase,
                attendanceAudioRecorderStyles.completeButton,
              ]}
            >
              <FontAwesome6 name="check" size={24} color="white" />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}