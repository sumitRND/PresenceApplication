import { attendanceAudioRecorderStyles } from "@/constants/style";
import { usePermissions } from "@/hooks/usePermissions";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { RecordingPresets, useAudioPlayer, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View, ViewStyle } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
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
  const { requestAudioPermission } = usePermissions();
  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderState = useAudioRecorderState(audioRecorder, 100);
  const audioPlayer = useAudioPlayer();
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [hasRecording, setHasRecording] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const isInitialMount = useRef(true);

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

  const handleRetake = () => {
    setHasRecording(false);
    setWaveformData([]);
    setRecordingDuration(0);
    setPlaybackProgress(0);
  };

  useEffect(() => {
    handleRetake();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (audioPlayer.playing) {
        const duration = audioPlayer.duration > 0 ? audioPlayer.duration : 1;
        setPlaybackProgress(audioPlayer.currentTime / duration);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [audioPlayer.playing, audioPlayer.currentTime, audioPlayer.duration]);

  useEffect(() => {
    if (recorderState.isRecording && recorderState.metering !== undefined) {
      const normalized = Math.max(0, (recorderState.metering + 160) / 160);
      const amplitude = normalized * 60;
      setWaveformData((prev) => [...prev, amplitude]);
    }
  }, [recorderState]);

  useEffect(() => {
    if (recorderState.isRecording) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [waveformData.length, recorderState.isRecording]);

  useEffect(() => {
    let durationInterval: number | null = null;
    if (recorderState.isRecording) {
      const startTime = Date.now();
      durationInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordingDuration(elapsed);
      }, 100);
    }
    return () => {
      if (durationInterval) {
        clearInterval(durationInterval);
      }
    };
  }, [recorderState.isRecording]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      if (!recorderState.isRecording && audioRecorder.uri) {
        setHasRecording(true);
      }
    }
  }, [recorderState.isRecording, audioRecorder.uri]);

  const handleStartRecording = async () => {
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) return;

    try {
      handleRetake();
      await audioRecorder.prepareToRecordAsync();
      await audioRecorder.record();
    } catch (error) {
      console.log("Recording start error:", error);
    }
  };

  const handleStopRecording = async () => {
    try {
      await audioRecorder.stop();
    } catch (error) {
      console.log("Recording stop error:", error);
    }
  };

  const handlePlayRecording = async () => {
    try {
      if (audioRecorder.uri) {
        await audioPlayer.replace(audioRecorder.uri);
        await audioPlayer.play();
      }
    } catch (error) {
      console.log("Playback error:", error);
    }
  };

  const handleComplete = () => {
    if (audioRecorder.uri) {
      onRecordingComplete({
        uri: audioRecorder.uri,
        duration: recordingDuration,
      });
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
                    backgroundColor: recorderState.isRecording
                      ? "#FF3B30"
                      : audioPlayer.playing
                      ? "#007AFF"
                      : hasRecording
                      ? "#000"
                      : "#ccc",
                    opacity: audioPlayer.playing
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
            {audioPlayer.playing
              ? formatTime(playbackProgress * recordingDuration)
              : "0:00"}
          </Text>
          <Text style={attendanceAudioRecorderStyles.durationText}>
            {formatTime(recordingDuration)}
          </Text>
        </View>

        <View style={attendanceAudioRecorderStyles.statusIndicator}>
          {recorderState.isRecording && (
            <Animated.View style={attendanceAudioRecorderStyles.recordingDot} />
          )}
          <Text style={attendanceAudioRecorderStyles.statusText}>
            {recorderState.isRecording
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
              recorderState.isRecording
                ? handleStopRecording
                : handleStartRecording
            }
            style={[
              attendanceAudioRecorderStyles.controlButtonBase,
              recorderState.isRecording
                ? attendanceAudioRecorderStyles.stopButton
                : attendanceAudioRecorderStyles.recordButton,
            ]}
          >
            <FontAwesome6
              name={recorderState.isRecording ? "stop" : "microphone"}
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
                name={audioPlayer.playing ? "pause" : "play"}
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