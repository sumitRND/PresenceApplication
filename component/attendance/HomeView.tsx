import { brutalistColors, colors } from "@/constants/colors";
import { homeViewStyles } from "@/constants/style";
import { useGeofence } from "@/hooks/useGeofence";
import { checkoutAttendance } from "@/services/attendanceService";
import {
  attendanceValidation,
  ValidationResult,
} from "@/services/attendanceValidationService";
import { useAuthStore } from "@/store/authStore";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { CameraCapturedPicture } from "expo-camera";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAttendanceStore } from "../../store/attendanceStore";
import { AudioRecording } from "../../types/attendance";
import { ActionButtons } from "./ActionButton";
import { AudioSection } from "./AudioSection";
import { PhotoGrid } from "./PhotoGrid";

interface HomeViewProps {
  photos: CameraCapturedPicture[];
  audioRecording: AudioRecording | null;
  onTakePhotos: () => void;
  onRetakePhoto: (index: number) => void;
  onRetakeAll: () => void;
  onRecordAudio: () => void;
  onUpload: () => void;
  uploading: boolean;
  totalPhotos: number;
  todayAttendanceMarked?: boolean;
}


function ValidationErrorCard({ reason }: { reason: string }) {
  return (
    <View style={homeViewStyles.validationErrorCard}>
      <FontAwesome6
        name="question-circle"
        size={20}
        color={brutalistColors.error}
      />
      <Text style={homeViewStyles.validationErrorText}>{reason}</Text>
    </View>
  );
}

function LocationStatusCard({
  details,
  department,
  userLocationType,
}: {
  details: ValidationResult["details"];
  department: string | null;
  userLocationType: "CAMPUS" | "FIELDTRIP" | null;
}) {
  if (!details) return null;

  return (
    <View style={homeViewStyles.locationStatusCard}>
      <View style={homeViewStyles.statusRow}>
        <FontAwesome6
          name="clock"
          size={16}
          color={
            details.isWithinWorkingHours
              ? brutalistColors.black
              : brutalistColors.error
          }
        />
        <Text
          style={[
            homeViewStyles.statusText,
            !details.isWithinWorkingHours && { color: brutalistColors.error },
          ]}
        >
          {details.currentSession === "OUTSIDE"
            ? "Outside Working Hours"
            : `${details.currentSession} Session`}
        </Text>
      </View>

      {userLocationType === "CAMPUS" && (
        <>
          <View style={homeViewStyles.statusRow}>
            <FontAwesome6
              name="university"
              size={16}
              color={
                details.isInsideIIT
                  ? brutalistColors.black
                  : brutalistColors.error
              }
            />
            <Text
              style={[
                homeViewStyles.statusText,
                !details.isInsideIIT && { color: brutalistColors.error },
              ]}
            >
              {details.isInsideIIT
                ? "Inside IIT Guwahati"
                : "Outside IIT Guwahati"}
            </Text>
          </View>

          <View style={homeViewStyles.statusRow}>
            <FontAwesome6
              name="building"
              size={16}
              color={
                details.isInsideDepartment
                  ? brutalistColors.black
                  : brutalistColors.error
              }
            />
            <Text
              style={[
                homeViewStyles.statusText,
                !details.isInsideDepartment && { color: brutalistColors.error },
              ]}
            >
              {details.isInsideDepartment
                ? `Inside ${department}`
                : `Outside ${department}`}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

function SessionTimeIndicator() {
  const [currentSession, setCurrentSession] = useState<
    "FORENOON" | "AFTERNOON" | "OUTSIDE"
  >("OUTSIDE");

  useEffect(() => {
    const updateSession = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeInMinutes = hours * 60 + minutes;

      if (timeInMinutes >= 570 && timeInMinutes < 780) {
        setCurrentSession("FORENOON");
      } else if (timeInMinutes >= 780 && timeInMinutes <= 1050) {
        setCurrentSession("AFTERNOON");
      } else {
        setCurrentSession("OUTSIDE");
      }
    };

    updateSession();
    const interval = setInterval(updateSession, 60000);

    return () => clearInterval(interval);
  }, []);

  const getSessionColor = () => {
    switch (currentSession) {
      case "FORENOON":
        return brutalistColors.black;
      case "AFTERNOON":
        return brutalistColors.black;
      default:
        return colors.black;
    }
  };

  const getSessionText = () => {
    switch (currentSession) {
      case "FORENOON":
        return "Forenoon Session";
      case "AFTERNOON":
        return "Afternoon Session";
      default:
        return "Outside Working Hours";
    }
  };

  return (
    <View style={[homeViewStyles.sessionIndicator, { borderColor: getSessionColor() }]}>
      <FontAwesome6 name="clock" size={14} color={getSessionColor()} />
      <Text style={[homeViewStyles.sessionText, { color: getSessionColor() }]}>
        {getSessionText()}
      </Text>
    </View>
  );
}

function CheckoutButton({
  onCheckout,
  disabled,
  isCheckedOut = false,
}: {
  onCheckout: () => void;
  disabled: boolean;
  isCheckedOut?: boolean;
}) {
  const currentHour = new Date().getHours();
  const isAfter11PM = currentHour >= 23;

  const isButtonDisabled = isCheckedOut || isAfter11PM || disabled;

  return (
    <View style={homeViewStyles.checkoutButtonContainer}>
      <Pressable
        style={({ pressed }) => [
          homeViewStyles.checkoutButton,
          isButtonDisabled && homeViewStyles.buttonDisabled,
          isCheckedOut && homeViewStyles.checkedOutButton,
          isAfter11PM && homeViewStyles.autoCompletedButton,
          {
            transform: [
              {
                scale: pressed && !isButtonDisabled ? 0.98 : 1,
              },
            ],
            shadowColor: isButtonDisabled
              ? brutalistColors.gray
              : isCheckedOut
                ? brutalistColors.success
                : brutalistColors.error,
          },
        ]}
        onPress={onCheckout}
        disabled={isButtonDisabled}
        android_ripple={{
          color: isButtonDisabled
            ? brutalistColors.gray
            : brutalistColors.error,
          borderless: false,
        }}
      >
        {/* Only show icon for non-checked-out states */}
        {!isCheckedOut && (
          <FontAwesome6
            name={isAfter11PM ? "clock" : "arrow-right-to-bracket"}
            size={20}
            color={
              isButtonDisabled ? brutalistColors.gray : brutalistColors.error
            }
            style={{ marginRight: 10 }}
          />
        )}
        <Text
          style={[
            homeViewStyles.checkoutButtonText,
            {
              color: isButtonDisabled
                ? brutalistColors.gray
                : isCheckedOut
                  ? brutalistColors.success
                  : brutalistColors.error,
            },
          ]}
        >
          {isCheckedOut
            ? "Checked Out"
            : isAfter11PM
              ? "Auto-completed"
              : "Check Out"}
        </Text>
      </Pressable>
    </View>
  );
}

function AttendanceStatusCard({ attendance }: { attendance: any }) {
  const currentHour = new Date().getHours();
  const shouldShowAsPresent = currentHour >= 23 && !attendance.isCheckedOut;

  const getAttendanceTypeColor = () => {
    if (!attendance.isCheckedOut && !shouldShowAsPresent)
      return brutalistColors.warning;
    return attendance.attendanceType === "FULL_DAY"
      ? brutalistColors.success
      : brutalistColors.black;
  };

  const getStatusText = () => {
    if (!attendance.isCheckedOut && !shouldShowAsPresent) {
      const sessionText =
        attendance.sessionType === "FORENOON"
          ? "Forenoon"
          : attendance.sessionType === "AFTERNOON"
            ? "Afternoon"
            : "Unknown";
      return `Checked in - ${sessionText} Session`;
    }

    if (shouldShowAsPresent && !attendance.isCheckedOut) {
      return "Present (Auto-completed at 11 PM)";
    }

    return `${
      attendance.attendanceType === "FULL_DAY" ? "Full Day" : "Half Day"
    } Completed`;
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "Invalid Date";
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Invalid Date";
    }
  };

  return (
    <View
      style={[homeViewStyles.statusCard, { borderColor: getAttendanceTypeColor() }]}
    >
      <View style={homeViewStyles.statusHeader}>
        <FontAwesome6
          name={
            attendance.isCheckedOut || shouldShowAsPresent
              ? "check-circle"
              : "clock"
          }
          size={20}
          color={getAttendanceTypeColor()}
        />
        <Text style={[homeViewStyles.statusTitle, { color: getAttendanceTypeColor() }]}>
          {getStatusText()}
        </Text>
      </View>
      <View style={homeViewStyles.statusDetails}>
        <View style={homeViewStyles.statusRow}>
          <Text style={homeViewStyles.statusLabel}>Check-in:</Text>
          <Text style={homeViewStyles.statusValue}>
            {formatTime(attendance.checkInTime)}
          </Text>
        </View>
        {attendance.checkOutTime && (
          <View style={homeViewStyles.statusRow}>
            <Text style={homeViewStyles.statusLabel}>Check-out:</Text>
            <Text style={homeViewStyles.statusValue}>
              {formatTime(attendance.checkOutTime)}
            </Text>
          </View>
        )}
        {shouldShowAsPresent && !attendance.checkOutTime && (
          <View style={homeViewStyles.statusRow}>
            <Text style={homeViewStyles.statusLabel}>Auto-completed:</Text>
            <Text style={homeViewStyles.statusValue}>11:00 PM</Text>
          </View>
        )}
        <View style={homeViewStyles.statusRow}>
          <Text style={homeViewStyles.statusLabel}>Location:</Text>
          <Text
            style={homeViewStyles.statusValue}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {attendance.takenLocation || "N/A"}
          </Text>
        </View>
      </View>
    </View>
  );
}

function AttendanceMarkedCard({
  todayRecord,
  onCheckout,
}: {
  todayRecord: any;
  onCheckout: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(150).springify()}
      style={homeViewStyles.attendanceMarkedCard}
    >
      <View style={homeViewStyles.attendanceMarkedContent}>
        <View style={homeViewStyles.attendanceMarkedIcon}>
          <FontAwesome6
            name="circle-check"
            size={32}
            color={brutalistColors.black}
          />
        </View>
        <View style={homeViewStyles.attendanceMarkedText}>
          <Text style={homeViewStyles.attendanceMarkedTitle}>ATTENDANCE MARKED!</Text>
          <Text style={homeViewStyles.attendanceMarkedSubtitle}>
            You&apos;ve already marked your attendance for today
          </Text>
          <Text style={homeViewStyles.attendanceMarkedTime}>
            {new Date().toLocaleDateString("en", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>
      </View>

      <SessionTimeIndicator />

      {todayRecord && <AttendanceStatusCard attendance={todayRecord} />}

      {todayRecord && (
        <CheckoutButton
          onCheckout={onCheckout}
          disabled={false}
          isCheckedOut={todayRecord.isCheckedOut}
        />
      )}
    </Animated.View>
  );
}

export function HomeView({
  photos,
  audioRecording,
  onTakePhotos,
  onRetakePhoto,
  onRetakeAll,
  onRecordAudio,
  onUpload,
  uploading,
  totalPhotos,
  todayAttendanceMarked = false,
}: HomeViewProps) {
  const { userLocationType, department } = useAttendanceStore();
  const geofence = useGeofence(userLocationType);
  const [validationStatus, setValidationStatus] =
    useState<ValidationResult | null>(null);

  useEffect(() => {
    const checkValidation = () => {
      if (geofence.userPos && department) {
        const validation = attendanceValidation.validateAttendance(
          geofence.userPos,
          department,
          userLocationType,
        );
        setValidationStatus(validation);
      }
    };

    checkValidation();
    const interval = setInterval(checkValidation, 30000);

    return () => clearInterval(interval);
  }, [geofence.userPos, department, userLocationType]);

  const attendanceRecords = useAttendanceStore(
    (state) => state.attendanceRecords,
  );

  const todayDateString = new Date().toISOString().split("T")[0];
  const todayRecord = attendanceRecords.find(
    (record) => record.date === todayDateString,
  );

  useEffect(() => {
    const refreshAttendanceStatus = async () => {
      if (useAttendanceStore.getState().userId) {
        await useAttendanceStore.getState().fetchTodayAttendanceFromServer();
      }
    };
    refreshAttendanceStatus();
  }, []);

  const handleCheckout = async () => {
    Alert.alert(
      "CHECKOUT CONFIRMATION",
      "Are you sure you want to checkout? This will complete your attendance for today.",
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "CHECKOUT",
          onPress: async () => {
            try {
              const { employeeNumber } = useAuthStore.getState();
              if (!employeeNumber) {
                Alert.alert("Error", "Please login to checkout");
                return;
              }
              const result = await checkoutAttendance(employeeNumber);
              if (result.success) {
                Alert.alert("Success", "Checkout successful!");
                await useAttendanceStore
                  .getState()
                  .fetchTodayAttendanceFromServer();
              } else {
                Alert.alert("Error", result.error || "Checkout failed");
              }
            } catch (error) {
              console.error("Checkout failed:", error);
              Alert.alert("Error", "Failed to checkout. Please try again.");
            }
          },
        },
      ],
    );
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "Invalid Date";
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Invalid Date";
    }
  };

  if (todayAttendanceMarked && todayRecord) {
    return (
      <ScrollView style={homeViewStyles.container} showsVerticalScrollIndicator={false}>
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={homeViewStyles.headerCard}
        >
          <View style={homeViewStyles.headerContent}>
            <View style={homeViewStyles.headerTextContainer}>
              <Text style={homeViewStyles.greeting}>GOOD {getTimeOfDay()}!</Text>
              <Text style={homeViewStyles.headerTitle}>ATTENDANCE STATUS</Text>
              <Text style={homeViewStyles.headerSubtitle}>
                {userLocationType === "FIELDTRIP"
                  ? "📍 OUTSIDE IIT (FIELD TRIP)"
                  : "📍 IIT GUWAHATI - DEPARTMENT BUILDING"}
              </Text>
              <View style={homeViewStyles.locationTypeBadge}>
                <Text style={homeViewStyles.locationTypeText}>
                  MODE:{" "}
                  {userLocationType === "FIELDTRIP" ? "FIELD TRIP" : "ABSOLUTE"}
                </Text>
              </View>
            </View>
            <View style={homeViewStyles.headerIcon}>
              <FontAwesome6
                name="calendar-check"
                size={40}
                color={brutalistColors.black}
              />
            </View>
          </View>
        </Animated.View>

        <AttendanceMarkedCard
          todayRecord={todayRecord}
          onCheckout={handleCheckout}
        />

        {todayRecord.isCheckedOut && (
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={homeViewStyles.sectionCard}
          >
            <View style={homeViewStyles.sectionHeader}>
              <FontAwesome6
                name="circle-info"
                size={20}
                color={brutalistColors.black}
              />
              <Text style={homeViewStyles.sectionTitle}>TODAY&apos;S SUMMARY</Text>
            </View>
            <Text style={homeViewStyles.sectionDescription}>
              Your attendance has been successfully recorded and completed for
              today.
            </Text>

            <View style={homeViewStyles.summaryRow}>
              <View style={homeViewStyles.summaryItem}>
                <FontAwesome6
                  name="clock"
                  size={16}
                  color={brutalistColors.gray}
                />
                <Text style={homeViewStyles.summaryText}>
                  Checked in at {formatTime(todayRecord.checkInTime ?? null)}
                </Text>
              </View>
              <View style={homeViewStyles.summaryItem}>
                <FontAwesome6
                  name="clock"
                  size={16}
                  color={brutalistColors.gray}
                />
                <Text style={homeViewStyles.summaryText}>
                  Checked out at {formatTime(todayRecord.checkOutTime ?? null)}
                </Text>
              </View>
              <View style={homeViewStyles.summaryItem}>
                <FontAwesome6
                  name="location-dot"
                  size={16}
                  color={brutalistColors.gray}
                />
                <Text style={homeViewStyles.summaryText}>
                  {todayRecord.takenLocation || "Location not recorded"}
                </Text>
              </View>
              <View style={homeViewStyles.summaryItem}>
                <FontAwesome6
                  name="calendar"
                  size={16}
                  color={brutalistColors.gray}
                />
                <Text style={homeViewStyles.summaryText}>
                  {todayRecord.attendanceType === "FULL_DAY"
                    ? "Full Day"
                    : "Half Day"}{" "}
                  attendance
                </Text>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={homeViewStyles.container} showsVerticalScrollIndicator={false}>
      <Animated.View
        entering={FadeInDown.delay(100).springify()}
        style={homeViewStyles.headerCard}
      >
        <View style={homeViewStyles.headerContent}>
          <View style={homeViewStyles.headerTextContainer}>
            <Text style={homeViewStyles.greeting}>GOOD {getTimeOfDay()}!</Text>
            <Text style={homeViewStyles.headerTitle}>MARK YOUR ATTENDANCE</Text>
          </View>
          <View style={homeViewStyles.headerIcon}>
            <FontAwesome6
              name="calendar-check"
              size={40}
              color={brutalistColors.black}
            />
          </View>
        </View>

        {validationStatus?.details && (
          <>
            {!validationStatus.isValid && (
              <View style={homeViewStyles.cannotMarkBanner}>
                <FontAwesome6
                  name="exclamation-triangle"
                  size={16}
                  color={brutalistColors.black}
                />
                <Text style={homeViewStyles.cannotMarkBannerText}>
                  CANNOT MARK ATTENDANCE
                </Text>
              </View>
            )}

            <LocationStatusCard
              details={validationStatus.details}
              department={department}
              userLocationType={userLocationType}
            />
          </>
        )}

        {validationStatus &&
          !validationStatus.isValid &&
          validationStatus.reason && (
            <ValidationErrorCard reason={validationStatus.reason} />
          )}

        <View style={homeViewStyles.statsRow}>
          <View style={homeViewStyles.statItem}>
            <Text style={homeViewStyles.statValue}>
              {photos.length}/{totalPhotos}
            </Text>
            <Text style={homeViewStyles.statLabel}>PHOTO</Text>
          </View>
          <View style={homeViewStyles.statDivider} />
          <View style={homeViewStyles.statItem}>
            <Text style={homeViewStyles.statValue}>{audioRecording ? "✓" : "−"}</Text>
            <Text style={homeViewStyles.statLabel}>AUDIO</Text>
          </View>
          <View style={homeViewStyles.statDivider} />
          <View style={homeViewStyles.statItem}>
            <Text style={homeViewStyles.statValue}>{new Date().getDate()}</Text>
            <Text style={homeViewStyles.statLabel}>
              {new Date()
                .toLocaleDateString("en", { month: "short" })
                .toUpperCase()}
            </Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(200).springify()}
        style={homeViewStyles.sectionCard}
      >
        <View style={homeViewStyles.sectionHeader}>
          <FontAwesome6 name="camera" size={20} color={brutalistColors.black} />
          <Text style={homeViewStyles.sectionTitle}>PHOTO VERIFICATION</Text>
        </View>
        <Text style={homeViewStyles.sectionDescription}>
          Capture today&apos;s required photo for attendance verification
        </Text>
        <PhotoGrid
          photos={photos}
          onRetakePhoto={onRetakePhoto}
          onTakePhoto={onTakePhotos}
          totalPhotos={totalPhotos}
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).springify()}
        style={homeViewStyles.sectionCard}
      >
        <View style={homeViewStyles.sectionHeader}>
          <FontAwesome6
            name="microphone"
            size={20}
            color={brutalistColors.black}
          />
          <Text style={homeViewStyles.sectionTitle}>VOICE VERIFICATION</Text>
        </View>
        <Text style={homeViewStyles.sectionDescription}>
          Record your voice saying today&apos;s date
        </Text>
        <AudioSection
          audioRecording={audioRecording}
          onRecordAudio={onRecordAudio}
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(400).springify()}
        style={homeViewStyles.actionSection}
      >
        <ActionButtons
          photos={photos}
          audioRecording={audioRecording}
          onTakePhotos={onTakePhotos}
          onRetakeAll={onRetakeAll}
          onUpload={onUpload}
          uploading={uploading}
          totalPhotos={totalPhotos}
          canSubmit={validationStatus?.isValid || false}
        />
      </Animated.View>
    </ScrollView>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "MORNING";
  if (hour < 17) return "AFTERNOON";
  return "EVENING";
}

