import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { loginUser } from "../services/authService";
import { clearUserData, getUserData, storeUserData } from "../services/UserId";

interface AuthState {
  session: string | null;
  userName: string | null;
  employeeNumber: string | null;
  empClass: string | null;
  projects: { projectCode: string; department: string }[];
  token: string | null;
  tokenExpiry: number | null;
  refreshToken: string | null;
  isRefreshing: boolean;
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
  refreshAuthToken: () => Promise<boolean>; 
  scheduleTokenRefresh: () => void; 
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
              const refreshed = await get().refreshAuthToken();
              if (!refreshed) {
                await get().signOut();
                Alert.alert(
                  "Session Expired",
                  "Your session has expired. Please login again.",
                );
              }
            } else {
              get().scheduleTokenRefresh();
            }
          }

          if (userData?.isLoggedIn && get().token) {
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

          if (res.success && res.token) {
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
              refreshToken: res.token,
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

      refreshAuthToken: async () => {
        const state = get();
        if (state.isRefreshing) return false;
        console.log("Token refresh not implemented - forcing re-login");
        return false;
      },

      scheduleTokenRefresh: () => {
        const state = get();
        state.clearAutoLogoutTimer();

        if (state.tokenExpiry) {
          const refreshTime = state.tokenExpiry - Date.now() - 2 * 60 * 1000;

          if (refreshTime > 0) {
            const timer = setTimeout(() => {
              get().refreshAuthToken();
            }, refreshTime);

            set({ autoLogoutTimer: timer });
          } else {
            get().refreshAuthToken();
          }
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
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