import { useAuthStore } from '@/store/authStore';
import axios, { AxiosError, AxiosInstance } from 'axios';

class ApiClient {
  private static instance: AxiosInstance | null = null;
  private static tokenRefreshPromise: Promise<boolean> | null = null;

  static getInstance(): AxiosInstance {
    if (!this.instance) {
      this.instance = axios.create({
        baseURL: process.env.EXPO_PUBLIC_API_BASE,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.instance.interceptors.request.use(
        (config) => {
          const { token, checkTokenExpiry } = useAuthStore.getState();
          
          if (token && checkTokenExpiry()) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          
          return config;
        },
        (error) => Promise.reject(error)
      );

      this.instance.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
          const originalRequest: any = error.config;

          if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            if (!this.tokenRefreshPromise) {
              this.tokenRefreshPromise = useAuthStore.getState().refreshAuthToken();
            }

            const refreshed = await this.tokenRefreshPromise;
            this.tokenRefreshPromise = null;

            if (refreshed) {
              return this.instance!(originalRequest);
            } else {
              useAuthStore.getState().signOut();
              return Promise.reject(new Error('Session expired'));
            }
          }

          return Promise.reject(error);
        }
      );
    }

    return this.instance;
  }
}

const api = ApiClient.getInstance();
export default api;

export const apiHelpers = {
  async get<T>(url: string, config?: any): Promise<T> {
    const response = await api.get<T>(url, config);
    return response.data;
  },

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await api.post<T>(url, data, config);
    return response.data;
  },

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await api.put<T>(url, data, config);
    return response.data;
  },

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await api.delete<T>(url, config);
    return response.data;
  },

  async uploadFormData<T>(url: string, formData: FormData): Promise<T> {
    const response = await api.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};