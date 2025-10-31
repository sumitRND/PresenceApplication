import { colors } from "@/constants/colors";
import { useAuthStore } from "@/store/authStore";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import {
  fontSize,
  horizontalScale,
  verticalScale,
  moderateScale,
  adaptiveHeight,
  adaptivePadding,
  getResponsiveStyles,
} from "@/utils/responsive";

export default function LoginScreen() {
  const { signIn, isLoading } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const responsiveInfo = getResponsiveStyles();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter username and password");
      return;
    }
    await signIn(username.trim(), password);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.offwhite }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo/Brand Section */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.logoContainer}
          >
            <View style={styles.logoCircle}>
              <Image
                source={require("../../assets/images/appicon_light.png")}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            </View>
            <Text
              style={styles.brandName}
              numberOfLines={responsiveInfo.shouldWrapText ? 2 : 1}
              adjustsFontSizeToFit={!responsiveInfo.shouldWrapText}
            >
              Attendance System
            </Text>
            <Text style={styles.tagline}>IIT Guwahati</Text>
          </Animated.View>

          {/* Brutalist Login Form Card */}
          <Animated.View
            entering={FadeInUp.delay(200).springify()}
            style={styles.formCard}
          >
            <Text style={styles.welcomeText} allowFontScaling={true}>
              Welcome Back!
            </Text>
            <Text style={styles.subtitleText}>Sign in to continue</Text>

            {/* Username Input */}
            <View style={styles.inputContainer}>
              <FontAwesome6
                name="user"
                size={moderateScale(20)}
                color={"#000"}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={"#555"}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                allowFontScaling={true}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <FontAwesome6
                name="lock"
                size={moderateScale(20)}
                color={"#000"}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={"#555"}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                allowFontScaling={true}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <FontAwesome6
                  name={showPassword ? "eye" : "eye-slash"}
                  size={moderateScale(20)}
                  color={"#000"}
                />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.loginButtonText} allowFontScaling={true}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: moderateScale(20),
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: verticalScale(30),
  },
  logoCircle: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  brandName: {
    fontSize: fontSize(32),
    fontWeight: "bold",
    color: colors.black,
    marginBottom: verticalScale(4),
    textAlign: "center",
  },
  tagline: {
    fontSize: fontSize(16),
    color: colors.gray[500],
  },
  formCard: {
    backgroundColor: "#fff",
    borderWidth: 4,
    borderColor: "#000",
    padding: adaptivePadding(24),
    marginHorizontal: horizontalScale(10),
    shadowColor: "#000",
    shadowOffset: {
      width: horizontalScale(10),
      height: verticalScale(10),
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    minHeight: adaptiveHeight(280),
  },
  welcomeText: {
    fontSize: fontSize(24),
    fontWeight: "900",
    color: "#000",
    textTransform: "uppercase",
    marginBottom: verticalScale(8),
  },
  subtitleText: {
    fontSize: fontSize(14),
    color: "#000",
    fontWeight: "600",
    marginBottom: verticalScale(24),
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#000",
    marginBottom: verticalScale(16),
    paddingHorizontal: horizontalScale(12),
    height: adaptiveHeight(56),
    minHeight: adaptiveHeight(56),
  },
  inputIcon: {
    marginRight: horizontalScale(12),
  },
  input: {
    flex: 1,
    fontSize: fontSize(16),
    fontWeight: "600",
    color: "#000",
    paddingVertical: adaptivePadding(8),
  },
  eyeIcon: {
    padding: moderateScale(4),
  },
  loginButton: {
    marginTop: verticalScale(12),
    paddingVertical: adaptivePadding(16),
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#000",
    backgroundColor: "#dcfd00",
    shadowColor: "#000",
    shadowOffset: {
      width: horizontalScale(5),
      height: verticalScale(5),
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
    minHeight: adaptiveHeight(56),
    justifyContent: "center",
  },
  loginButtonText: {
    color: "#000",
    fontSize: fontSize(16),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
