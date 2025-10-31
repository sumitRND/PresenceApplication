import { uiButtonStyles } from "@/constants/style";
import React from "react";
import { Pressable, Text } from "react-native";
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
}: ButtonProps) {
  const buttonStyle = variant === "primary" ? uiButtonStyles.primary : uiButtonStyles.secondary;
  const textStyle =
    variant === "primary" ? uiButtonStyles.primaryText : uiButtonStyles.secondaryText;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[buttonStyle, { opacity: disabled ? 0.5 : 1 }]}
    >
      <Text style={textStyle}>{title}</Text>
    </Pressable>
  );
}

