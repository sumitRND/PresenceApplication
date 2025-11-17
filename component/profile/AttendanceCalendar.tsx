import { brutalistColors, colors } from "@/constants/colors";
import { attendanceCalendarStyles } from "@/constants/style";
import {
  AttendanceDate,
  AttendanceStatistics,
  getAttendanceCalendar,
  getCachedHolidays,
  Holiday,
} from "@/services/attendanceCalendarService";
import { useAttendanceStore } from "@/store/attendanceStore";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useFocusEffect } from "@react-navigation/native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Calendar } from "react-native-calendars";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";


interface AttendanceCalendarProps {
  employeeCode: string;
}

const BrutalistCard: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => (
  <View style={attendanceCalendarStyles.brutalistCardWrapper}>
    <View style={[attendanceCalendarStyles.brutalistCard, style]}>{children}</View>
  </View>
);

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  employeeCode,
}) => {
  const [loading, setLoading] = useState(true);
  const [attendanceDates, setAttendanceDates] = useState<AttendanceDate[]>([]);
  const [statistics, setStatistics] = useState<AttendanceStatistics | null>(
    null,
  );
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [markedDates, setMarkedDates] = useState<any>({});
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const isChangingMonth = useRef(false);
  const attendanceRecords = useAttendanceStore(
    (state) => state.attendanceRecords,
  );
  const todayAttendanceMarked = useAttendanceStore(
    (state) => state.todayAttendanceMarked,
  );
  const { fieldTripDates } = useAttendanceStore();

  const isWorkingDay = (dateStr: string, holidays: Holiday[]): boolean => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidays.some((h) => h.date === dateStr);
    return !isWeekend && !isHoliday;
  };

const fetchAttendanceData = useCallback(
  async (showLoading = true) => {
    console.log('🚀 fetchAttendanceData called', {
      showLoading,
      isChangingMonth: isChangingMonth.current,
      employeeCode,
      selectedYear,
      selectedMonth,
      holidaysCount: holidays.length
    });
    
    try {
      if (showLoading && !isChangingMonth.current) {
        console.log('⏳ Setting loading to true');
        setLoading(true);
      }

      console.log('📡 Calling getAttendanceCalendar...');
      const startTime = Date.now();
      
      const response = await getAttendanceCalendar(
        employeeCode,
        selectedYear,
        selectedMonth,
      );
      
      const responseTime = Date.now() - startTime;
      console.log(`📊 Response received in ${responseTime}ms:`, {
        success: response.success,
        hasData: !!response.data,
        error: response.error
      });

      if (response.success && response.data) {
        const attendances = response.data.attendances;
        console.log(`✅ Got ${attendances.length} attendance records`);

        // Create a map for quick lookup
        const attendanceMap = new Map(attendances.map((a) => [a.date, a]));
        console.log('📍 Attendance map created with dates:', Array.from(attendanceMap.keys()));

        // Calculate days in month
        const daysInMonth = new Date(
          selectedYear,
          selectedMonth,
          0,
        ).getDate();
        console.log(`📅 Days in month ${selectedMonth}/${selectedYear}: ${daysInMonth}`);
        
        const allDatesInMonth: AttendanceDate[] = [];
        const today = new Date().toISOString().split("T")[0];
        console.log(`📆 Today's date: ${today}`);

        let presentCount = 0;
        let absentCount = 0;
        let skippedFuture = 0;
        let skippedWeekendHoliday = 0;

        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

          // Skip future dates
          if (dateStr > today) {
            skippedFuture++;
            continue;
          }

          const existingAttendance = attendanceMap.get(dateStr);

          if (existingAttendance) {
            allDatesInMonth.push(existingAttendance);
            presentCount++;
            console.log(`✅ Found attendance for ${dateStr}:`, {
              checkin: existingAttendance.attendance?.checkinTime,
              checkout: existingAttendance.attendance?.checkoutTime,
              isCheckout: existingAttendance.attendance?.isCheckout
            });
          } else {
            const dayOfWeek = new Date(dateStr).getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = holidays.some(
              (h) => h.date.split("T")[0] === dateStr,
            );

            if (!isWeekend && !isHoliday) {
              // Mark as absent for working days without attendance
              allDatesInMonth.push({
                date: dateStr,
                present: 0,
                absent: 1,
                attendance: undefined,
              });
              absentCount++;
              console.log(`❌ Marked absent for ${dateStr} (working day)`);
            } else {
              skippedWeekendHoliday++;
              console.log(`⏭️ Skipped ${dateStr}: weekend=${isWeekend}, holiday=${isHoliday}`);
            }
          }
        }

        console.log('📊 Attendance summary:', {
          totalProcessed: allDatesInMonth.length,
          present: presentCount,
          absent: absentCount,
          skippedFuture: skippedFuture,
          skippedWeekendHoliday: skippedWeekendHoliday
        });

        setAttendanceDates(allDatesInMonth);
        console.log('✅ Attendance dates set in state');

        if (response.data.statistics) {
          setStatistics(response.data.statistics);
          console.log('📈 Statistics set:', response.data.statistics);
        }

        // Generate marked dates for calendar
        console.log('🎨 Generating marked dates...');
        const marked = getMarkedDates(allDatesInMonth, holidays);
        setMarkedDates(marked);
        console.log(`✅ Marked ${Object.keys(marked).length} dates on calendar`);
        
        console.log('✅ fetchAttendanceData completed successfully');
      } else {
        console.log('❌ Response was not successful:', {
          success: response.success,
          error: response.error,
          hasData: !!response.data
        });
        
        if (!isChangingMonth.current) {
          const errorMessage = response.error || "Failed to load attendance data";
          console.log('🔔 Showing error alert:', errorMessage);
          Alert.alert("Error", errorMessage);
        }
      }
    } catch (error: any) {
      console.error("❌ Exception in fetchAttendanceData:", error);
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      
      if (!isChangingMonth.current) {
        console.log('🔔 Showing generic error alert');
        Alert.alert("Error", "Failed to load attendance data");
      }
    } finally {
      console.log('🏁 Finally block executing', {
        showLoading,
        isChangingMonth: isChangingMonth.current,
        willSetLoadingFalse: showLoading && !isChangingMonth.current,
      });
      
      if (showLoading && !isChangingMonth.current) {
        console.log('⏸️ Setting loading to false');
        setLoading(false);
      }
      
      isChangingMonth.current = false;
      console.log('✅ fetchAttendanceData cleanup complete');
    }
  },
  [employeeCode, selectedYear, selectedMonth],
);

  useEffect(() => {
    const loadData = async () => {
      if (!isChangingMonth.current) {
        setLoading(true);
      }
      try {
        const holidayData = await getCachedHolidays(selectedYear, selectedMonth);
        setHolidays(holidayData);
        await fetchAttendanceData(false); // Pass false to avoid double loading
      } catch (error) {
        console.error("Error loading data:", error);
        Alert.alert("Error", "Failed to load holiday or attendance data.");
      } finally {
        if (!isChangingMonth.current) {
          setLoading(false);
        }
        isChangingMonth.current = false;
      }
    };

    loadData();
  }, [selectedYear, selectedMonth, fetchAttendanceData]);

  useEffect(() => {
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  if (selectedMonth === currentMonth && selectedYear === currentYear) {
    const todayRecord = attendanceRecords.find(
      (record) => record.date === today,
    );
    if (todayRecord || todayAttendanceMarked) {
      const timeoutId = setTimeout(() => {
        fetchAttendanceData(); // Remove the 'false' parameter
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }
}, [
  attendanceRecords,
  todayAttendanceMarked,
  selectedMonth,
  selectedYear,
  fetchAttendanceData,
]);

useFocusEffect(
  useCallback(() => {
    if (holidays.length > 0) {
      fetchAttendanceData(); // Remove the 'false' parameter
    }
  }, [fetchAttendanceData, holidays]),
);

  const isFieldTrip = useMemo(() => {
    if (!selectedDate || !fieldTripDates || !Array.isArray(fieldTripDates))
      return false;
    return fieldTripDates.some((trip) => {
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      const checkDate = new Date(selectedDate);
      return checkDate >= start && checkDate <= end;
    });
  }, [selectedDate, fieldTripDates]);

  const handleRefresh = useCallback(() => {
    fetchAttendanceData(true);
  }, [fetchAttendanceData]);

  const onDayPress = useCallback((day: any) => {
    setSelectedDate(day.dateString);
  }, []);

  const onMonthChange = useCallback((month: any) => {
    isChangingMonth.current = true;
    setSelectedMonth(month.month);
    setSelectedYear(month.year);
  }, []);

  const renderSelectedDateInfo = () => {
    if (!selectedDate) return null;
    const attendance = attendanceDates.find((a) => a.date === selectedDate);
    const holiday = holidays.find((h) => h.date === selectedDate);

    if (!attendance) {
      return (
        <Animated.View entering={FadeInUp.duration(300)}>
          <BrutalistCard>
            <Text style={attendanceCalendarStyles.selectedDateTitle}>
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>

            {holiday ? (
              <View style={attendanceCalendarStyles.noDataContainer}>
                <FontAwesome6
                  name={holiday.isWeekend ? "calendar-week" : "calendar-xmark"}
                  size={32}
                  color={
                    holiday.isWeekend
                      ? brutalistColors.weekend
                      : brutalistColors.holiday
                  }
                />
                <Text style={attendanceCalendarStyles.noDataText}>{holiday.description}</Text>
                <Text style={attendanceCalendarStyles.noDataSubText}>
                  {holiday.isWeekend ? "Weekend" : "Holiday"}
                </Text>
              </View>
            ) : isFieldTrip ? (
              <View style={attendanceCalendarStyles.noDataContainer}>
                <FontAwesome6
                  name="route"
                  size={32}
                  color={brutalistColors.fieldTrip}
                />
                <Text style={attendanceCalendarStyles.noDataText}>
                  Field Trip - No attendance marked
                </Text>
                <Text style={attendanceCalendarStyles.noDataSubText}>
                  Attendance can still be marked during field trips
                </Text>
              </View>
            ) : (
              <View style={attendanceCalendarStyles.noDataContainer}>
                <FontAwesome6
                  name="calendar-xmark"
                  size={32}
                  color={brutalistColors.text}
                />
                <Text style={attendanceCalendarStyles.noDataText}>No attendance marked</Text>
              </View>
            )}
          </BrutalistCard>
        </Animated.View>
      );
    }

    const getAttendanceStatus = () => {
      if (attendance.present === 0) {
        return {
          label: "Absent",
          color: brutalistColors.absent,
          icon: "calendar-xmark",
        };
      }

      if (!attendance.attendance) {
        return {
          label: "Present",
          color: brutalistColors.present,
          icon: "check",
        };
      }

      if (!attendance.attendance.isCheckout) {
        return {
          label: "In Progress",
          color: brutalistColors.inProgress,
          icon: "clock",
        };
      }

      return {
        label: "Present",
        color: brutalistColors.present,
        icon: "circle-check",
      };
    };

    const status = getAttendanceStatus();

    return (
      <Animated.View entering={FadeInUp.duration(300)}>
        <BrutalistCard>
          <Text style={attendanceCalendarStyles.selectedDateTitle}>
            {new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>

          <View style={attendanceCalendarStyles.badgeContainer}>
            <View
              style={[
                attendanceCalendarStyles.attendanceBadge,
                {
                  backgroundColor: status.color,
                },
              ]}
            >
              <FontAwesome6
                name={status.icon}
                size={16}
                color={brutalistColors.white}
              />
              <Text
                style={[
                  attendanceCalendarStyles.attendanceBadgeText,
                  { color: brutalistColors.white },
                ]}
              >
                {status.label}
              </Text>
            </View>

            {isFieldTrip && (
              <View
                style={[
                  attendanceCalendarStyles.attendanceBadge,
                  { backgroundColor: brutalistColors.fieldTrip },
                ]}
              >
                <FontAwesome6
                  name="route"
                  size={16}
                  color={brutalistColors.white}
                />
                <Text
                  style={[
                    attendanceCalendarStyles.attendanceBadgeText,
                    { color: brutalistColors.white },
                  ]}
                >
                  Field Trip
                </Text>
              </View>
            )}

            {holiday && (
              <View
                style={[
                  attendanceCalendarStyles.attendanceBadge,
                  {
                    backgroundColor: holiday.isWeekend
                      ? brutalistColors.weekend
                      : brutalistColors.holiday,
                  },
                ]}
              >
                <FontAwesome6
                  name={holiday.isWeekend ? "calendar-week" : "calendar-xmark"}
                  size={16}
                  color={brutalistColors.white}
                />
                <Text
                  style={[
                    attendanceCalendarStyles.attendanceBadgeText,
                    { color: brutalistColors.white },
                  ]}
                >
                  {holiday.description}
                </Text>
              </View>
            )}
          </View>

          {attendance.attendance && attendance.present === 1 && (
            <View style={attendanceCalendarStyles.attendanceDetailsContainer}>
              {attendance.attendance.isCheckout && (
                <View style={attendanceCalendarStyles.attendanceDetailRow}>
                  <FontAwesome6
                    name="calendar-day"
                    size={16}
                    color={brutalistColors.text}
                  />
                  <Text style={attendanceCalendarStyles.attendanceDetailLabel}>Day Type:</Text>
                  <Text style={attendanceCalendarStyles.attendanceDetailValue}>
                    {attendance.attendance.fullDay ? "Full Day" : "Half Day"}
                  </Text>
                </View>
              )}

              {attendance.attendance.sessionType && (
                <View style={attendanceCalendarStyles.attendanceDetailRow}>
                  <FontAwesome6
                    name="business-time"
                    size={16}
                    color={brutalistColors.text}
                  />
                  <Text style={attendanceCalendarStyles.attendanceDetailLabel}>Session:</Text>
                  <Text style={attendanceCalendarStyles.attendanceDetailValue}>
                    {attendance.attendance.sessionType === "FN"
                      ? "Forenoon"
                      : "Afternoon"}
                  </Text>
                </View>
              )}

              <View style={attendanceCalendarStyles.attendanceDetailRow}>
                <FontAwesome6
                  name="location-dot"
                  size={16}
                  color={brutalistColors.text}
                />
                <Text style={attendanceCalendarStyles.attendanceDetailLabel}>Location:</Text>
                <Text style={attendanceCalendarStyles.attendanceDetailValue}>
                  {attendance.attendance.takenLocation || "Not specified"}
                </Text>
              </View>

              {attendance.attendance.checkinTime && (
                <View style={attendanceCalendarStyles.attendanceDetailRow}>
                  <FontAwesome6
                    name="right-to-bracket"
                    size={16}
                    color={brutalistColors.text}
                  />
                  <Text style={attendanceCalendarStyles.attendanceDetailLabel}>Check-in:</Text>
                  <Text style={attendanceCalendarStyles.attendanceDetailValue}>
                    {new Date(
                      attendance.attendance.checkinTime,
                    ).toLocaleTimeString()}
                  </Text>
                </View>
              )}

              {attendance.attendance.checkoutTime && (
                <View style={attendanceCalendarStyles.attendanceDetailRow}>
                  <FontAwesome6
                    name="right-from-bracket"
                    size={16}
                    color={brutalistColors.text}
                  />
                  <Text style={attendanceCalendarStyles.attendanceDetailLabel}>Check-out:</Text>
                  <Text style={attendanceCalendarStyles.attendanceDetailValue}>
                    {new Date(
                      attendance.attendance.checkoutTime,
                    ).toLocaleTimeString()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </BrutalistCard>
      </Animated.View>
    );
  };

  const getSimplifiedStatistics = () => {
    if (!attendanceDates || attendanceDates.length === 0) {
      return {
        present: 0,
        absent: 0,
        inProgress: 0,
        holidays: holidays.length,
      };
    }

    const present = attendanceDates.filter(
      (a) => a.present === 1 && a.attendance?.isCheckout,
    ).length;
    const inProgress = attendanceDates.filter(
      (a) => a.present === 1 && !a.attendance?.isCheckout,
    ).length;
    const absent = attendanceDates.filter((a) => a.present === 0).length;

    return {
      present,
      absent,
      inProgress,
      holidays: holidays.length,
    };
  };

  const simplifiedStats = getSimplifiedStatistics();

  const enhancedMarkedDates = useMemo(() => {
    const marked = { ...markedDates };

    if (
      fieldTripDates &&
      Array.isArray(fieldTripDates) &&
      fieldTripDates.length > 0
    ) {
      fieldTripDates.forEach((trip) => {
        if (!trip || !trip.startDate || !trip.endDate) return;

        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split("T")[0];

          if (marked[dateStr]) {
            marked[dateStr] = {
              ...marked[dateStr],
              customStyles: {
                ...marked[dateStr].customStyles,
                container: {
                  ...marked[dateStr].customStyles?.container,
                  borderWidth: 3,
                  borderColor: brutalistColors.fieldTrip,
                },
              },
            };
          } else {
            marked[dateStr] = {
              customStyles: {
                container: {
                  backgroundColor: brutalistColors.background,
                  borderWidth: 3,
                  borderColor: brutalistColors.fieldTrip,
                },
                text: {
                  color: brutalistColors.text,
                  fontWeight: "600",
                },
              },
            };
          }
        }
      });
    }

    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: brutalistColors.primary,
        selectedTextColor: brutalistColors.white,
      };
    }

    return marked;
  }, [markedDates, fieldTripDates, selectedDate]);

  const calendarTheme = useMemo(
    () => ({
      backgroundColor: brutalistColors.background,
      calendarBackground: brutalistColors.background,
      textSectionTitleColor: brutalistColors.text,
      selectedDayBackgroundColor: brutalistColors.primary,
      selectedDayTextColor: brutalistColors.white,
      todayTextColor: brutalistColors.primary,
      dayTextColor: brutalistColors.text,
      textDisabledColor: brutalistColors.disabled,
      dotColor: brutalistColors.present,
      selectedDotColor: brutalistColors.white,
      arrowColor: brutalistColors.primary,
      monthTextColor: brutalistColors.text,
      indicatorColor: brutalistColors.primary,
      textDayFontWeight: "600" as const,
      textMonthFontWeight: "900" as const,
      textDayHeaderFontWeight: "700" as const,
      textDayFontSize: 16,
      textMonthFontSize: 20,
      textDayHeaderFontSize: 14,
      "stylesheet.calendar.header": {
        week: {
          marginTop: 10,
          flexDirection: "row",
          justifyContent: "space-between",
          borderBottomWidth: 3,
          borderColor: brutalistColors.border,
          paddingBottom: 10,
        },
      },
    }),
    [],
  );

  const renderSimplifiedStatisticsCard = () => {
    return (
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <BrutalistCard>
          <View style={attendanceCalendarStyles.headerContainer}>
            <Text style={attendanceCalendarStyles.cardTitle}>MONTHLY SUMMARY</Text>
            <TouchableOpacity
              onPress={handleRefresh}
              style={attendanceCalendarStyles.refreshButton}
              activeOpacity={0.7}
            >
              <FontAwesome6
                name="arrows-rotate"
                size={18}
                color={brutalistColors.text}
              />
            </TouchableOpacity>
          </View>

          <View style={attendanceCalendarStyles.simpleStatsGrid}>
            <View style={attendanceCalendarStyles.simpleStatItem}>
              <Text
                style={[
                  attendanceCalendarStyles.simpleStatValue,
                  { color: brutalistColors.present },
                ]}
              >
                {simplifiedStats.present}
              </Text>
              <Text style={attendanceCalendarStyles.simpleStatLabel}>Present</Text>
            </View>

            <View style={attendanceCalendarStyles.simpleStatDivider} />

            <View style={attendanceCalendarStyles.simpleStatItem}>
              <Text
                style={[
                  attendanceCalendarStyles.simpleStatValue,
                  { color: brutalistColors.absent },
                ]}
              >
                {simplifiedStats.absent}
              </Text>
              <Text style={attendanceCalendarStyles.simpleStatLabel}>Absent</Text>
            </View>

            <View style={attendanceCalendarStyles.simpleStatDivider} />

            <View style={attendanceCalendarStyles.simpleStatItem}>
              <Text
                style={[
                  attendanceCalendarStyles.simpleStatValue,
                  { color: brutalistColors.inProgress },
                ]}
              >
                {simplifiedStats.inProgress}
              </Text>
              <Text style={attendanceCalendarStyles.simpleStatLabel}>In Progress</Text>
            </View>

            <View style={attendanceCalendarStyles.simpleStatDivider} />

            <View style={attendanceCalendarStyles.simpleStatItem}>
              <Text
                style={[
                  attendanceCalendarStyles.simpleStatValue,
                  { color: brutalistColors.holiday },
                ]}
              >
                {simplifiedStats.holidays}
              </Text>
              <Text style={attendanceCalendarStyles.simpleStatLabel}>Holidays</Text>
            </View>
          </View>
        </BrutalistCard>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={attendanceCalendarStyles.loadingContainer}>
        <ActivityIndicator size="large" color={brutalistColors.primary} />
        <Text style={attendanceCalendarStyles.loadingText}>Loading attendance data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={attendanceCalendarStyles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={handleRefresh}
          colors={[brutalistColors.primary]}
          tintColor={brutalistColors.primary}
        />
      }
    >
      {renderSimplifiedStatisticsCard()}

      <BrutalistCard>
        <Text style={attendanceCalendarStyles.cardTitle}>ATTENDANCE CALENDAR</Text>
        <Calendar
          current={`${selectedYear}-${String(selectedMonth).padStart(
            2,
            "0",
          )}-01`}
          onDayPress={onDayPress}
          onMonthChange={onMonthChange}
          markingType="custom"
          markedDates={enhancedMarkedDates}
          theme={calendarTheme}
          style={attendanceCalendarStyles.calendar}
          enableSwipeMonths={true}
          hideExtraDays={false}
          disableMonthChange={false}
        />
      </BrutalistCard>

      {renderSelectedDateInfo()}

      <BrutalistCard>
        <Text style={attendanceCalendarStyles.cardTitle}>LEGEND</Text>
        <View style={attendanceCalendarStyles.legendItems}>
          <View style={attendanceCalendarStyles.legendItem}>
            <View
              style={[
                attendanceCalendarStyles.legendDot,
                { backgroundColor: brutalistColors.present },
              ]}
            />
            <Text style={attendanceCalendarStyles.legendText}>Present</Text>
          </View>
          <View style={attendanceCalendarStyles.legendItem}>
            <View
              style={[
                attendanceCalendarStyles.legendDot,
                { backgroundColor: brutalistColors.absent },
              ]}
            />
            <Text style={attendanceCalendarStyles.legendText}>Absent</Text>
          </View>
          <View style={attendanceCalendarStyles.legendItem}>
            <View
              style={[
                attendanceCalendarStyles.legendDot,
                { backgroundColor: brutalistColors.inProgress },
              ]}
            />
            <Text style={attendanceCalendarStyles.legendText}>In Progress</Text>
          </View>
          <View style={attendanceCalendarStyles.legendItem}>
            <View
              style={[
                attendanceCalendarStyles.legendDot,
                { backgroundColor: brutalistColors.weekend },
              ]}
            />
            <Text style={attendanceCalendarStyles.legendText}>Weekend</Text>
          </View>
          <View style={attendanceCalendarStyles.legendItem}>
            <View
              style={[
                attendanceCalendarStyles.legendDot,
                { backgroundColor: brutalistColors.holiday },
              ]}
            />
            <Text style={attendanceCalendarStyles.legendText}>Holiday</Text>
          </View>
          {fieldTripDates &&
            Array.isArray(fieldTripDates) &&
            fieldTripDates.length > 0 && (
              <View style={attendanceCalendarStyles.legendItem}>
                <View
                  style={[
                    attendanceCalendarStyles.legendDot,
                    {
                      backgroundColor: brutalistColors.background,
                      borderWidth: 3,
                      borderColor: brutalistColors.fieldTrip,
                    },
                  ]}
                />
                <Text style={attendanceCalendarStyles.legendText}>Field Trip</Text>
              </View>
            )}
        </View>
      </BrutalistCard>
    </ScrollView>
  );
};

const getMarkedDates = (
  attendanceDates: AttendanceDate[],
  holidays: Holiday[],
) => {
  const marked: { [key: string]: any } = {};

  const currentHour = new Date().getHours();
  const today = new Date().toISOString().split("T")[0];

  attendanceDates.forEach((item) => {
    const dateStr = item.date.split("T")[0];
    let dotColor = colors.error;
    let backgroundColor = "#F87171";
    let textColor = "#1F2937";

if (item.present === 1) {
  if (item.attendance) {
    const isAutoCompleted =
      dateStr === today && currentHour >= 23 && !item.attendance.isCheckout;

    if (isAutoCompleted || item.attendance.isCheckout) {  // ✅ FIXED
      // Show green for ALL checked-out attendance (both full-day and half-day)
      dotColor = "#10B981";
      backgroundColor = "#D1FAE5";
      textColor = "#065F46";
    } else if (!item.attendance.isCheckout) {
      // Show yellow for in-progress attendance
      dotColor = "#F59E0B";
      backgroundColor = "#FEF3C7";
      textColor = "#92400E";
    } else {
      // Default green color
      dotColor = "#10B981";
      backgroundColor = "#D1FAE5";
      textColor = "#065F46";
    }
  }
}

    marked[dateStr] = {
      marked: true,
      dotColor,
      selected: false,
      selectedColor: dotColor,
      customStyles: {
        container: {
          backgroundColor,
          borderRadius: 6,
        },
        text: {
          color: textColor,
          fontWeight: "bold",
        },
      },
    };
  });

  holidays.forEach((h) => {
    const dateStr = h.date.split("T")[0] || h.date;
    if (!marked[dateStr]) {
      marked[dateStr] = {
        customStyles: {
          container: {
            backgroundColor: h.isWeekend ? "#E0E7FF" : "#FEF3C7",
            borderRadius: 6,
          },
          text: {
            color: h.isWeekend ? "#6366F1" : "#92400E",
            fontWeight: "500",
          },
        },
      };
    }
  });

  return marked;
};
