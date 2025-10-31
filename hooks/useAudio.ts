import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { AudioRecording } from "../types/attendance";

export function useAudio() {
  const [audioPermission, setAudioPermission] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<AudioRecording | null>(null);
  const [shouldPlay, setShouldPlay] = useState(false);

  const audioRecorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recorderState = useAudioRecorderState(audioRecorder, 100);

  const audioPlayer = useAudioPlayer(currentRecording?.uri ?? undefined);
  const playerStatus = useAudioPlayerStatus(audioPlayer);

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert("Permission to access microphone was denied");
      } else {
        setAudioPermission(status.granted);
      }
      setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);

  useEffect(() => {
    if (playerStatus?.isLoaded) {
      setIsPlaying(playerStatus.playing || false);
      if (playerStatus.didJustFinish) {
        setIsPlaying(false);
        audioPlayer.seekTo(0);
      }
    }
  }, [playerStatus, audioPlayer]);

  useEffect(() => {
    if (shouldPlay && playerStatus?.isLoaded && !isPlaying) {
      (async () => {
        try {
          if (playerStatus.currentTime >= (playerStatus.duration || 0)) {
            await audioPlayer.seekTo(0);
          }
          await audioPlayer.play();
          setShouldPlay(false);
        } catch (error) {
          console.error("Deferred playback error:", error);
          setShouldPlay(false);
        }
      })();
    }
  }, [shouldPlay, playerStatus, isPlaying, audioPlayer]);

  const startRecording = async () => {
    if (!audioPermission) {
      Alert.alert("Error", "Microphone permission not granted");
      return;
    }
    try {
      if (isPlaying) {
        await stopAudio();
      }
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (error) {
      Alert.alert("Error", "Failed to start recording");
      console.error("Recording error:", error);
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorder.stop();
      const status = audioRecorder.getStatus();
      const uri = status.url;
      if (uri) {
        const recording = { uri, duration: (status.durationMillis || 0) / 1000 };
        setCurrentRecording(recording);
        return recording;
      }
    } catch (error) {
      Alert.alert("Error", "Failed to stop recording");
      console.error("Recording error:", error);
    }
    return null;
  };

  const playAudio = async (recording: AudioRecording) => {
    if (!recording?.uri) {
      Alert.alert("Error", "No valid recording found");
      return;
    }
    try {
      const isSameRecording = currentRecording?.uri === recording.uri;

      if (isPlaying) {
        await stopAudio();
      } else {
        if (!isSameRecording) {
          setCurrentRecording(recording);
          setShouldPlay(true);
        } else if (playerStatus?.isLoaded) {
          if (playerStatus.currentTime >= (playerStatus.duration || 0)) {
            await audioPlayer.seekTo(0);
          }
          await audioPlayer.play();
        } else {
          setShouldPlay(true);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to play audio");
      console.error("Audio playback error:", error);
      setIsPlaying(false);
    }
  };

  const stopAudio = async () => {
    try {
      if (isPlaying && playerStatus?.isLoaded) {
        await audioPlayer.pause();
        await audioPlayer.seekTo(0);
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("Stop audio error:", error);
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    return new Promise<void>((resolve) => {
      Alert.alert(
        "Delete Recording",
        "Are you sure you want to delete this audio recording?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              if (isPlaying) {
                await stopAudio();
              }
              setCurrentRecording(null);
              setIsPlaying(false);
              setShouldPlay(false);
              resolve();
            },
          },
        ]
      );
    });
  };

  const requestPermission = async () => {
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    setAudioPermission(granted);
    return granted;
  };

  return {
    audioPermission,
    recorderState,
    isPlaying,
    currentRecording,
    playerStatus,
    startRecording,
    stopRecording,
    playAudio,
    stopAudio,
    deleteRecording,
    setCurrentRecording,
    requestPermission,
  };
}