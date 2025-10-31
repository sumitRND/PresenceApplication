import { useAuthStore } from "@/store/authStore";
import axios from "axios";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;

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

const createApiClient = () => {
  const authHeaders = useAuthStore.getState().getAuthHeaders();
  console.log("auth header",authHeaders)
  
  return axios.create({
    baseURL: API_BASE,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders
    }
  });
};

export const getUserProfileByEmployeeNumber = async (employeeNumber: string): Promise<ProfileResponse> => {
  try {
    console.log('Fetching profile for employeeNumber:', employeeNumber);
    
    const apiClient = createApiClient();
    const { data } = await apiClient.get(`/profile/${employeeNumber}`);
    console.log('Profile response:', data);
    
    return {
      success: data.success,
      data: data.data
    };
  } catch (error: any) {
    console.error('Get profile error:', error);
    if (error.response?.status === 403 || error.response?.status === 401) {
      await useAuthStore.getState().signOut();
      return {
        success: false,
        error: "Session expired. Please login again."
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || "Failed to fetch profile"
    };
  }
};
