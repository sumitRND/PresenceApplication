import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE,
  timeout: 30000,
});

apiClient.interceptors.request.use(
  (config) => {
    const { token, checkTokenExpiry } = useAuthStore.getState();
    if (token && checkTokenExpiry()) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshed = await useAuthStore.getState().refreshAuthToken();

      if (refreshed) {
        return apiClient(originalRequest);
      } else {
        useAuthStore.getState().signOut();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
