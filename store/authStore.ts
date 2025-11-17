import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { loginUser } from "../services/authService";
import { clearUserData, getUserData, storeUserData } from "../services/UserId";
import axios from "axios"; // Make sure to import axios

interface AuthState {
  session: string | null;
  userName: string | null;
  employeeNumber: string | null;
  empClass: string | null;
  projects: { projectCode: string; department: string }[];
  token: string | null;
  tokenExpiry: number | null;
  refreshToken: string | null; // Added refreshToken
  isRefreshing: boolean; // Added isRefreshing
  isLoading: boolean;
  isInitialized: boolean;
  autoLogoutTimer: ReturnType<typeof setTimeout> | null;

  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  checkTokenExpiry: () => boolean;
  refreshTokenTimer: () => void;
  clearAutoLogoutTimer: () => void;
  getAuthHeaders: () => { Authorization?: string };
  refreshAuthToken: () => Promise<boolean>; // Added refreshAuthToken
  scheduleTokenRefresh: () => void; // Added scheduleTokenRefresh
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      userName: null,
      employeeNumber: null,
      empClass: null,
      projects: [],
      token: null,
      tokenExpiry: null,
      refreshToken: null,
      isRefreshing: false,
      isLoading: true,
      isInitialized: false,
      autoLogoutTimer: null,

      initializeAuth: async () => {
        try {
          const userData = await getUserData();
          const state = get();

          if (state.token && state.tokenExpiry) {
            const isExpired = Date.now() >= state.tokenExpiry;
            if (isExpired) {
              // Attempt to refresh the token before signing out
              const refreshed = await get().refreshAuthToken();
              if (!refreshed) {
                await get().signOut();
                Alert.alert(
                  "Session Expired",
                  "Your session has expired. Please login again.",
                );
              }
            } else {
              get().scheduleTokenRefresh(); // Schedule refresh for existing valid token
            }
          }

          if (userData?.isLoggedIn && get().token) {
            // check token again after potential refresh
            set({
              session: userData.employeeNumber,
              userName: userData.name,
              employeeNumber: userData.employeeNumber,
            });

            const { useAttendanceStore } = await import("./attendanceStore");
            useAttendanceStore.getState().setUserId(userData.name);
          }
        } catch (e) {
          console.error("Initialization failed", e);
          await get().signOut();
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      checkTokenExpiry: () => {
        const state = get();
        if (!state.token || !state.tokenExpiry) return false;
        return Date.now() < state.tokenExpiry;
      },

      // This function can be deprecated or repurposed if session expiry alerts are no longer needed
      refreshTokenTimer: () => {
        get().scheduleTokenRefresh();
      },

      clearAutoLogoutTimer: () => {
        const state = get();
        if (state.autoLogoutTimer) {
          clearTimeout(state.autoLogoutTimer);
          set({ autoLogoutTimer: null });
        }
      },

      getAuthHeaders: () => {
        const state = get();
        if (state.token && state.checkTokenExpiry()) {
          return { Authorization: `Bearer ${state.token}` };
        }
        return {};
      },

      signIn: async (username, password) => {
        set({ isLoading: true });
        try {
          const res = await loginUser(username, password);

          if (res.success && res.token && res.refreshToken) {
            // Assuming login response includes refreshToken
            const tokenExpiry = Date.now() + 30 * 60 * 1000;

            await storeUserData({
              employeeNumber: res.employeeNumber!,
              name: res.username!,
              isLoggedIn: true,
            });

            set({
              session: res.employeeNumber,
              userName: res.username,
              employeeNumber: res.employeeNumber,
              empClass: res.empClass,
              projects: res.projects || [],
              token: res.token,
              refreshToken: res.refreshToken,
              tokenExpiry,
              isLoading: false,
            });

            const { useAttendanceStore } = await import("./attendanceStore");
            useAttendanceStore.getState().setUserId(res.username!);

            if (res.projects && res.projects.length > 0) {
              const department = res.projects[0].department;
              useAttendanceStore.getState().setDepartment(department);
            }

            get().scheduleTokenRefresh();
            Alert.alert("Success", "Logged in successfully!");
          } else {
            set({ isLoading: false });
            Alert.alert("Login Failed", res.error || "Unknown error");
          }
        } catch (err) {
          console.error("Login error", err);
          set({ isLoading: false });
          Alert.alert("Error", "An unexpected error occurred during login.");
        }
      },

      signOut: async () => {
        try {
          get().clearAutoLogoutTimer();
          await clearUserData();
          // Reset all auth-related state
          set({
            session: null,
            userName: null,
            employeeNumber: null,
            empClass: null,
            projects: [],
            token: null,
            refreshToken: null,
            tokenExpiry: null,
            autoLogoutTimer: null,
            isRefreshing: false,
          });

          const { useAttendanceStore } = await import("./attendanceStore");
          useAttendanceStore.getState().clearUserId();
        } catch (e) {
          console.error("Sign out failed", e);
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),

      // New function to refresh the authentication token
      refreshAuthToken: async () => {
        const state = get();
        if (!state.refreshToken || state.isRefreshing) return false;

        set({ isRefreshing: true });
        try {
          // Replace with your actual API endpoint for refreshing tokens
          const response = await axios.post("YOUR_API_BASE_URL/auth/refresh", {
            refreshToken: state.refreshToken,
          });

          if (response.data.success && response.data.token) {
            const newExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes expiry
            set({
              token: response.data.token,
              tokenExpiry: newExpiry,
            });

            get().scheduleTokenRefresh(); // Schedule the next refresh
            return true;
          }
          // If refresh fails, sign out the user
          await get().signOut();
          return false;
        } catch (error) {
          console.error("Token refresh failed", error);
          await get().signOut(); // Critical failure, sign out
          return false;
        } finally {
          set({ isRefreshing: false });
        }
      },

      // New function to schedule the token refresh
      scheduleTokenRefresh: () => {
        const state = get();
        state.clearAutoLogoutTimer(); // Clear any existing timer

        if (state.tokenExpiry) {
          // Schedule refresh 2 minutes before the token expires
          const refreshTime = state.tokenExpiry - Date.now() - 2 * 60 * 1000;

          if (refreshTime > 0) {
            const timer = setTimeout(() => {
              get().refreshAuthToken();
            }, refreshTime);

            set({ autoLogoutTimer: timer });
          } else {
            // If the token is already within the 2-minute window or expired, refresh immediately
            get().refreshAuthToken();
          }
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Persist the new refreshToken state
      partialize: (state) => ({
        session: state.session,
        userName: state.userName,
        employeeNumber: state.employeeNumber,
        empClass: state.empClass,
        projects: state.projects,
        token: state.token,
        refreshToken: state.refreshToken,
        tokenExpiry: state.tokenExpiry,
      }),
    },
  ),
);
