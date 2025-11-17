import { useAuthStore } from "@/store/authStore";
import { router, useNavigation } from "expo-router";
import { useCallback, useEffect } from "react";

export function useAuthCheck() {
  const navigation = useNavigation();
  const { checkTokenExpiry, refreshAuthToken } = useAuthStore();

  const handleFocus = useCallback(async () => {
    if (!checkTokenExpiry()) {
      const refreshed = await refreshAuthToken();
      if (!refreshed) {
        router.replace("/(auth)/login");
      }
    }
  }, [checkTokenExpiry, refreshAuthToken]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", handleFocus);
    return unsubscribe;
  }, [navigation, handleFocus]);
}