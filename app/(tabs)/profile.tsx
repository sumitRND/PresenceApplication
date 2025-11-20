import { BrutalistError, BrutalistLoading } from '@/component/ui/BrutalistLoadingAndError';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ProfileContainer } from '../../component/profile/ProfileContainer';
import { ProfileHeader } from '../../component/profile/ProfileHandler';
import { getUserProfile } from '../../services/userServices';
import { useAuthStore } from '../../store/authStore';

interface ProfileData {
  username: string;
}

export default function ProfileScreen() {
  const { employeeNumber } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = () => {
    if (employeeNumber) {
      setLoading(true);
      getUserProfile(employeeNumber).then(response => {
        if (response.success && response.data) {
          setProfile(response.data);
        }
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    if (employeeNumber) {
      fetchProfile();
    }
  }, [employeeNumber]);

  if (loading) {
    return (
      <BrutalistLoading
        text="LOADING PROFILE..."
        subtext="Please wait"
      />
    );
  }

  if (!profile) {
    return (
      <BrutalistError
        title="PROFILE NOT FOUND"
        message="Unable to load your profile data"
        onRetry={fetchProfile}
      />
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ProfileHeader username={profile.username} />
      <ProfileContainer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});
