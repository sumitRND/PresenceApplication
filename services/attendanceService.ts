import { useAuthStore } from "@/store/authStore";
import { AttendanceProps } from "@/types/geofence";
import axios from "axios";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;

export interface CheckoutResponse {
  success: boolean;
  data?: {
    checkOutTime: string;
    attendanceType: "FULL_DAY" | "HALF_DAY";
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
    sessionType: "FORENOON" | "AFTERNOON";
    attendanceType?: "FULL_DAY" | "HALF_DAY";
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
}

export const uploadAttendanceData = async ({
  employeeNumber,
  photos,
  audioRecording,
  location,
  latitude,
  longitude,
}: AttendancePropsWithCoordinates) => {
  try {
    if (!employeeNumber) {
      return { success: false, error: "User not logged in" };
    }

    const form = new FormData();
    const uploadTimestamp = Date.now();
    form.append("locationType", "CAMPUS");

    form.append("username", useAuthStore.getState().userName || "");
    form.append("employeeNumber", employeeNumber.toString());
    form.append("timestamp", uploadTimestamp.toString());

    if (location && location.trim()) {
      form.append("location", location);
    }

    if (latitude !== undefined && latitude !== null) {
      form.append("latitude", latitude.toString());
    }
    if (longitude !== undefined && longitude !== null) {
      form.append("longitude", longitude.toString());
    }

    if (photos.length > 0 && photos[0]?.uri) {
      const photoFile = {
        uri: photos[0].uri,
        type: "image/jpeg",
        name: `photo_${uploadTimestamp}.jpg`,
      };
      form.append("photo", photoFile as any);
    }

    if (audioRecording?.uri) {
      const audioFile = {
        uri: audioRecording.uri,
        type: "audio/m4a",
        name: `audio_${uploadTimestamp}.m4a`,
      };
      form.append("audio", audioFile as any);

      if (audioRecording.duration) {
        form.append("audioDuration", audioRecording.duration.toString());
      }
    }
    console.log("form data", form);

    const authHeaders = useAuthStore.getState().getAuthHeaders();

    const { data } = await axios.post(`${API_BASE}/attendance`, form, {
      headers: {
        "Content-Type": "multipart/form-data",
        ...authHeaders,
      },
      timeout: 30000,
    });

    console.log("attendance data", data);

    return { success: true, id: data.id, data: data.data };
  } catch (e: any) {
    console.error("Upload error:", e);

    if (e.response?.status === 403 || e.response?.status === 401) {
      return {
        success: false,
        error: "Session expired. Please login again.",
      };
    }

    return {
      success: false,
      error: e.response?.data?.error || e.message || "Upload failed",
    };
  }
};

export const checkoutAttendance = async (
  employeeNumber: string
): Promise<CheckoutResponse> => {
  try {
    const authHeaders = useAuthStore.getState().getAuthHeaders();

    const { data } = await axios.post(
      `${API_BASE}/attendance/checkout`,
      {
        employeeNumber,
      },
      {
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        timeout: 10000,
      }
    );

    return {
      success: true,
      data: data.data,
    };
  } catch (e: any) {
    console.error("Checkout error:", e);

    if (e.response?.status === 403 || e.response?.status === 401) {
      return {
        success: false,
        error: "Session expired. Please login again.",
      };
    }

    return {
      success: false,
      error: e.response?.data?.error || e.message || "Checkout failed",
    };
  }
};

export const getTodayAttendance = async (
  employeeNumber: string
): Promise<TodayAttendanceResponse> => {
  try {
    const authHeaders = useAuthStore.getState().getAuthHeaders();

    const { data } = await axios.get(
      `${API_BASE}/attendance/today/${employeeNumber}`,
      {
        timeout: 10000,
        headers: authHeaders,
      }
    );

    return {
      success: data.success,
      data: data.data,
    };
  } catch (e: any) {
    console.error("Get today attendance error:", e);

    if (e.response?.status === 403 || e.response?.status === 401) {
      return {
        success: false,
        error: "Session expired. Please login again.",
      };
    }

    return {
      success: false,
      error: e.response?.data?.error || e.message || "Failed to get attendance",
    };
  }
};