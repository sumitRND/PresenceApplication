import { profileHandlerStyles } from "@/constants/style";
import React from "react";
import { Text, View } from "react-native";

interface ProfileHeaderProps {
  username?: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ username }) => {
  return (
    <View style={profileHandlerStyles.header}>
      <View style={profileHandlerStyles.headerContent}>
        {/* Title */}
        <Text style={profileHandlerStyles.headerTitle}>Profile</Text>

        {/* Subtitle */}
        <Text style={profileHandlerStyles.headerSubtitle}>
          Manage your account
        </Text>
      </View>
    </View>
  );
};

