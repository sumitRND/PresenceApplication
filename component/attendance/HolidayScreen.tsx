import { colors } from "@/constants/colors";
import { Holiday } from "@/services/attendanceCalendarService";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React from "react";
import {
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { holidayScreenStyles } from "@/constants/style";

interface HolidayScreenProps {
  holidayInfo: Holiday;
}

export function HolidayScreen({ holidayInfo }: HolidayScreenProps) {
  const isWeekend = holidayInfo.isWeekend;

  const getIcon = () => (isWeekend ? "calendar-week" : "calendar-xmark");
  const getBgColor = () => (isWeekend ? "#6366F1" : "#F59E0B");
  const getEmoji = () => (isWeekend ? "🌴" : "🎉");

  return (
    <ScrollView style={holidayScreenStyles.container} showsVerticalScrollIndicator={false}>
      {/* Header Card */}
      <Animated.View
        entering={FadeInUp.delay(100).springify()}
        style={[holidayScreenStyles.headerCard, { backgroundColor: getBgColor() }]}
      >
        <View style={holidayScreenStyles.headerContent}>
          <View style={holidayScreenStyles.iconContainer}>
            <FontAwesome6 name={getIcon()} size={48} color={"#fff"} />
          </View>
          <Text style={holidayScreenStyles.emoji}>{getEmoji()}</Text>
          <Text style={holidayScreenStyles.headerTitle}>
            {isWeekend ? "Weekend Time!" : "Holiday!"}
          </Text>
          <Text style={holidayScreenStyles.headerSubtitle}>{holidayInfo.description}</Text>
        </View>
      </Animated.View>

      {/* Main Content Card */}
      <Animated.View
        entering={FadeInDown.delay(200).springify()}
        style={holidayScreenStyles.contentCard}
      >
        <View style={holidayScreenStyles.messageContainer}>
          <FontAwesome6
            name="circle-info"
            size={20}
            color={isWeekend ? "#000" : "#000"}
          />
          <Text style={holidayScreenStyles.messageTitle}>No Attendance Today</Text>
          <Text style={holidayScreenStyles.messageText}>
            {isWeekend
              ? "It's the weekend! Enjoy your time off and recharge for the upcoming week."
              : `Today is a holiday (${holidayInfo.description}). Attendance marking is not required.`}
          </Text>
        </View>

        <View style={holidayScreenStyles.divider} />

        {/* Today's Date */}
        <View style={holidayScreenStyles.dateContainer}>
          <FontAwesome6 name="calendar-day" size={18} color={"#000"} />
          <Text style={holidayScreenStyles.dateText}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>

        {/* Tips Section */}
        <View style={holidayScreenStyles.tipsContainer}>
          <Text style={holidayScreenStyles.tipsTitle}>
            {isWeekend ? "Weekend Tips" : "Holiday Reminder"}
          </Text>
          <View style={holidayScreenStyles.tipItem}>
            <FontAwesome6 name="clock" size={14} color={"#000"} />
            <Text style={holidayScreenStyles.tipText}>
              {isWeekend
                ? "Working hours resume on Monday at 9:00 AM"
                : "Regular attendance will resume on the next working day"}
            </Text>
          </View>
          <View style={holidayScreenStyles.tipItem}>
            <FontAwesome6 name="bell" size={14} color={"#000"} />
            <Text style={holidayScreenStyles.tipText}>
              You&apos;ll receive a reminder notification for the next working day
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Bottom Quote Block */}
      <Animated.View
        entering={FadeInDown.delay(300).springify()}
        style={holidayScreenStyles.bottomCard}
      >
        <Text style={holidayScreenStyles.quoteText}>
          {isWeekend
            ? '"Take rest; a field that has rested gives a bountiful crop."'
            : '"A holiday is an opportunity to journey within."'}
        </Text>
        <Text style={holidayScreenStyles.quoteAuthor}>
          {isWeekend ? "- Ovid" : "- Prabhas"}
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

