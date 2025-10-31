import {
  AvatarData,
  getUserAvatar,
  saveUserAvatar,
} from "@/services/avatarStorageService";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import {
  ProfileData as BaseProfileData,
  getUserProfileByEmployeeNumber,
} from "../services/profileService";
import { useAuthStore } from "../store/authStore";


export type ProfileDataWithAvatar = BaseProfileData & {
  avatar?: AvatarData | null;
};

export const useProfile = () => {
  const { userName } = useAuthStore();
  const [profile, setProfile] = useState<ProfileDataWithAvatar | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  
  const fetchProfile = useCallback(async () => {
    const { employeeNumber } = useAuthStore.getState(); 
    if (!employeeNumber) return;

    try {
      setLoading(true);

      const response = await getUserProfileByEmployeeNumber(employeeNumber); 

      if (response.success && response.data) {
        const avatar = await getUserAvatar(response.data.employeeNumber);
        setProfile({
          ...response.data,
          avatar,
        });
      } else {
        Alert.alert("Error", response.error || "Failed to fetch profile");
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
      Alert.alert("Error", "Failed to fetch profile data");
    } finally {
      setLoading(false);
    }
  }, []); 

  
  useEffect(() => {
    const { employeeNumber } = useAuthStore.getState();
    if (employeeNumber) {
      fetchProfile();
    }
  }, []); 

  const updateAvatar = async (avatarData: AvatarData) => {
    if (!profile?.employeeNumber) return false;

    try {
      setUpdating(true);
      const success = await saveUserAvatar(profile.employeeNumber, avatarData);

      if (success) {
        setProfile((prev) => (prev ? { ...prev, avatar: avatarData } : null));
        Alert.alert("Success", "Profile picture updated successfully");
        return true;
      } else {
        Alert.alert("Error", "Failed to update profile picture");
        return false;
      }
    } catch (error) {
      console.error("Avatar update error:", error);
      Alert.alert("Error", "Failed to update profile picture");
      return false;
    } finally {
      setUpdating(false);
    }
  };

  return {
    profile,
    loading,
    updating,
    fetchProfile,
    updateAvatar,
    userName,
  };
};
