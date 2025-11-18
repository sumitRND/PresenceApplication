import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import api from '../services/api';

interface Project {
  projectCode: string;
  department: string;
}

interface AuthState {
  employeeNumber: string | null;
  username: string | null;
  empClass: string | null;
  projects: Project[];
  department: string | null;
  token: string | null;
  refreshToken: string | null;
  tokenExpiry: number | null;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  refreshAuthToken: () => Promise<boolean>;
  checkTokenExpiry: () => boolean;
  getAuthHeaders: () => { Authorization?: string };
  scheduleTokenRefresh: () => void;
  clearTokenRefreshTimer: () => void;
}

let tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      employeeNumber: null,
      username: null,
      empClass: null,
      projects: [],
      department: null,
      token: null,
      refreshToken: null,
      tokenExpiry: null,
      isLoading: false,
      isInitialized: false,
      isAuthenticated: false,

      initializeAuth: async () => {
        const state = get();

        if (state.isInitialized) return;

        try {
          if (state.token && state.tokenExpiry) {
            const isValid = state.checkTokenExpiry();

            if (isValid) {
              set({
                isAuthenticated: true,
                isInitialized: true,
              });

              state.scheduleTokenRefresh();
            } else if (state.refreshToken) {
              const refreshed = await state.refreshAuthToken();

              if (refreshed) {
                set({
                  isAuthenticated: true,
                  isInitialized: true,
                });
              } else {
                await state.signOut();
                set({ isInitialized: true });
              }
            } else {
              await state.signOut();
              set({ isInitialized: true });
            }
          } else {
            set({
              isAuthenticated: false,
              isInitialized: true,
            });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          await state.signOut();
          set({ isInitialized: true });
        }
      },

      signIn: async (username, password) => {
        set({ isLoading: true });

        try {
          const response = await api.post('/login', {
            username: username.trim(),
            password,
          });

          const { data } = response;

          if (data.success && data.token) {
            const tokenExpiry = Date.now() + 30 * 60 * 1000;
            const department = data.projects?.[0]?.department || null;

            set({
              employeeNumber: data.employeeNumber,
              username: data.username,
              empClass: data.empClass,
              projects: data.projects || [],
              department,
              token: data.token,
              refreshToken: data.refreshToken || data.token,
              tokenExpiry,
              isAuthenticated: true,
              isLoading: false,
            });

            get().scheduleTokenRefresh();

            const { useAttendanceStore } = await import('./attendanceStore');
            useAttendanceStore.getState().initializeWithUser(
              data.employeeNumber,
              data.username,
              department
            );

            return true;
          } else {
            Alert.alert('Login Failed', data.error || 'Invalid credentials');
            set({ isLoading: false });
            return false;
          }
        } catch (error: any) {
          console.error('Login error:', error);

          const errorMessage =
            error.response?.data?.error ||
            error.message ||
            'Login failed. Please try again.';

          Alert.alert('Login Error', errorMessage);
          set({ isLoading: false });
          return false;
        }
      },

      signOut: async () => {
        get().clearTokenRefreshTimer();

        set({
          employeeNumber: null,
          username: null,
          empClass: null,
          projects: [],
          department: null,
          token: null,
          refreshToken: null,
          tokenExpiry: null,
          isAuthenticated: false,
          isLoading: false,
        });

        try {
          const { useAttendanceStore } = await import('./attendanceStore');
          useAttendanceStore.getState().clearUser();
        } catch (error) {
          console.error('Error clearing attendance store:', error);
        }

        try {
          await AsyncStorage.removeItem('auth-storage');
        } catch (error) {
          console.error('Error clearing auth storage:', error);
        }
      },

      checkTokenExpiry: () => {
        const state = get();

        if (!state.token || !state.tokenExpiry) return false;

        return Date.now() < state.tokenExpiry - 60000;
      },

      getAuthHeaders: () => {
        const state = get();

        if (state.token && state.checkTokenExpiry()) {
          return { Authorization: `Bearer ${state.token}` };
        }

        return {};
      },

      refreshAuthToken: async () => {
        const state = get();

        if (!state.refreshToken) {
          console.log('No refresh token available');
          return false;
        }

        try {
          const response = await api.post('/auth/refresh', {
            refreshToken: state.refreshToken,
          });

          const { data } = response;

          if (data.success && data.token) {
            const tokenExpiry = Date.now() + 30 * 60 * 1000;

            set({
              token: data.token,
              refreshToken: data.refreshToken || data.token,
              tokenExpiry,
            });

            get().scheduleTokenRefresh();

            return true;
          }

          return false;
        } catch (error) {
          console.error('Token refresh failed:', error);

          await state.signOut();
          return false;
        }
      },

      scheduleTokenRefresh: () => {
        const state = get();

        state.clearTokenRefreshTimer();

        if (!state.tokenExpiry || !state.token) return;

        const refreshTime = state.tokenExpiry - Date.now() - 5 * 60 * 1000;

        if (refreshTime > 0) {
          tokenRefreshTimer = setTimeout(() => {
            get().refreshAuthToken();
          }, refreshTime);
        } else {
          state.refreshAuthToken();
        }
      },

      clearTokenRefreshTimer: () => {
        if (tokenRefreshTimer) {
          clearTimeout(tokenRefreshTimer);
          tokenRefreshTimer = null;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        employeeNumber: state.employeeNumber,
        username: state.username,
        empClass: state.empClass,
        projects: state.projects,
        department: state.department,
        token: state.token,
        refreshToken: state.refreshToken,
        tokenExpiry: state.tokenExpiry,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          setTimeout(() => {
            state.initializeAuth();
          }, 100);
        }
      },
    }
  )
);
