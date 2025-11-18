import { AttendanceProps } from '@/types/geofence';
import { Platform } from 'react-native';
import { apiHelpers } from './api';

export interface CheckoutResponse {
  success: boolean;
  data?: {
    checkOutTime: string;
    attendanceType: 'FULL_DAY' | 'HALF_DAY';
    message: string;
  };
  error?: string;
}

export interface TodayAttendanceResponse {
  success: boolean;
  data?: {
    attendanceKey: string;
    checkInTime: string;
    checkOutTime?: string;
    sessionType: 'FORENOON' | 'AFTERNOON';
    attendanceType?: 'FULL_DAY' | 'HALF_DAY';
    isCheckedOut: boolean;
    takenLocation?: string;
    latitude?: number;
    longitude?: number;
    photos?: any[];
    audio?: any[];
  };
  error?: string;
}

interface AttendancePropsWithCoordinates extends AttendanceProps {
  latitude?: number;
  longitude?: number;
  username?: string;
}

class AttendanceService {
  private static instance: AttendanceService;
  private attendanceCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000;

  static getInstance(): AttendanceService {
    if (!this.instance) {
      this.instance = new AttendanceService();
    }
    return this.instance;
  }

  async uploadAttendance({
    employeeNumber,
    photos,
    audioRecording,
    location,
    latitude,
    longitude,
    username,
  }: AttendancePropsWithCoordinates) {
    try {
      if (!employeeNumber) {
        return { success: false, error: 'User not logged in' };
      }

      const formData = new FormData();
      const uploadTimestamp = Date.now();

      formData.append('employeeNumber', employeeNumber.toString());
      formData.append('locationType', 'CAMPUS');
      formData.append('timestamp', uploadTimestamp.toString());

      if (username) {
        formData.append('username', username);
      }

      if (location?.trim()) {
        formData.append('location', location);
      }

      if (latitude !== undefined && latitude !== null) {
        formData.append('latitude', latitude.toString());
      }

      if (longitude !== undefined && longitude !== null) {
        formData.append('longitude', longitude.toString());
      }

      if (photos.length > 0 && photos[0]?.uri) {
        const photoFile = {
          uri: photos[0].uri,
          type: 'image/jpeg',
          name: `photo_${uploadTimestamp}.jpg`,
        };
        formData.append('photo', photoFile as any);
      }

      if (audioRecording?.uri) {
        let audioUri = audioRecording.uri;

        if (Platform.OS === 'android' && audioUri.startsWith('/')) {
          audioUri = `file://${audioUri}`;
        }

        const audioFile = {
          uri: audioUri,
          type: 'audio/m4a',
          name: `audio_${uploadTimestamp}.m4a`,
        };
        formData.append('audio', audioFile as any);

        if (audioRecording.duration) {
          formData.append('audioDuration', audioRecording.duration.toString());
        }
      }

      const data = await apiHelpers.uploadFormData('/attendance', formData);
      this.clearAttendanceCache(employeeNumber);

      return { success: true, id: (data as any).id, data: (data as any).data };
    } catch (error: any) {
      console.error('Upload error:', error);

      if (error.response?.status === 403 || error.response?.status === 401) {
        return {
          success: false,
          error: 'Session expired. Please login again.',
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Upload failed',
      };
    }
  }

  async checkoutAttendance(employeeNumber: string): Promise<CheckoutResponse> {
    try {
      const data = await apiHelpers.post<any>('/attendance/checkout', {
        employeeNumber,
      });

      this.clearAttendanceCache(employeeNumber);

      return {
        success: true,
        data: data.data,
      };
    } catch (error: any) {
      console.error('Checkout error:', error);

      if (error.response?.status === 403 || error.response?.status === 401) {
        return {
          success: false,
          error: 'Session expired. Please login again.',
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Checkout failed',
      };
    }
  }

  async getTodayAttendance(
    employeeNumber: string,
    forceRefresh: boolean = false
  ): Promise<TodayAttendanceResponse> {
    try {
      if (!forceRefresh) {
        const cached = this.attendanceCache.get(employeeNumber);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
          return {
            success: true,
            data: cached.data,
          };
        }
      }

      const response = await apiHelpers.get<any>(
        `/attendance/today/${employeeNumber}`
      );

      if (response.success && response.data) {
        this.attendanceCache.set(employeeNumber, {
          data: response.data,
          timestamp: Date.now(),
        });

        return {
          success: true,
          data: response.data,
        };
      }

      this.clearAttendanceCache(employeeNumber);

      return {
        success: false,
        error: 'No attendance found for today',
      };
    } catch (error: any) {
      console.error('Get today attendance error:', error);

      if (error.response?.status === 403 || error.response?.status === 401) {
        return {
          success: false,
          error: 'Session expired. Please login again.',
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get attendance',
      };
    }
  }

  private clearAttendanceCache(employeeNumber: string): void {
    this.attendanceCache.delete(employeeNumber);
  }

  clearAllCache(): void {
    this.attendanceCache.clear();
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.attendanceCache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.attendanceCache.delete(key);
      }
    }
  }
}

const attendanceService = AttendanceService.getInstance();

export const uploadAttendanceData = attendanceService.uploadAttendance.bind(attendanceService);
export const checkoutAttendance = attendanceService.checkoutAttendance.bind(attendanceService);
export const getTodayAttendance = attendanceService.getTodayAttendance.bind(attendanceService);
export const clearAttendanceCache = attendanceService.clearAllCache.bind(attendanceService);

export default attendanceService;
