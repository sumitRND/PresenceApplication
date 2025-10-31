import { audioStyles } from "@/constants/style";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React from "react";
import { Text, View } from "react-native";
import { useAudio } from "../../hooks/useAudio";
import { AudioRecording } from "../../types/attendance";
import { AudioControls } from "./AudioControl";

interface AudioPlayerProps {
  audioRecording: AudioRecording;
}

export function AudioPlayer({ audioRecording }: AudioPlayerProps) {
  const audio = useAudio();

  const handlePlay = () => {
    audio.playAudio(audioRecording);
  };

  const handleDelete = async () => {
    await audio.deleteRecording();
  };

  return (
    <View style={audioStyles.preview}>
      <FontAwesome6 name="volume-high" size={24} color="#000" />
      <Text style={audioStyles.previewText}>Audio Recorded</Text>
      <AudioControls
        isPlaying={audio.isPlaying}
        onPlay={handlePlay}
        onDelete={handleDelete}
      />
    </View>
  );
}