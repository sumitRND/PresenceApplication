import axios from "axios";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;

export interface AuthResponse {
  success: boolean;
  employeeNumber?: string;
  username?: string;
  empClass?: string;
  projects?: { projectCode: string; department: string }[];
  token?: string;
  error?: string;
  message?: string;
}

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

export const loginUser = async (
  username: string, 
  password: string
): Promise<AuthResponse> => {
  try {
    const { data } = await apiClient.post('/login', {
      username: username.trim(),
      password
    });

    return {
      success: data.success,
      employeeNumber: data.employeeNumber,
      username: data.username,
      empClass: data.empClass,
      projects: data.projects,
      token: data.token,
      message: data.message
    };
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.response?.status === 401) {
      return {
        success: false,
        error: error.response.data?.error || "Invalid username or password"
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || "Login failed"
    };
  }
};