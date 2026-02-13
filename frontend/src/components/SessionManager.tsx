'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export default function SessionManager() {
  const { data: session, status, update: updateSession } = useSession();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silentRefreshInProgressRef = useRef(false);

  // Refresh session silently in the background
  const silentRefresh = useCallback(async () => {
    if (silentRefreshInProgressRef.current || status !== 'authenticated') {
      return;
    }

    silentRefreshInProgressRef.current = true;

    try {
      console.log('🔄 [SessionManager] Attempting silent session refresh...');
      
      // Call NextAuth's session endpoint to trigger token refresh
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include', // Important: include cookies for auth
      });

      if (response.ok) {
        const newSession = await response.json();
        console.log('✅ [SessionManager] Session refreshed successfully');
        
        // Update local session with new data
        await updateSession(newSession);
        
        return true;
      } else {
        console.warn(`⚠️ [SessionManager] Session refresh failed with status ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('❌ [SessionManager] Error refreshing session:', error);
      return false;
    } finally {
      silentRefreshInProgressRef.current = false;
    }
  }, [status, updateSession]);

  // Schedule silent refresh before token expires
  useEffect(() => {
    if (status !== 'authenticated' || !session) {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      return;
    }

    // Refresh every 15 minutes to keep session fresh
    // This prevents expiration for active users
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      
      refreshTimeoutRef.current = setTimeout(() => {
        console.log('⏰ [SessionManager] Scheduled refresh interval reached');
        silentRefresh();
        scheduleRefresh(); // Reschedule next refresh
      }, 15 * 60 * 1000); // 15 minutes
    };

    scheduleRefresh();

    // Also refresh on window focus (user comes back to app)
    const handleWindowFocus = () => {
      console.log('👁️ [SessionManager] Window focused, attempting refresh');
      silentRefresh();
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [session, status, silentRefresh]);

  // Detect expired token on API responses and attempt refresh
  useEffect(() => {
    if (status !== 'authenticated' || !session) return;

    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      // On 401, try to refresh token
      if (response.status === 401) {
        const urlStr = args[0]?.toString() || '';
        const isAuthEndpoint = urlStr.includes('/api/auth');

        if (!isAuthEndpoint) {
          console.warn(`⚠️ [SessionManager] Got 401 on ${urlStr}, attempting token refresh...`);
          
          const refreshed = await silentRefresh();
          
          if (refreshed) {
            // Retry the original request with new token
            console.log('🔄 [SessionManager] Retrying request with refreshed token...');
            return originalFetch(...args);
          } else {
            console.error('❌ [SessionManager] Token refresh failed, request will fail with 401');
          }
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [session, status, silentRefresh]);

  return null;
}
