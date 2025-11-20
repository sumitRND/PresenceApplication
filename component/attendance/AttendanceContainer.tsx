import React, { useEffect, useState } from "react";
import { Alert, AppState, FlatList, ListRenderItem } from "react-native";

import { useGeofence } from "../../hooks/useGeofence";
import { validationService } from "../../services/attendanceValidationService";
import { getHolidays, Holiday } from "../../services/userServices";
import { useAttendanceStore } from "../../store/attendanceStore";
import { useAuthStore } from "../../store/authStore";

import { attendanceContainerStyles, globalStyles } from "@/constants/style";
import { AudioRecorder } from "../audio/AudioRecorder";
import { CameraView } from "../camera/CameraView";
import { ExpandedMapView } from "../map/ExpandedMapView";
import { GeofenceMap } from "../map/GeofenceMap";
import { MapCard } from "../map/MapCard";
import { HolidayScreen } from "./HolidayScreen";
import { HomeView } from "./HomeView";

import { BrutalistLoading } from "../ui/BrutalistLoadingAndError";

type ListItem = { id: string; type: "map" | "attendance" };

export function AttendanceContainer() {
  const {
    employeeNumber,
    isLoading,
    isInitialized,
    photos,
    audioRecording,
    currentView,
    uploading,
    currentPhotoIndex,
    retakeMode,
    setPhotos,
    setAudioRecording,
    setCurrentView,
    setCurrentPhotoIndex,
    setRetakeMode,
    setUploading,
    resetSession,
    todayAttendanceMarked,
    fetchTodayAttendance,
    userLocationType,
    fetchLocationSettings,
  } = useAttendanceStore();

  const { isAuthenticated, username } = useAuthStore();

  const [showExpandedMap, setShowExpandedMap] = useState(false);
  const [isMapTouched, setIsMapTouched] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayInfo, setHolidayInfo] = useState<Holiday | null>(null);
  const [checkingHoliday, setCheckingHoliday] = useState(true);

  const geofence = useGeofence(userLocationType);

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

        const holidays = await getHolidays(year, month);
        const todayString = today.toISOString().split("T")[0];
        const todayHoliday = holidays.find((h) => h.date === todayString);

        if (todayHoliday) {
          setIsHoliday(true);
          setHolidayInfo(todayHoliday);
        } else {
          setIsHoliday(false);
          setHolidayInfo(null);
        }
      } catch {
        setIsHoliday(false);
        setHolidayInfo(null);
      } finally {
        setCheckingHoliday(false);
      }
    };

    if (isAuthenticated && username) {
      checkHolidayStatus();
    }
  }, [isAuthenticated, username]);

  useEffect(() => {
    if (isAuthenticated && username && !isInitialized) {}
  }, [isAuthenticated, username, isInitialized]);

  useEffect(() => {
    fetchLocationSettings();
  }, [fetchLocationSettings]);

  useEffect(() => {
    fetchTodayAttendance();
  }, [fetchTodayAttendance]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active" && isAuthenticated && username) {
        fetchLocationSettings();
      }
    });

    return () => subscription?.remove();
  }, [isAuthenticated, username, fetchLocationSettings]);

  const handleUpload = async () => {
    const userCoordinates = await geofence.captureLocationForAttendance();
    if (!userCoordinates) return;

    const { department, userLocationType } = useAttendanceStore.getState();

    if (!department && userLocationType === "CAMPUS") {
      Alert.alert("Error", "Department information not found. Please contact support.");
      return;
    }

    const validationResult = validationService.validateAttendance(
      { lat: userCoordinates.latitude, lng: userCoordinates.longitude },
      department || "",
      userLocationType
    );

    if (!validationResult.isValid) {
      Alert.alert("Error", validationResult.reason || "Validation failed");
      return;
    }

    const finalLocation = validationResult.details.userLocation;
    const { employeeNumber } = useAuthStore.getState();

    if (!employeeNumber) {
      Alert.alert("Error", "Please login to mark attendance");
      return;
    }

    setUploading(true);
    try {
      const { markAttendance } = useAttendanceStore.getState();
      await markAttendance(finalLocation, userCoordinates.latitude, userCoordinates.longitude);

      Alert.alert("Success", "Attendance recorded!", [
        { text: "OK", onPress: resetSession },
      ]);
    } catch (error: any) {
      if (error.message === "Session expired") {
        Alert.alert("Session Expired", "Your session has expired. Please login again.", [
          { text: "OK", onPress: () => useAuthStore.getState().signOut() },
        ]);
      } else {
        Alert.alert("Error", error.message ?? "Upload failed");
      }
    } finally {
      setUploading(false);
    }
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

  if (isLoading || checkingHoliday) {
    return <BrutalistLoading text="LOADING..." />;
  }

  if (isInitialized && !employeeNumber) {
    return (
      <BrutalistLoading
        text="PLEASE LOGIN"
        subtext="Redirecting to login..."
      />
    );
  }

  if (uploading) {
    return (
      <BrutalistLoading
        text="UPLOADING ATTENDANCE..."
        subtext="Please wait, this may take a moment"
      />
    );
  }

  if (isHoliday && holidayInfo) {
    return <HolidayScreen holidayInfo={holidayInfo} />;
  }

  if (showExpandedMap) {
    return (
      <ExpandedMapView
        onClose={() => setShowExpandedMap(false)}
        mapComponent={mapComponent}
      />
    );
  }

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
          currentPhotoIndex={currentPhotoIndex}
          retakeMode={retakeMode}
          totalPhotos={1}
          onPhotoTaken={(photo) => {
            setPhotos([photo]);
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
                  resetSession();
                  setCurrentView("camera");
                }}
                onRecordAudio={() => setCurrentView("audioRecorder")}
                onDeleteAudio={() => setAudioRecording(null)}
                onUpload={handleUpload}
                uploading={uploading}
                totalPhotos={1}
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
