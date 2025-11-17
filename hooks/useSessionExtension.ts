// hooks/useSessionExtension.ts
export function useSessionExtension() {
  const { token, tokenExpiry, extendSession } = useAuthStore();
  const lastActivity = useRef(Date.now());
  
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivity.current;
    
    // Extend session if user is active and token is close to expiry
    if (timeSinceLastActivity > 5 * 60 * 1000) { // 5 minutes
      const timeUntilExpiry = (tokenExpiry || 0) - now;
      
      if (timeUntilExpiry < 10 * 60 * 1000) { // Less than 10 minutes
        extendSession();
      }
    }
    
    lastActivity.current = now;
  }, [tokenExpiry]);
  
  // Listen to user interactions
  useEffect(() => {
    const events = ['touchstart', 'keypress'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity);
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
    };
  }, [handleUserActivity]);
}