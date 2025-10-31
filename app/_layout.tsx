// app/_layout.tsx - Updated with fixes
import { TermsAndConditionsScreen } from "@/component/ui/TermsAndConditionsScreen";
import { useAudio } from "@/hooks/useAudio";
import { useCamera } from "@/hooks/useCamera";
import { useGeofence as useLocation } from "@/hooks/useGeofence";
import { NotificationProvider } from "@/provider/NotificationProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  router,
  Stack,
  useRootNavigationState,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Alert,
  AppState,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useAuthStore } from "../store/authStore";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Global configuration for Text and TextInput
// This helps maintain consistency across the app
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.allowFontScaling = true; // Allow font scaling
(Text as any).defaultProps.maxFontSizeMultiplier = 1.3; // Limit maximum scaling to 130%

(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.allowFontScaling = true;
(TextInput as any).defaultProps.maxFontSizeMultiplier = 1.3;

// Set default touch opacity for better touch feedback
(TouchableOpacity as any).defaultProps =
  (TouchableOpacity as any).defaultProps || {};
(TouchableOpacity as any).defaultProps.activeOpacity = 0.7;

function AuthGate({ children }: { children: React.ReactNode }) {
  const {
    session,
    isLoading,
    isInitialized,
    initializeAuth,
    checkTokenExpiry,
  } = useAuthStore();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!isInitialized) initializeAuth();
  }, [isInitialized, initializeAuth]);

  // Check token expiry on app state change (when app comes to foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "active") {
        // Check if token is still valid when app becomes active
        if (session && !checkTokenExpiry()) {
          Alert.alert(
            "Session Expired",
            "Your session has expired. Please login again.",
            [{ text: "OK", onPress: () => useAuthStore.getState().signOut() }],
          );
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [session, checkTokenExpiry]);

  // Check token expiry periodically (every minute)
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      if (!checkTokenExpiry()) {
        Alert.alert(
          "Session Expired",
          "Your session has expired. Please login again.",
          [{ text: "OK", onPress: () => useAuthStore.getState().signOut() }],
        );
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [session, checkTokenExpiry]);

  useEffect(() => {
    if (!navigationState?.key || isLoading || !isInitialized) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, segments, navigationState?.key, isLoading, isInitialized]);

  return <>{children}</>;
}

function TermsGate({ children }: { children: React.ReactNode }) {
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean | null>(
    null,
  );
  const [processing, setProcessing] = useState(false);
  const { session } = useAuthStore();

  const { requestPermission: requestCamera } = useCamera();
  const { requestPermission: requestMic } = useAudio();
  const { requestPermission: requestLocation } = useLocation();

  // Check if terms have been accepted (only once after install)
  useEffect(() => {
    const checkTermsAcceptance = async () => {
      try {
        const accepted = await AsyncStorage.getItem("termsAcceptedOnce");
        setHasAcceptedTerms(accepted === "true");
      } catch (error) {
        console.error("Error checking terms acceptance:", error);
        setHasAcceptedTerms(false);
      }
    };

    checkTermsAcceptance();
  }, []);

  const handleAccept = async () => {
    setProcessing(true);
    try {
      // Request all required permissions
      await Promise.all([requestCamera(), requestMic(), requestLocation()]);

      // Mark terms as accepted permanently (survives app reinstalls only if not clearing app data)
      await AsyncStorage.setItem("termsAcceptedOnce", "true");
      setHasAcceptedTerms(true);
    } catch (error) {
      console.error("Error accepting terms:", error);
    } finally {
      setProcessing(false);
    }
  };

  // Loading state
  if (hasAcceptedTerms === null) {
    return null; // Or a loading screen
  }

  // Show terms only if not accepted AND user is logged in
  if (!hasAcceptedTerms && session) {
    return (
      <TermsAndConditionsScreen
        isProcessing={processing}
        onAccept={handleAccept}
      />
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    // GestureHandlerRootView is essential for proper touch handling
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthGate>
        <TermsGate>
          <NotificationProvider>
            <Stack
              screenOptions={{
                // Ensure animations don't interfere with touch events
                animation: "simple_push",
                animationDuration: 200,
              }}
            >
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </NotificationProvider>
        </TermsGate>
      </AuthGate>
    </GestureHandlerRootView>
  );
}
