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
              await get().signOut();
              Alert.alert(
                "Session Expired",
                "Your session has expired. Please login again.",
              );
              set({ isLoading: false, isInitialized: true });
              return;
            }
          }

          if (userData?.isLoggedIn && state.token) {
            set({
              session: userData.employeeNumber,
              userName: userData.name,
              employeeNumber: userData.employeeNumber,
              isLoading: false,
              isInitialized: true,
            });

            // Use dynamic import to break circular dependency
            const { useAttendanceStore } = await import("./attendanceStore");
            useAttendanceStore.getState().setUserId(userData.name);
            get().refreshTokenTimer();
          } else {
            set({ isLoading: false, isInitialized: true });
          }
        } catch {
          set({ isLoading: false, isInitialized: true });
        }
      },

      checkTokenExpiry: () => {
        const state = get();
        if (!state.token || !state.tokenExpiry) return false;
        return Date.now() < state.tokenExpiry;
      },

      refreshTokenTimer: () => {
        const state = get();

        state.clearAutoLogoutTimer();

        if (state.tokenExpiry) {
          const timeUntilExpiry = state.tokenExpiry - Date.now();

          if (timeUntilExpiry > 0) {
            const timer = setTimeout(async () => {
              await get().signOut();
              Alert.alert(
                "Session Expired",
                "Your session has expired. Please login again.",
                [{ text: "OK" }],
              );
            }, timeUntilExpiry);

            set({ autoLogoutTimer: timer });

            if (timeUntilExpiry > 120000) {
              setTimeout(() => {
                Alert.alert(
                  "Session Expiring",
                  "Your session will expire in 2 minutes.",
                  [{ text: "OK" }],
                );
              }, timeUntilExpiry - 120000);
            }
          }
        }
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
              tokenExpiry,
              isLoading: false,
            });

            // Use dynamic import to break circular dependency
            const { useAttendanceStore } = await import("./attendanceStore");
            useAttendanceStore.getState().setUserId(res.username!);

            if (res.projects && res.projects.length > 0) {
              const department = res.projects[0].department;
              useAttendanceStore.getState().setDepartment(department);
            }

            get().refreshTokenTimer();
            Alert.alert("Success", "Logged in successfully!");
          } else {
            set({ isLoading: false });
            Alert.alert("Login Failed", res.error || "Unknown error");
          }
        } catch {
          set({ isLoading: false });
          Alert.alert("Error", "Unexpected error during login");
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
            tokenExpiry: null,
            autoLogoutTimer: null,
          });

          // Use dynamic import to break circular dependency
          const { useAttendanceStore } = await import("./attendanceStore");
          useAttendanceStore.getState().clearUserId();
        } catch (e) {
          console.error(e);
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),
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
        tokenExpiry: state.tokenExpiry,
      }),
    },
  ),
);
