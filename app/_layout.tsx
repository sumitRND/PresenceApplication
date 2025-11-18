import { TermsAndConditionsScreen } from '@/component/ui/TermsAndConditionsScreen';
import { usePermissions } from '@/hooks/usePermissions';
import { NotificationProvider } from '@/provider/NotificationProvider';
import { useAuthStore } from '@/store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Location from 'expo-location';
import { router, Stack, useRootNavigationState, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { memo, useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  AppState,
  AppStateStatus,
  Platform,
  Text,
  TextInput
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Set default text scaling limits
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.allowFontScaling = true;
(Text as any).defaultProps.maxFontSizeMultiplier = 1.3;

(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.allowFontScaling = true;
(TextInput as any).defaultProps.maxFontSizeMultiplier = 1.3;

// Memoized auth gate component
const AuthGate = memo(({ children }: { children: React.ReactNode }) => {
  const { 
    isAuthenticated, 
    isInitialized, 
    isLoading,
    initializeAuth,
    checkTokenExpiry,
    refreshAuthToken
  } = useAuthStore();
  
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const appStateRef = useRef(AppState.currentState);
  
  // Initialize auth on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);
  
  // Handle app state changes for token refresh
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) && 
        nextAppState === 'active' && 
        isAuthenticated
      ) {
        // App came to foreground, check token
        if (!checkTokenExpiry()) {
          refreshAuthToken();
        }
      }
      appStateRef.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, checkTokenExpiry, refreshAuthToken]);
  
  // Handle navigation based on auth state
  useEffect(() => {
    if (!navigationState?.key || isLoading || !isInitialized) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, navigationState?.key, isLoading, isInitialized]);
  
  return <>{children}</>;
});
AuthGate.displayName = 'AuthGate';

// Memoized terms gate component
const TermsGate = memo(({ children }: { children: React.ReactNode }) => {
  const [hasAcceptedTerms, setHasAcceptedTerms] = React.useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { isAuthenticated } = useAuthStore();
  const { requestAllPermissions } = usePermissions();
  
  // Check terms acceptance
  useEffect(() => {
    const checkTerms = async () => {
      try {
        const accepted = await AsyncStorage.getItem('termsAcceptedOnce');
        setHasAcceptedTerms(accepted === 'true');
      } catch (error) {
        console.error('Error checking terms:', error);
        setHasAcceptedTerms(false);
      }
    };
    
    checkTerms();
  }, []);
  
  const handleAccept = useCallback(async () => {
    setIsProcessing(true);
    
    try {
      // Check location services on Android
      if (Platform.OS === 'android') {
        const locationServicesEnabled = await Location.hasServicesEnabledAsync();
        
        if (!locationServicesEnabled) {
          Alert.alert(
            'Enable Location Services',
            'Please enable location services before continuing.',
            [
              {
                text: 'Open Settings',
                onPress: () => {
                  IntentLauncher.startActivityAsync(
                    IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
                  );
                  setIsProcessing(false);
                },
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => setIsProcessing(false),
              },
            ]
          );
          return;
        }
      }
      
      // Request all permissions
      const allGranted = await requestAllPermissions();
      
      if (allGranted) {
        await AsyncStorage.setItem('termsAcceptedOnce', 'true');
        setHasAcceptedTerms(true);
      } else {
        Alert.alert(
          'Permissions Required',
          'All permissions must be granted to use the app.'
        );
      }
    } catch (error) {
      console.error('Error accepting terms:', error);
      Alert.alert('Error', 'Failed to setup permissions. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [requestAllPermissions]);
  
  // Show loading while checking
  if (hasAcceptedTerms === null) {
    return null;
  }
  
  // Show terms if not accepted and authenticated
  if (!hasAcceptedTerms && isAuthenticated) {
    return (
      <TermsAndConditionsScreen
        isProcessing={isProcessing}
        onAccept={handleAccept}
      />
    );
  }
  
  return <>{children}</>;
});
TermsGate.displayName = 'TermsGate';

// Root layout component
export default function RootLayout() {
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any timers or subscriptions
      const { clearTokenRefreshTimer } = useAuthStore.getState();
      clearTokenRefreshTimer();
    };
  }, []);
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthGate>
        <TermsGate>
          <NotificationProvider>
            <Stack
              screenOptions={{
                animation: 'simple_push',
                animationDuration: 200,
                headerShown: false,
              }}
            >
              <Stack.Screen 
                name="(auth)" 
                options={{ 
                  headerShown: false,
                  // Prevent going back from auth
                  gestureEnabled: false,
                }} 
              />
              <Stack.Screen 
                name="(tabs)" 
                options={{ 
                  headerShown: false,
                  // Prevent going back to auth
                  gestureEnabled: false,
                }} 
              />
              <Stack.Screen 
                name="+not-found"
                options={{
                  title: 'Not Found',
                  headerShown: true,
                }}
              />
            </Stack>
            <StatusBar style="auto" />
          </NotificationProvider>
        </TermsGate>
      </AuthGate>
    </GestureHandlerRootView>
  );
}
