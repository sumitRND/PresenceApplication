import { TermsAndConditionsScreen } from "@/component/ui/TermsAndConditionsScreen";
import { useAudio } from "@/hooks/useAudio";
import { useCamera } from "@/hooks/useCamera";
import { useGeofence as useLocation } from "@/hooks/useGeofence";
import { NotificationProvider } from "@/provider/NotificationProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as IntentLauncher from "expo-intent-launcher";
import * as Location from "expo-location";
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
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore } from "../store/authStore";

(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.allowFontScaling = true;
(Text as any).defaultProps.maxFontSizeMultiplier = 1.3;

(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.allowFontScaling = true;
(TextInput as any).defaultProps.maxFontSizeMultiplier = 1.3;

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
    tokenExpiry,
    refreshAuthToken,
    signOut,
  } = useAuthStore();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!isInitialized) initializeAuth();
  }, [isInitialized, initializeAuth]);

  // Simplified approach for handling app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "active" && session) {
        // Check and refresh if needed when app becomes active
        const timeUntilExpiry = (tokenExpiry || 0) - Date.now();

        // If token is expiring in less than 5 minutes, or already expired
        if (timeUntilExpiry < 5 * 60 * 1000) {
          // If token is still valid, refresh it. Otherwise, sign out.
          checkTokenExpiry() ? refreshAuthToken() : signOut();
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [session, tokenExpiry, checkTokenExpiry, refreshAuthToken, signOut]);

  // This effect handles navigation based on auth state
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
      if (Platform.OS === "android") {
        const locationServicesEnabled =
          await Location.hasServicesEnabledAsync();
        if (!locationServicesEnabled) {
          Alert.alert(
            "Enable Location Services",
            "Please enable location services on your device before continuing.",
            [
              {
                text: "Open Settings",
                onPress: async () => {
                  await IntentLauncher.startActivityAsync(
                    IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS,
                  );
                  setProcessing(false);
                },
              },
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => {
                  setProcessing(false);
                },
              },
            ],
          );
          return;
        }
      }

      await Promise.all([requestCamera(), requestMic(), requestLocation()]);
      await AsyncStorage.setItem("termsAcceptedOnce", "true");
      setHasAcceptedTerms(true);
    } catch (error) {
      console.error("Error accepting terms:", error);
      Alert.alert("Error", "Failed to setup permissions. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (hasAcceptedTerms === null) {
    return null; // Or a loading screen
  }

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthGate>
        <TermsGate>
          <NotificationProvider>
            <Stack
              screenOptions={{
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
