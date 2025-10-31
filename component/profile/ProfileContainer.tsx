import { profileContainerStyles } from '@/constants/style';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useProfile } from '../../hooks/useProfile';
import { useAuthStore } from '../../store/authStore';
import { AttendanceCalendar } from './AttendanceCalendar';
import { AvatarDisplay } from './AvatarDisplay';
import { AvatarPicker } from './AvatarPicker';
import { LogoutButton } from './LogoutButton';
import { ProfileField } from './ProfileFieldProfile';

export const ProfileContainer: React.FC = () => {
  const { profile, updating, updateAvatar } = useProfile();
  const { projects } = useAuthStore();
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const handleAvatarSelect = async (avatarData: {
    style: string;
    seed: string;
    url: string;
  }) => {
    await updateAvatar(avatarData);
  };

  if (!profile) {
    return null;
  }

  // Get department from projects
  const department = projects.length > 0 ? projects[0].department : 'Not Assigned';
  console.log("department",department)

  return (
    <ScrollView style={profileContainerStyles.container} showsVerticalScrollIndicator={false}>
      <View style={profileContainerStyles.content}>
        {/* Profile Avatar Section */}
        <View style={profileContainerStyles.avatarSection}>
          <TouchableOpacity
            style={profileContainerStyles.avatarContainer}
            onPress={() => setShowAvatarPicker(true)}
            disabled={updating}
          >
            {profile.avatar ? (
              <AvatarDisplay avatarUrl={profile.avatar.url} size={100} />
            ) : (
              <View style={profileContainerStyles.avatar}>
                <Text style={profileContainerStyles.avatarText}>
                  {profile.username.substring(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={profileContainerStyles.editOverlay}>
              <FontAwesome6 name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={profileContainerStyles.text}>
            <Text style={profileContainerStyles.usernameText}>{profile.username}</Text>
          </View>
        </View>

        {/* Attendance Calendar Toggle */}
        <TouchableOpacity 
          style={profileContainerStyles.attendanceCard}
          onPress={() => setShowCalendar(!showCalendar)}
          activeOpacity={0.8}
        >
          <View style={profileContainerStyles.attendanceCardHeader}>
            <View style={profileContainerStyles.attendanceCardLeft}>
              <FontAwesome6 name="calendar-days" size={20} color="#000" />
              <View style={profileContainerStyles.attendanceCardTextContainer}>
                <Text style={profileContainerStyles.attendanceCardTitle}>ATTENDANCE TRACKER</Text>
                <Text style={profileContainerStyles.attendanceCardSubtitle}>
                  Tap to {showCalendar ? 'HIDE' : 'VIEW'} your attendance history
                </Text>
              </View>
            </View>
            <FontAwesome6 
              name={showCalendar ? "chevron-up" : "chevron-down"} 
              size={14} 
              color="#000" 
            />
          </View>
        </TouchableOpacity>

        {/* Attendance Calendar Section */}
        {showCalendar && (
          <View style={profileContainerStyles.calendarSection}>
            <AttendanceCalendar employeeCode={profile.employeeNumber} />
          </View>
        )}

        {/* Profile Fields Card */}
        <View style={profileContainerStyles.card}>
          <Text style={profileContainerStyles.cardTitle}>PERSONAL INFORMATION</Text>
          
          <ProfileField 
            label="USERNAME" 
            value={profile.username} 
            isReadOnly 
            icon="user"
          />
          
          <ProfileField 
            label="EMPLOYEE NUMBER" 
            value={profile.employeeNumber} 
            isReadOnly 
            icon="id-card"
          />

          <ProfileField 
            label="EMPLOYEE CLASS" 
            value={profile.empClass || 'PJ'} 
            isReadOnly 
            icon="briefcase"
          />

          <ProfileField 
            label="DEPARTMENT" 
            value={department} 
            isReadOnly 
            icon="building"
          />

          {/* Show Projects */}
          {projects.length > 0 && (
            <View style={profileContainerStyles.projectsSection}>
              <Text style={profileContainerStyles.projectsLabel}>PROJECT ID</Text>
              {projects.map((project, index) => (
                <View key={index} style={profileContainerStyles.projectItem}>
                  <FontAwesome6 name="folder" size={12} color="#000" />
                  <Text style={profileContainerStyles.projectText}>{project.projectCode}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        
        <LogoutButton disabled={updating} />

        {/* Avatar Picker Modal */}
        <AvatarPicker
          visible={showAvatarPicker}
          onClose={() => setShowAvatarPicker(false)}
          onSelect={handleAvatarSelect}
          currentAvatar={
            profile.avatar && profile.avatar.style && profile.avatar.seed
              ? { style: profile.avatar.style, seed: profile.avatar.seed }
              : undefined
          }
        />
      </View>
    </ScrollView>
  );
};

