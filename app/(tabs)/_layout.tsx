import React from "react";
import { colors } from "@/constants/colors";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Tabs } from "expo-router";
import { View } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#000",
        tabBarInactiveTintColor: "#888",
        tabBarStyle: {
          backgroundColor: colors.offwhite,
          borderTopWidth: 2,
          borderTopColor: "#000",
          height: 70,
        },
        animation: "shift",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Attendance",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: "center" }}>
              <FontAwesome6 size={28} name="camera" color={color} />
              {focused && (
                <View
                  style={{
                    height: 4,
                    width: 20,
                    backgroundColor: "#000",
                    borderRadius: 2,
                    marginTop: 4,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: "center" }}>
              <FontAwesome6 size={28} name="user" color={color} />
              {focused && (
                <View
                  style={{
                    height: 4,
                    width: 20,
                    backgroundColor: "#000",
                    borderRadius: 2,
                    marginTop: 4,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
