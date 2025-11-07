import { brutalistColors } from "@/constants/colors";
import { useAuthStore } from "@/store/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
const API_BASE = process.env.EXPO_PUBLIC_API_BASE;

export interface AttendanceDate {
  date: string;
  present: number;
  absent: number;
  attendance?: {
    takenLocation: string | null;
    checkinTime: string | null;
    checkoutTime: string | null;
    sessionType?: "FN" | "AF";
    fullDay: boolean;
    halfDay: boolean;
    isCheckout: boolean;
  };
}
export interface Holiday {
  date: string;
  description: string;
  isHoliday: boolean;
  isWeekend: boolean;
}
export interface AttendanceStatistics {
  totalDays: number;
  totalFullDays: number;
  totalHalfDays: number;
  notCheckedOut: number;
  year: number;
  month?: number;
}

const createApiClient = () => {
  const authHeaders = useAuthStore.getState().getAuthHeaders();
  return axios.create({
    baseURL: API_BASE,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
  });
};

export const getCachedHolidays = async (
  year: number,
  month: number
): Promise<Holiday[]> => {
  const cacheKey = `cached_holidays_${year}_${month}`;
  console.log('🗓️ Loading holidays for:', year, month);
  
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      console.log('✅ Holidays loaded from cache');
      return JSON.parse(cached) as Holiday[];
    }

    console.log('📡 Fetching holidays from API...');
    const apiClient = createApiClient();
    
    const response = await apiClient.get("/calendar", {
      params: { year, month },
      timeout: 10000
    });
    
    console.log('✅ Holidays API response:', response.status);
    console.log('Holiday data:', JSON.stringify(response.data, null, 2));
    
    const { data } = response;
    
    if (!data.success || !data.data || !data.data.entries) {
      console.error('❌ Invalid holiday response structure');
      return [];
    }

    const holidays: Holiday[] = data.data.entries.map((entry: any) => ({
      date: entry.date.split("T")[0],
      description: entry.description,
      isHoliday: entry.isHoliday,
      isWeekend: entry.isWeekend,
    }));

    console.log('✅ Holidays processed:', holidays.length);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(holidays));
    return holidays;
    
  } catch (error: any) {
    console.error("❌ Error loading holidays:", error);
    
    if (error.response) {
      console.error('🔴 Holiday error response:', error.response.data);
      console.error('🔴 Holiday error status:', error.response.status);
    } else if (error.request) {
      console.error('📡 No holiday response received');
    }
    
    return [];
  }
};

export const getAttendanceCalendar = async (
  employeeNumber: string,
  year?: number,
  month?: number
): Promise<{
  success: boolean;
  data?: { attendances: AttendanceDate[]; statistics: AttendanceStatistics };
  error?: string;
}> => {
  try {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;

    const apiClient = createApiClient();
    
    console.log('📡 Starting attendance API call...');
    console.log('URL:', `${API_BASE}/attendance/calendar/${employeeNumber}`);
    console.log('Params:', params);
    
    const response = await apiClient.get(
      `/attendance/calendar/${employeeNumber}`,
      {
        params,
        timeout: 10000 // 10 second timeout
      }
    );

    console.log('✅ Response received:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    const { data } = response;

    if (data.success && data.data) {
      console.log('📊 Raw attendances count:', data.data.attendances?.length || 0);
      
      const mappedAttendances: AttendanceDate[] = data.data.attendances
        .filter((att: any) => {
          const hasCheckin = !!att.checkinTime;
          if (!hasCheckin) {
            console.log('⚠️ Skipping attendance without checkin:', att.date);
          }
          return hasCheckin;
        })
        .map((att: any) => ({
          date: att.date.split("T")[0],
          present: 1,
          absent: 0,
          attendance: {
            takenLocation: att.takenLocation || att.locationType || null,
            checkinTime: att.checkinTime,
            checkoutTime: att.checkoutTime,
            sessionType: att.sessionType,
            fullDay: att.attendanceType === "FULL_DAY" || att.autoCompleted === true,
            halfDay: att.attendanceType === "HALF_DAY",
            isCheckout: !!att.checkoutTime || att.autoCompleted === true,
          },
        }));

      console.log('✅ Mapped attendances count:', mappedAttendances.length);
      console.log('📈 Statistics:', data.data.statistics);

      return {
        success: true,
        data: {
          attendances: mappedAttendances,
          statistics: data.data.statistics,
        },
      };
    }

    console.log('❌ Invalid response structure');
    return { success: false, error: "Invalid response structure" };
    
  } catch (error: any) {
    console.error('❌ Get attendance calendar error:', error);
    
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout');
      return {
        success: false,
        error: "Request timeout. Server took too long to respond.",
      };
    }
    
    if (error.response) {
      console.error('🔴 Error response:', error.response.data);
      console.error('🔴 Error status:', error.response.status);
      console.error('🔴 Error headers:', error.response.headers);
    } else if (error.request) {
      console.error('📡 No response received');
      console.error('Request details:', error.request._url);
    } else {
      console.error('⚠️ Error message:', error.message);
    }
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || "Failed to fetch attendance",
    };
  }
};

export const getMarkedDates = (
  attendanceDates: AttendanceDate[],
  holidays: Holiday[]
) => {
  const marked: { [key: string]: any } = {};

  const currentHour = new Date().getHours();
  const today = new Date().toISOString().split("T")[0];

  attendanceDates.forEach((item) => {
    const dateStr = item.date.split("T")[0];
    let dotColor = brutalistColors.absent;
    let backgroundColor = "#F87171";
    let textColor = "#1F2937";

    if (item.present === 1) {
      if (item.attendance) {
        const isAutoCompleted =
          dateStr === today &&
          currentHour >= 23 &&
          !item.attendance.isCheckout;

        if (isAutoCompleted || item.attendance.fullDay) {
          // Full Day Present (Green)
          dotColor = brutalistColors.present;
          backgroundColor = "#D1FAE5";
          textColor = "#065F46";
        } else if (!item.attendance.isCheckout) {
          // In Progress (Yellow)
          dotColor = brutalistColors.inProgress;
          backgroundColor = "#FEF3C7";
          textColor = "#92400E";
        } else if (item.attendance.halfDay) {
          // Half Day Present (Green)
          dotColor = brutalistColors.present;
          backgroundColor = "#D1FAE5";
          textColor = "#065F46";
        } else {
          // Fallback for any other "Present" state (Green)
          dotColor = brutalistColors.present;
          backgroundColor = "#D1FAE5";
          textColor = "#065F46";
        }
      }
    }

    marked[dateStr] = {
      marked: true,
      dotColor,
      selected: false,
      selectedColor: dotColor,
      customStyles: {
        container: {
          backgroundColor,
          borderRadius: 6,
        },
        text: {
          color: textColor,
          fontWeight: "bold",
        },
      },
    };
  });

  holidays.forEach((h) => {
    const dateStr = h.date.split("T")[0] || h.date;
    if (!marked[dateStr]) {
      marked[dateStr] = {
        customStyles: {
          container: {
            backgroundColor: h.isWeekend ? "#E0E7FF" : "#FEF3C7",
            borderRadius: 6,
          },
          text: {
            color: h.isWeekend ? "#6366F1" : "#92400E",
            fontWeight: "500",
          },
        },
      };
    }
  });

  return marked;
};