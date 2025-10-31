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
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as Holiday[];

    const apiClient = createApiClient();
    const { data } = await apiClient.get<{
      success: boolean;
      data: { entries: any[] };
    }>("/calendar", {
      params: { year, month },
    });

    const holidays: Holiday[] = data.data.entries.map((entry) => ({
      date: entry.date.split("T")[0],
      description: entry.description,
      isHoliday: entry.isHoliday,
      isWeekend: entry.isWeekend,
    }));

    await AsyncStorage.setItem(cacheKey, JSON.stringify(holidays));
    return holidays;
  } catch (error) {
    console.error("Error loading holidays:", error);
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
    const { data } = await apiClient.get(
      `/attendance/calendar/${employeeNumber}`,
      {
        params,
      }
    );

    if (data.success && data.data) {
      const mappedAttendances: AttendanceDate[] = data.data.attendances.map(
        (att: any) => ({
          date: att.date.split("T")[0],
          present: 1,
          absent: 0,
          attendance: {
            takenLocation: att.takenLocation,
            checkinTime: att.checkinTime,
            checkoutTime: att.checkoutTime,
            sessionType: att.sessionType,
            fullDay: att.attendanceType === "FULL_DAY",
            halfDay: att.attendanceType === "HALF_DAY",
            isCheckout: !!att.checkoutTime,
          },
        })
      );

      return {
        success: true,
        data: {
          attendances: mappedAttendances,
          statistics: data.data.statistics,
        },
      };
    }

    return { success: false, error: "No data received" };
  } catch (error: any) {
    console.error("Get attendance calendar error:", error);
    return {
      success: false,
      error:
        error.response?.data?.error ||
        error.message ||
        "Failed to fetch attendance calendar",
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