import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraCapturedPicture } from 'expo-camera';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import api from '../services/api';
import { validationService } from '../services/attendanceValidationService';
import { AudioRecording, ViewMode } from '../types/attendance';

interface AttendanceRecord {
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  sessionType: 'FORENOON' | 'AFTERNOON';
  attendanceType?: 'FULL_DAY' | 'HALF_DAY';
  isCheckedOut: boolean;
  takenLocation: string;
  latitude?: number;
  longitude?: number;
}

interface AttendanceState {
  photos: CameraCapturedPicture[];
  audioRecording: AudioRecording | null;
  currentView: ViewMode;
  currentPhotoIndex: number;
  retakeMode: boolean;
  uploading: boolean;
  userLocationType: 'CAMPUS' | 'FIELDTRIP' | null;
  isFieldTrip: boolean;
  fieldTripDates: { startDate: string; endDate: string }[];
  attendanceRecords: AttendanceRecord[];
  todayAttendanceMarked: boolean;
  userId: string | null;
  employeeNumber: string | null;
  department: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  initializeWithUser: (employeeNumber: string, username: string, department: string | null) => void;
  clearUser: () => void;
  setPhotos: (photos: CameraCapturedPicture[]) => void;
  setAudioRecording: (recording: AudioRecording | null) => void;
  setCurrentView: (view: ViewMode) => void;
  setCurrentPhotoIndex: (index: number) => void;
  setRetakeMode: (mode: boolean) => void;
  setUploading: (uploading: boolean) => void;
  resetSession: () => void;
  markAttendance: (location: string, latitude?: number, longitude?: number) => Promise<void>;
  checkoutAttendance: () => Promise<boolean>;
  fetchTodayAttendance: () => Promise<void>;
  fetchLocationSettings: () => Promise<void>;
  getCurrentSession: () => 'FORENOON' | 'AFTERNOON' | 'OUTSIDE';
  getTodayRecord: () => AttendanceRecord | undefined;
  canMarkAttendance: () => boolean;
}

let statusUpdateTimer: ReturnType<typeof setInterval> | null = null;

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set, get) => ({
      photos: [],
      audioRecording: null,
      currentView: 'home',
      currentPhotoIndex: 0,
      retakeMode: false,
      uploading: false,
      userLocationType: null,
      isFieldTrip: false,
      fieldTripDates: [],
      attendanceRecords: [],
      todayAttendanceMarked: false,
      userId: null,
      employeeNumber: null,
      department: null,
      isLoading: false,
      isInitialized: false,

      initializeWithUser: (employeeNumber, username, department) => {
        set({
          employeeNumber,
          userId: username,
          department,
          isInitialized: true,
        });

        get().fetchLocationSettings();
        get().fetchTodayAttendance();

        if (statusUpdateTimer) {
          clearInterval(statusUpdateTimer);
        }
        statusUpdateTimer = setInterval(() => {
          get().fetchTodayAttendance();
        }, 60000);
      },

      clearUser: () => {
        if (statusUpdateTimer) {
          clearInterval(statusUpdateTimer);
          statusUpdateTimer = null;
        }

        set({
          photos: [],
          audioRecording: null,
          currentView: 'home',
          currentPhotoIndex: 0,
          retakeMode: false,
          uploading: false,
          attendanceRecords: [],
          todayAttendanceMarked: false,
          userId: null,
          employeeNumber: null,
          department: null,
          isInitialized: false,
        });
      },

      setPhotos: (photos) => set({ photos }),
      setAudioRecording: (recording) => set({ audioRecording: recording }),
      setCurrentView: (view) => set({ currentView: view }),
      setCurrentPhotoIndex: (index) => set({ currentPhotoIndex: index }),
      setRetakeMode: (mode) => set({ retakeMode: mode }),
      setUploading: (uploading) => set({ uploading }),

      resetSession: () => {
        set({
          photos: [],
          audioRecording: null,
          currentView: 'home',
          currentPhotoIndex: 0,
          retakeMode: false,
          uploading: false,
        });
      },

      markAttendance: async (location, latitude, longitude) => {
        const state = get();

        if (!state.employeeNumber) {
          throw new Error('Not logged in');
        }

        set({ uploading: true });

        try {
          const formData = new FormData();
          formData.append('employeeNumber', state.employeeNumber);
          formData.append('username', state.userId || '');
          formData.append('location', location);
          formData.append('locationType', state.userLocationType || 'CAMPUS');

          if (latitude) formData.append('latitude', latitude.toString());
          if (longitude) formData.append('longitude', longitude.toString());

          if (state.photos.length > 0) {
            const photo = {
              uri: state.photos[0].uri,
              type: 'image/jpeg',
              name: `photo_${Date.now()}.jpg`,
            };
            formData.append('photo', photo as any);
          }

          if (state.audioRecording?.uri) {
            const audio = {
              uri: state.audioRecording.uri,
              type: 'audio/m4a',
              name: `audio_${Date.now()}.m4a`,
            };
            formData.append('audio', audio as any);

            if (state.audioRecording.duration) {
              formData.append('audioDuration', state.audioRecording.duration.toString());
            }
          }

          const response = await api.post('/attendance', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          if (response.data.success) {
            const today = new Date().toISOString().split('T')[0];
            const sessionType = state.getCurrentSession();

            const newRecord: AttendanceRecord = {
              date: today,
              checkInTime: new Date().toISOString(),
              sessionType: sessionType === 'OUTSIDE' ? 'FORENOON' : sessionType,
              isCheckedOut: false,
              takenLocation: location,
              latitude,
              longitude,
            };

            set({
              attendanceRecords: [
                ...state.attendanceRecords.filter(r => r.date !== today),
                newRecord,
              ],
              todayAttendanceMarked: true,
            });

            state.resetSession();

            setTimeout(() => {
              state.fetchTodayAttendance();
            }, 1000);
          }
        } finally {
          set({ uploading: false });
        }
      },

      checkoutAttendance: async () => {
        const state = get();

        if (!state.employeeNumber) {
          return false;
        }

        try {
          const response = await api.post('/attendance/checkout', {
            employeeNumber: state.employeeNumber,
          });

          if (response.data.success) {
            await state.fetchTodayAttendance();
            return true;
          }

          return false;
        } catch (error) {
          console.error('Checkout error:', error);
          return false;
        }
      },

      fetchTodayAttendance: async () => {
        const state = get();

        if (!state.employeeNumber) {
          return;
        }

        try {
          const response = await api.get(`/attendance/today/${state.employeeNumber}`);
          const today = new Date().toISOString().split('T')[0];

          if (response.data.success && response.data.data) {
            const attendance = response.data.data;

            const record: AttendanceRecord = {
              date: today,
              checkInTime: attendance.checkinTime,
              checkOutTime: attendance.checkoutTime,
              sessionType: attendance.sessionType === 'FN' ? 'FORENOON' : 'AFTERNOON',
              attendanceType: attendance.attendanceType,
              isCheckedOut: !!attendance.checkoutTime,
              takenLocation: attendance.takenLocation || 'Unknown',
              latitude: attendance.latitude,
              longitude: attendance.longitude,
            };

            set({
              attendanceRecords: [
                ...state.attendanceRecords.filter(r => r.date !== today),
                record,
              ],
              todayAttendanceMarked: true,
            });
          } else {
            set({
              attendanceRecords: state.attendanceRecords.filter(r => r.date !== today),
              todayAttendanceMarked: false,
            });
          }
        } catch (error) {
          console.error('Error fetching today attendance:', error);
        }
      },

      fetchLocationSettings: async () => {
        const state = get();

        if (!state.employeeNumber) {
          return;
        }

        try {
          const response = await api.get(`/user-field-trips/employee/${state.employeeNumber}`);

          if (response.data.success && response.data.data) {
            const data = response.data.data;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const isOnTrip = data.fieldTrips?.some((trip: any) => {
              const start = new Date(trip.startDate);
              const end = new Date(trip.endDate);
              start.setHours(0, 0, 0, 0);
              end.setHours(23, 59, 59, 999);
              return today >= start && today <= end && trip.isActive;
            }) || false;

            set({
              userLocationType: isOnTrip ? 'FIELDTRIP' : 'CAMPUS',
              isFieldTrip: isOnTrip,
              fieldTripDates: data.fieldTrips || [],
            });
          } else {
            set({
              userLocationType: 'CAMPUS',
              isFieldTrip: false,
              fieldTripDates: [],
            });
          }
        } catch (error) {
          console.error('Error fetching location settings:', error);
          set({
            userLocationType: 'CAMPUS',
            isFieldTrip: false,
            fieldTripDates: [],
          });
        }
      },

      getCurrentSession: () => {
        return validationService.getCurrentSession();
      },

      getTodayRecord: () => {
        const today = new Date().toISOString().split('T')[0];
        return get().attendanceRecords.find(r => r.date === today);
      },

      canMarkAttendance: () => {
        const state = get();

        if (state.todayAttendanceMarked) {
          return false;
        }

        return validationService.isWithinWorkingHours();
      },
    }),
    {
      name: 'attendance-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userLocationType: state.userLocationType,
        isFieldTrip: state.isFieldTrip,
        fieldTripDates: state.fieldTripDates,
        attendanceRecords: state.attendanceRecords,
        todayAttendanceMarked: state.todayAttendanceMarked,
      }),
    }
  )
);
