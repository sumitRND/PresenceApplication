// hooks/useSessionExtension.ts
import { useAuthStore } from '@/store/authStore';
import { useCallback, useEffect, useRef } from 'react';

export function useSessionExtension() {
  const { token, tokenExpiry, refreshAuthToken } = useAuthStore();
  const lastActivity = useRef(Date.now());
  
  const extendSession = useCallback(async () => {
    await refreshAuthToken();
  }, [refreshAuthToken]);
  
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivity.current;
    if (timeSinceLastActivity > 5 * 60 * 1000) {
      const timeUntilExpiry = (tokenExpiry || 0) - now;
      
      if (timeUntilExpiry < 10 * 60 * 1000 && timeUntilExpiry > 0) { 
        extendSession();
      }
    }
    
    lastActivity.current = now;
  }, [tokenExpiry, extendSession]);

  useEffect(() => {
    return () => {
    };
  }, [handleUserActivity]);
  
  return { handleUserActivity };
}