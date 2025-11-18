import { apiHelpers } from './api';

export interface AuthResponse {
  success: boolean;
  employeeNumber?: string;
  username?: string;
  empClass?: string;
  projects?: { projectCode: string; department: string }[];
  token?: string;
  refreshToken?: string;
  error?: string;
  message?: string;
}

export const loginUser = async (
  username: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const data = await apiHelpers.post<any>('/login', {
      username: username.trim(),
      password,
    });
    
    return {
      success: data.success,
      employeeNumber: data.employeeNumber,
      username: data.username,
      empClass: data.empClass,
      projects: data.projects,
      token: data.token,
      refreshToken: data.refreshToken,
      message: data.message,
    };
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.response?.status === 401) {
      return {
        success: false,
        error: error.response.data?.error || 'Invalid username or password',
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Login failed',
    };
  }
};

export interface ProfileData {
  employeeNumber: string;
  username: string;
  empClass: string;
  dateOfResign?: string | null;
}

export interface ProfileResponse {
  success: boolean;
  data?: ProfileData;
  error?: string;
  message?: string;
}

const profileCache = new Map<string, { data: ProfileData; timestamp: number }>();
const PROFILE_CACHE_DURATION = 5 * 60 * 1000;

export const getUserProfile = async (
  employeeNumber: string,
  forceRefresh: boolean = false
): Promise<ProfileResponse> => {
  try {
    if (!forceRefresh) {
      const cached = profileCache.get(employeeNumber);
      if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_DURATION) {
        return {
          success: true,
          data: cached.data,
        };
      }
    }
    
    const response = await apiHelpers.get<any>(`/profile/${employeeNumber}`);
    
    if (response.success && response.data) {
      profileCache.set(employeeNumber, {
        data: response.data,
        timestamp: Date.now(),
      });
      
      return {
        success: true,
        data: response.data,
      };
    }
    
    return {
      success: false,
      error: 'Profile not found',
    };
    
  } catch (error: any) {
    console.error('Get profile error:', error);
    
    if (error.response?.status === 403 || error.response?.status === 401) {
      const { useAuthStore } = await import('@/store/authStore');
      await useAuthStore.getState().signOut();
      
      return {
        success: false,
        error: 'Session expired. Please login again.',
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch profile',
    };
  }
};

export const clearProfileCache = (employeeNumber?: string): void => {
  if (employeeNumber) {
    profileCache.delete(employeeNumber);
  } else {
    profileCache.clear();
  }
};

export interface FieldTripData {
  fieldTrips: {
    startDate: string;
    endDate: string;
    isActive: boolean;
  }[];
}

export interface FieldTripResponse {
  success: boolean;
  data?: FieldTripData;
  error?: string;
}

export const getUserFieldTrips = async (
  employeeNumber: string
): Promise<FieldTripResponse> => {
  try {
    const response = await apiHelpers.get<any>(
      `/user-field-trips/employee/${employeeNumber}`
    );
    
    return {
      success: response.success,
      data: response.data,
    };
    
  } catch (error: any) {
    console.error('Get field trips error:', error);
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch field trips',
    };
  }
};

export interface AttendanceCalendarResponse {
  success: boolean;
  data?: {
    attendances: {
      date: string;
      checkinTime: string;
      checkoutTime?: string;
      sessionType: string;
      attendanceType: string;
      takenLocation?: string;
      autoCompleted?: boolean;
    }[];
    statistics: {
      totalDays: number;
      totalFullDays: number;
      totalHalfDays: number;
      notCheckedOut: number;
      year: number;
      month?: number;
    };
  };
  error?: string;
}

export const getAttendanceCalendar = async (
  employeeNumber: string,
  year?: number,
  month?: number
): Promise<AttendanceCalendarResponse> => {
  try {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    
    const response = await apiHelpers.get<any>(
      `/attendance/calendar/${employeeNumber}`,
      { params, timeout: 10000 }
    );
    
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data,
      };
    }
    
    return {
      success: false,
      error: 'Invalid response structure',
    };
    
  } catch (error: any) {
    console.error('Get attendance calendar error:', error);
    
    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: 'Request timeout. Server took too long to respond.',
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch attendance',
    };
  }
};

export interface Holiday {
  date: string;
  description: string;
  isHoliday: boolean;
  isWeekend: boolean;
}

const holidayCache = new Map<string, { data: Holiday[]; timestamp: number }>();
const HOLIDAY_CACHE_DURATION = 24 * 60 * 60 * 1000;

export const getHolidays = async (
  year: number,
  month: number,
  forceRefresh: boolean = false
): Promise<Holiday[]> => {
  const cacheKey = `${year}_${month}`;
  
  try {
    if (!forceRefresh) {
      const cached = holidayCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < HOLIDAY_CACHE_DURATION) {
        return cached.data;
      }
    }
    
    const response = await apiHelpers.get<any>('/calendar', {
      params: { year, month },
      timeout: 10000,
    });
    
    if (response.success && response.data?.entries) {
      const holidays: Holiday[] = response.data.entries.map((entry: any) => ({
        date: entry.date.split('T')[0],
        description: entry.description,
        isHoliday: entry.isHoliday,
        isWeekend: entry.isWeekend,
      }));
      
      holidayCache.set(cacheKey, {
        data: holidays,
        timestamp: Date.now(),
      });
      
      return holidays;
    }
    
    return [];
    
  } catch (error: any) {
    console.error('Error loading holidays:', error);
    return [];
  }
};

export const clearAllServiceCaches = (): void => {
  profileCache.clear();
  holidayCache.clear();
};
