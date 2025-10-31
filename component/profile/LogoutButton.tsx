import { logoutButtonStyles } from '@/constants/style';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/authStore';

interface LogoutButtonProps {
  disabled?: boolean;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({ disabled = false }) => {
  const { signOut } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[logoutButtonStyles.logoutButton, disabled && logoutButtonStyles.disabled]}
      onPress={handleLogout}
      disabled={disabled}
    >
      <FontAwesome6 name="arrow-right-from-bracket" size={18} color="#000" />
      <Text style={logoutButtonStyles.logoutButtonText}>Sign Out</Text>
    </TouchableOpacity>
  );
};

