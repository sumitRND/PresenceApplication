import { useAuthStore } from "@/store/authStore";
import { router, useNavigation } from "expo-router";
import { useEffect } from "react";

// hooks/useAuthCheck.ts
export function useAuthCheck() {
  const navigation = useNavigation();
  const { checkTokenExpiry, refreshAuthToken } = useAuthStore();

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      // Check token when navigating to important screens
      if (!checkTokenExpiry()) {
        const refreshed = await refreshAuthToken();
        if (!refreshed) {
          router.replace("/(auth)/login");
        }
      }
    });

    return unsubscribe;
  }, [navigation]);
}
