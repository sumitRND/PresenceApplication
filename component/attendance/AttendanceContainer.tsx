import React, { useEffect, useState } from "react";
import { Alert, AppState, FlatList, ListRenderItem } from "react-native";

import { useCamera } from "@/hooks/useCamera";
import { useGeofence } from "@/hooks/useGeofence";
import { useAttendanceStore } from "@/store/attendanceStore";
import { useAuthStore } from "@/store/authStore";

import { attendanceContainerStyles, globalStyles } from "@/constants/style";

import {
  getCachedHolidays,
  Holiday,
} from "@/services/attendanceCalendarService";
import { attendanceValidation } from "@/services/attendanceValidationService";
import { AudioRecorder } from "../audio/AudioRecorder";
import { CameraView } from "../camera/CameraView";
import { ExpandedMapView } from "../map/ExpandedMapView";
import { GeofenceMap } from "../map/GeofenceMap";
import { MapCard } from "../map/MapCard";
import { LoadingScreen } from "../ui/LoadingScreen";
import { HolidayScreen } from "./HolidayScreen";
import { HomeView } from "./HomeView";

type ListItem = { id: string; type: "map" | "attendance" };

export function AttendanceContainer() {
  const {
    userId,
    isLoadingUserId,
    isInitialized,
    photos,
    audioRecording,
    currentView,
    uploading,
    currentPhotoIndex,
    retakeMode,
    TOTAL_PHOTOS,
    initializeUserId,
    setPhotos,
    setAudioRecording,
    setCurrentView,
    setCurrentPhotoIndex,
    setRetakeMode,
    setUploading,
    resetAll,
    todayAttendanceMarked,
    checkTodayAttendance,
    userLocationType,
    isFieldTrip,
    checkFieldTripStatus,
  } = useAttendanceStore();

  const { session, userName } = useAuthStore();
  const camera = useCamera();

  const [showExpandedMap, setShowExpandedMap] = useState(false);
  const [isMapTouched, setIsMapTouched] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayInfo, setHolidayInfo] = useState<Holiday | null>(null);
  const [checkingHoliday, setCheckingHoliday] = useState(true);

  const geofence = useGeofence(userLocationType, isFieldTrip);

  useEffect(() => {
    const checkHolidayStatus = async () => {
      try {
        setCheckingHoliday(true);
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;

        const dayOfWeek = today.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          setIsHoliday(true);
          setHolidayInfo({
            date: today.toISOString().split("T")[0],
            description: dayOfWeek === 0 ? "Sunday" : "Saturday",
            isHoliday: true,
            isWeekend: true,
          });
          setCheckingHoliday(false);
          return;
        }

        const holidays = await getCachedHolidays(year, month);
        const todayString = today.toISOString().split("T")[0];
        const todayHoliday = holidays.find((h) => h.date === todayString);

        if (todayHoliday) {
          setIsHoliday(true);
          setHolidayInfo(todayHoliday);
        } else {
          setIsHoliday(false);
          setHolidayInfo(null);
        }
      } catch (error) {
        console.error("Error checking holiday status:", error);
        setIsHoliday(false);
        setHolidayInfo(null);
      } finally {
        setCheckingHoliday(false);
      }
    };

    if (session && userName) {
      checkHolidayStatus();
    }
  }, [session, userName]);

  useEffect(() => {
    if (session && userName && !isInitialized) {
      initializeUserId();
    }
  }, [session, userName, isInitialized, initializeUserId]);

  useEffect(() => {
    checkFieldTripStatus();
  }, [checkFieldTripStatus]);

  useEffect(() => {
    checkTodayAttendance();
  }, [checkTodayAttendance]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && session && userName) {
        checkFieldTripStatus();
      }
    });

    return () => subscription?.remove();
  }, [session, userName, checkFieldTripStatus]);

const handleUpload = async () => {
  const userCoordinates = geofence.userPos;

  if (!userCoordinates) {
    Alert.alert(
      "Error",
      "Unable to get your current location. Please ensure location services are enabled."
    );
    return;
  }

  const { department, userLocationType } = useAttendanceStore.getState();

  if (!department && userLocationType === "CAMPUS") {
    Alert.alert(
      "Error",
      "Department information not found. Please contact support."
    );
    return;
  }

  const finalLocation = attendanceValidation.getLocationStatus(
    userCoordinates,
    department || "",
    userLocationType
  );

  const { employeeNumber } = useAuthStore.getState();

  if (!employeeNumber) {
    Alert.alert("Error", "Please login to mark attendance");
    return;
  }

  setUploading(true);
  try {
    const { uploadAttendanceData } = await import("@/services/attendanceService");
    const result = await uploadAttendanceData({
      employeeNumber: employeeNumber,
      photos,
      audioRecording: audioRecording || undefined,
      location: finalLocation,
      latitude: userCoordinates?.lat,
      longitude: userCoordinates?.lng,
    });

    if (result.success) {
      const { markAttendanceForToday } = useAttendanceStore.getState();
      markAttendanceForToday(finalLocation);
      await useAttendanceStore.getState().fetchTodayAttendanceFromServer();

      Alert.alert("Success", "Attendance recorded!", [
        { text: "OK", onPress: resetAll },
      ]);
    } else {
      if (result.error === "Session expired. Please login again.") {
        Alert.alert(
          "Session Expired",
          "Your session has expired. Please login again.",
          [
            {
              text: "OK",
              onPress: () => {
                useAuthStore.getState().signOut();
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", result.error ?? "Upload failed");
      }
    }
  } catch (error) {
    console.error("Upload error:", error);
    Alert.alert("Error", "Upload error");
  } finally {
    setUploading(false);
  }
};


  // Add a helper function to show location status
  const getLocationStatusMessage = () => {
    if (!geofence.userPos || !useAttendanceStore.getState().department) {
      return null;
    }

    const { department, userLocationType } = useAttendanceStore.getState();
    const status = attendanceValidation.getLocationStatus(
      geofence.userPos,
      department || "",
      userLocationType
    );

    const timeCheck = attendanceValidation.isWithinWorkingHours();

    return {
      location: status,
      timeStatus: timeCheck.timeInfo,
      canMarkAttendance: timeCheck.isValid,
    };
  };

  const mapComponent = React.useMemo(
    () => (
      <GeofenceMap
        html={geofence.html}
        userPos={geofence.userPos}
        initialPos={geofence.initialPos}
        isInitialized={geofence.isInitialized}
        mapShapes={geofence.mapShapes}
        mapLayers={geofence.mapLayers}
        mapMarkers={geofence.mapMarkers}
        mapCenter={geofence.mapCenter}
      />
    ),
    [geofence]
  );

  if (isLoadingUserId || checkingHoliday)
    return <LoadingScreen text="Loading..." />;
  if (isInitialized && !userId)
    return (
      <LoadingScreen text="Please login to continue" subtext="Redirecting..." />
    );
  if (uploading)
    return <LoadingScreen text="Uploading..." subtext="Please wait" />;

  if (isHoliday && holidayInfo) {
    return <HolidayScreen holidayInfo={holidayInfo} />;
  }

  if (showExpandedMap)
    return (
      <ExpandedMapView
        onClose={() => setShowExpandedMap(false)}
        mapComponent={mapComponent}
      />
    );

  switch (currentView) {
    case "audioRecorder":
      return (
        <AudioRecorder
          onBack={() => setCurrentView("home")}
          onRecordingComplete={(rec) => {
            setAudioRecording(rec);
            setCurrentView("home");
          }}
        />
      );
    case "camera":
      return (
        <CameraView
          camera={camera}
          currentPhotoIndex={currentPhotoIndex}
          retakeMode={retakeMode}
          totalPhotos={TOTAL_PHOTOS}
          onPhotoTaken={(photo) => {
            const next = [...photos];
            next[currentPhotoIndex] = photo;
            setPhotos(next);
            setCurrentView("home");
            setRetakeMode(false);
          }}
          onBack={() => {
            setCurrentView("home");
            setRetakeMode(false);
          }}
        />
      );
    default:
      const data: ListItem[] = [
        { id: "map", type: "map" },
        { id: "attendance", type: "attendance" },
      ];

      const renderItem: ListRenderItem<ListItem> = ({ item }) => {
        switch (item.type) {
          case "map":
            return (
              <MapCard
                onExpand={() => setShowExpandedMap(true)}
                mapComponent={mapComponent}
                onMapTouchStart={() => setIsMapTouched(true)}
                onMapTouchEnd={() => setIsMapTouched(false)}
              />
            );
          case "attendance":
            return (
              <HomeView
                photos={photos}
                audioRecording={audioRecording}
                onTakePhotos={() => {
                  const { generateNewPhotoPosition } =
                    useAttendanceStore.getState();
                  generateNewPhotoPosition();
                  setCurrentPhotoIndex(0);
                  setRetakeMode(false);
                  setCurrentView("camera");
                }}
                onRetakePhoto={(idx) => {
                  setCurrentPhotoIndex(idx);
                  setRetakeMode(true);
                  setCurrentView("camera");
                }}
                onRetakeAll={() => {
                  resetAll();
                  setCurrentView("camera");
                }}
                onRecordAudio={() => setCurrentView("audioRecorder")}
                onUpload={handleUpload}
                uploading={uploading}
                totalPhotos={TOTAL_PHOTOS}
                todayAttendanceMarked={todayAttendanceMarked}
              />
            );
          default:
            return null;
        }
      };

      return (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(i) => i.id}
          style={[globalStyles.container, attendanceContainerStyles.container]}
          contentContainerStyle={attendanceContainerStyles.contentContainer}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isMapTouched}
        />
      );
  }
}