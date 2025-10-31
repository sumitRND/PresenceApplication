import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraCapturedPicture } from "expo-camera";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getUserData } from "../services/UserId";
import { AudioRecording, ViewMode } from "../types/attendance";
import { useAuthStore } from "./authStore";

interface AttendanceRecord {
  date: string;
  timestamp: number;
  location: string;
  photosCount: number;
  hasAudio: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  sessionType?: "FORENOON" | "AFTERNOON";
  attendanceType?: "FULL_DAY" | "HALF_DAY";
  isCheckedOut?: boolean;
  takenLocation?: string;
  attendanceKey?: string;
}

export type PhotoPosition = "front";

interface AttendanceState {
  userId: string | null;
  isLoadingUserId: boolean;
  isInitialized: boolean;
  photos: CameraCapturedPicture[];
  audioRecording: AudioRecording | null;
  currentView: ViewMode;
  uploading: boolean;
  currentPhotoIndex: number;
  retakeMode: boolean;
  selectedLocationLabel: string | null;
  TOTAL_PHOTOS: number;
  attendanceRecords: AttendanceRecord[];
  todayAttendanceMarked: boolean;
  currentSessionPhotoPosition: PhotoPosition | null;
  lastAttendanceUpdate: number;
  userLocationType: "CAMPUS" | "FIELDTRIP" | null;
  isFieldTrip: boolean;
  fieldTripDates: { startDate: string; endDate: string }[];
  currentSessionType: "FORENOON" | "AFTERNOON" | null;
  canCheckout: boolean;
  department: string | null;
  initializeUserId: () => Promise<void>;
  setUserId: (userId: string | null) => void;
  clearUserId: () => void;
  setPhotos: (photos: CameraCapturedPicture[]) => void;
  setAudioRecording: (recording: AudioRecording | null) => void;
  setCurrentView: (view: ViewMode) => void;
  setCurrentPhotoIndex: (index: number) => void;
  setRetakeMode: (mode: boolean) => void;
  setSelectedLocationLabel: (label: string | null) => void;
  setUploading: (uploading: boolean) => void;
  markAttendanceForToday: (location: string) => void;
  checkTodayAttendance: () => boolean;
  getTodayPhotoPosition: () => PhotoPosition;
  generateNewPhotoPosition: () => PhotoPosition;
  resetAll: () => void;
  fetchTodayAttendanceFromServer: () => Promise<boolean>;
  triggerAttendanceUpdate: () => void;
  refreshAttendanceData: () => Promise<void>;
  setUserLocationType: (type: "CAMPUS" | "FIELDTRIP" | null) => void;
  checkFieldTripStatus: () => Promise<void>;
  fetchUserLocationSettings: () => Promise<void>;
  checkoutAttendance: () => Promise<boolean>;
  getCurrentSessionType: () => "FORENOON" | "AFTERNOON" | "OUTSIDE";
  setDepartment: (department: string) => void;
  fetchUserDepartment: () => Promise<void>;
  updateInProgressToPresent: () => Promise<void>;
  startAutoUpdateTimer: () => void;
  stopAutoUpdateTimer: () => void;
  autoUpdateTimerId: ReturnType<typeof setInterval> | null;
}

const getTodayDateString = () => new Date().toISOString().split("T")[0];

const generateFrontPhotoPosition = (): PhotoPosition => {
  return "front";
};

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set, get) => ({
      userId: null,
      isLoadingUserId: false,
      isInitialized: false,
      photos: [],
      audioRecording: null,
      currentView: "home",
      uploading: false,
      currentPhotoIndex: 0,
      retakeMode: false,
      selectedLocationLabel: null,
      TOTAL_PHOTOS: 1,
      attendanceRecords: [],
      todayAttendanceMarked: false,
      currentSessionPhotoPosition: null,
      lastAttendanceUpdate: 0,
      userLocationType: null,
      isFieldTrip: false,
      fieldTripDates: [],
      currentSessionType: null,
      canCheckout: false,
      department: null,
      autoUpdateTimerId: null,

      initializeUserId: async () => {
        try {
          set({ isLoadingUserId: true });
          const userData = await getUserData();

          if (userData?.isLoggedIn) {
            set({
              userId: userData.name,
              isLoadingUserId: false,
              isInitialized: true,
            });

            await get().fetchUserLocationSettings();
            await get().fetchUserDepartment();
            await get().fetchTodayAttendanceFromServer();

            get().startAutoUpdateTimer();
          } else {
            set({
              userId: null,
              isLoadingUserId: false,
              isInitialized: true,
              todayAttendanceMarked: false,
            });
          }
        } catch (err) {
          console.error("Error initializing user ID:", err);
          set({
            userId: null,
            isLoadingUserId: false,
            isInitialized: true,
            todayAttendanceMarked: false,
          });
        }
      },

      setUserId: (userId) => {
        set({
          userId,
          isInitialized: true,
          isLoadingUserId: false,
          todayAttendanceMarked: false,
          attendanceRecords: [],
          lastAttendanceUpdate: Date.now(),
          currentSessionType: null,
          canCheckout: false,
        });

        if (userId) {
          setTimeout(async () => {
            await get().fetchUserLocationSettings();
            await get().fetchUserDepartment();
            await get().fetchTodayAttendanceFromServer();
          }, 100);
        }
      },

      clearUserId: () => {
        get().stopAutoUpdateTimer();
        set({
          userId: null,
          photos: [],
          audioRecording: null,
          currentView: "home",
          currentPhotoIndex: 0,
          retakeMode: false,
          selectedLocationLabel: null,
          currentSessionPhotoPosition: null,
          todayAttendanceMarked: false,
          attendanceRecords: [],
          lastAttendanceUpdate: Date.now(),
          userLocationType: null,
          isFieldTrip: false,
          fieldTripDates: [],
          currentSessionType: null,
          canCheckout: false,
          department: null,
          autoUpdateTimerId: null,
        });
      },

      setPhotos: (photos) => set({ photos }),
      setAudioRecording: (recording) => set({ audioRecording: recording }),

      setCurrentView: (view) => {
        const state = get();
        if (
          view === "camera" &&
          !state.retakeMode &&
          !state.currentSessionPhotoPosition
        ) {
          set({
            currentView: view,
            currentSessionPhotoPosition: generateFrontPhotoPosition(),
          });
        } else {
          set({ currentView: view });
        }
      },

      setCurrentPhotoIndex: (i) => set({ currentPhotoIndex: i }),
      setRetakeMode: (m) => set({ retakeMode: m }),
      setSelectedLocationLabel: (label) =>
        set({ selectedLocationLabel: label }),
      setUploading: (u) => set({ uploading: u }),

      markAttendanceForToday: (location) => {
        const today = getTodayDateString();
        const state = get();
        const sessionType = state.getCurrentSessionType();
        const newRecord: AttendanceRecord = {
          date: today,
          timestamp: Date.now(),
          location,
          photosCount: state.photos.length,
          hasAudio: !!state.audioRecording,
          sessionType: sessionType === "OUTSIDE" ? undefined : sessionType,
        };
        set({
          attendanceRecords: [
            ...state.attendanceRecords.filter((r) => r.date !== today),
            newRecord,
          ],
          todayAttendanceMarked: true,
          lastAttendanceUpdate: Date.now(),
          currentSessionType: sessionType === "OUTSIDE" ? null : sessionType,
          canCheckout: sessionType !== "OUTSIDE",
        });
        setTimeout(() => get().fetchTodayAttendanceFromServer(), 2000);
      },

      fetchTodayAttendanceFromServer: async () => {
        const state = get();
        const { employeeNumber } = useAuthStore.getState();
        if (!employeeNumber) return false;

        try {
          const authHeaders = useAuthStore.getState().getAuthHeaders();

          const res = await fetch(
            `${process.env.EXPO_PUBLIC_API_BASE}/attendance/today/${employeeNumber}`,
            {
              cache: "no-cache",
              headers: {
                "Content-Type": "application/json",
                ...authHeaders,
              },
            }
          );

          const data = await res.json();
          const today = getTodayDateString();

          if (data.success && data.data) {
            const attendance = data.data;

            const serverRecord: AttendanceRecord = {
              date: today,
              timestamp: attendance.checkinTime
                ? new Date(attendance.checkinTime).getTime()
                : Date.now(),
              location: attendance.takenLocation || "Unknown",
              photosCount: attendance.photoUrl ? 1 : 0,
              hasAudio: !!attendance.audioUrl,
              checkInTime: attendance.checkinTime,
              checkOutTime: attendance.checkoutTime,
              sessionType:
                attendance.sessionType === "FN" ? "FORENOON" : "AFTERNOON",
              attendanceType: attendance.attendanceType,
              isCheckedOut: !!attendance.checkoutTime,
              takenLocation: attendance.takenLocation,
              attendanceKey: `${attendance.employeeNumber}_${today}`,
            };

            const canCheckout =
              !attendance.checkoutTime && !!attendance.checkinTime;

            set({
              attendanceRecords: [
                ...state.attendanceRecords.filter((r) => r.date !== today),
                serverRecord,
              ],
              todayAttendanceMarked: true,
              lastAttendanceUpdate: Date.now(),
              currentSessionType: serverRecord.sessionType || null,
              canCheckout,
            });
            return true;
          } else {
            set({
              attendanceRecords: state.attendanceRecords.filter(
                (r) => r.date !== today
              ),
              todayAttendanceMarked: false,
              lastAttendanceUpdate: Date.now(),
              currentSessionType: null,
              canCheckout: false,
            });
            return false;
          }
        } catch (err) {
          console.error("Error fetching attendance:", err);
          return get().checkTodayAttendance();
        }
      },

      checkTodayAttendance: () => {
        const today = getTodayDateString();
        const hasRecord = get().attendanceRecords.some((r) => r.date === today);
        if (get().todayAttendanceMarked !== hasRecord) {
          set({
            todayAttendanceMarked: hasRecord,
            lastAttendanceUpdate: Date.now(),
          });
        }
        return hasRecord;
      },

      getTodayPhotoPosition: () => get().currentSessionPhotoPosition || "front",

      generateNewPhotoPosition: () => {
        const pos = generateFrontPhotoPosition();
        set({ currentSessionPhotoPosition: pos });
        return pos;
      },

      resetAll: () =>
        set({
          photos: [],
          audioRecording: null,
          currentPhotoIndex: 0,
          currentView: "home",
          retakeMode: false,
          selectedLocationLabel: null,
          currentSessionPhotoPosition: null,
        }),

      triggerAttendanceUpdate: () => set({ lastAttendanceUpdate: Date.now() }),

      refreshAttendanceData: async () => {
        if (!get().userId) return;
        await get().fetchUserLocationSettings();
        await get().fetchUserDepartment();
        await get().fetchTodayAttendanceFromServer();
        get().triggerAttendanceUpdate();
      },

      setUserLocationType: (type) => set({ userLocationType: type }),

      fetchUserLocationSettings: async () => {
        const state = get();
        const { employeeNumber } = useAuthStore.getState();
        if (!employeeNumber) return;

        try {
          console.log(
            "Fetching location settings for employeeNumber:",
            employeeNumber
          );

          const authHeaders = useAuthStore.getState().getAuthHeaders();

          const res = await fetch(
            `${process.env.EXPO_PUBLIC_API_BASE}/user-field-trips/employee/${employeeNumber}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                ...authHeaders,
              },
              cache: "no-cache",
            }
          );

          const data = await res.json();
          console.log("Location settings response:", data);

          if (data.success && data.data) {
            const locationData = data.data;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const isOnTrip =
              locationData.fieldTrips?.some((trip: any) => {
                const start = new Date(trip.startDate);
                const end = new Date(trip.endDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                return today >= start && today <= end && trip.isActive;
              }) || false;

            set({
              userLocationType: isOnTrip ? "FIELDTRIP" : "CAMPUS",
              fieldTripDates: locationData.fieldTrips || [],
              isFieldTrip: isOnTrip,
            });
            console.log("Updated location state:", {
              userLocationType: isOnTrip ? "FIELDTRIP" : "CAMPUS",
              isFieldTrip: isOnTrip,
              fieldTripsCount: locationData.fieldTrips?.length || 0,
            });
          } else {
            console.warn("Failed to fetch location settings:", data);
            const currentState = get();
            set({
              userLocationType: "CAMPUS",
              isFieldTrip: false,
              fieldTripDates: currentState.fieldTripDates || [],
            });
          }
        } catch (err) {
          console.error("Error fetching user location settings:", err);
          const currentState = get();
          set({
            userLocationType: "CAMPUS",
            isFieldTrip: false,
            fieldTripDates: currentState.fieldTripDates || [],
          });
        }
      },

      checkFieldTripStatus: async () => {
        await get().fetchUserLocationSettings();
      },

      fetchUserDepartment: async () => {
        try {
          const { useAuthStore } = await import("./authStore");
          const projects = useAuthStore.getState().projects;

          if (projects && projects.length > 0) {
            set({ department: projects[0].department });
          } else {
            set({ department: null });
          }
        } catch (err) {
          console.error("Error setting department from auth store:", err);
          set({ department: null });
        }
      },

      getCurrentSessionType: () => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const timeInMinutes = hours * 60 + minutes;

        if (timeInMinutes >= 570 && timeInMinutes < 780) {
          return "FORENOON";
        } else if (timeInMinutes >= 780 && timeInMinutes <= 1050) {
          return "AFTERNOON";
        }
        return "OUTSIDE";
      },

      checkoutAttendance: async () => {
        const state = get();
        const { employeeNumber } = useAuthStore.getState();
        if (!employeeNumber) return false;

        try {
          const { checkoutAttendance } = await import(
            "../services/attendanceService"
          );
          const result = await checkoutAttendance(employeeNumber);

          if (result.success) {
            await state.fetchTodayAttendanceFromServer();
            return true;
          }
          return false;
        } catch (error) {
          console.error("Checkout error:", error);
          return false;
        }
      },

      setDepartment: (department) => set({ department }),

      updateInProgressToPresent: async () => {
        const state = get();
        const now = new Date();
        const currentHour = now.getHours();

        if (currentHour >= 23) {
          const today = getTodayDateString();
          const todayRecord = state.attendanceRecords.find(
            (r) => r.date === today
          );

          if (
            todayRecord &&
            !todayRecord.isCheckedOut &&
            state.todayAttendanceMarked
          ) {
            const updatedRecord = {
              ...todayRecord,
            };

            set({
              attendanceRecords: [
                ...state.attendanceRecords.filter((r) => r.date !== today),
                updatedRecord,
              ],
              lastAttendanceUpdate: Date.now(),
            });

            console.log(
              "Auto-updated attendance from In Progress to Present after 11 PM"
            );
          }
        }
      },

      startAutoUpdateTimer: () => {
        const state = get();

        if (state.autoUpdateTimerId) {
          clearInterval(state.autoUpdateTimerId);
        }

        state.updateInProgressToPresent();

        const timerId = setInterval(() => {
          state.updateInProgressToPresent();
        }, 60000);

        set({ autoUpdateTimerId: timerId });
      },

      stopAutoUpdateTimer: () => {
        const state = get();
        if (state.autoUpdateTimerId) {
          clearInterval(state.autoUpdateTimerId);
          set({ autoUpdateTimerId: null });
        }
      },
    }),
    {
      name: "attendance-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        attendanceRecords: state.attendanceRecords,
        lastAttendanceUpdate: state.lastAttendanceUpdate,
        userLocationType: state.userLocationType,
        fieldTripDates: state.fieldTripDates,
        currentSessionType: state.currentSessionType,
        canCheckout: state.canCheckout,
        department: state.department,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.lastAttendanceUpdate = Date.now();
          if (state.userId) {
            setTimeout(() => {
              state.fetchUserLocationSettings();
              state.fetchUserDepartment();
            }, 1000);
          }
        }
      },
    }
  )
);