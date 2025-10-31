import { profileFieldProfileStyles } from "@/constants/style";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React from "react";
import { Text, View } from "react-native";

interface ProfileFieldProps {
  label: string;
  value: string;
  isReadOnly?: boolean;
  icon?: string;
}

export const ProfileField: React.FC<ProfileFieldProps> = ({
  label,
  value,
  isReadOnly = true,
  icon,
}) => {
  return (
    <View style={profileFieldProfileStyles.fieldContainer}>
      <Text style={profileFieldProfileStyles.label}>{label}</Text>
      <View style={profileFieldProfileStyles.input}>
        <View style={profileFieldProfileStyles.inputContent}>
          {icon && (
            <FontAwesome6
              name={icon}
              size={18}
              color="black"
              style={profileFieldProfileStyles.icon}
            />
          )}
          <Text style={profileFieldProfileStyles.text}>{value}</Text>
        </View>
      </View>
    </View>
  );
};

