'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SessionManager() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const logoutInProgressRef = useRef(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const performLogout = useCallback(async (reason: string) => {
    if (logoutInProgressRef.current) return;
    
    logoutInProgressRef.current = true;
    console.log(`🔓 [SessionManager] Auto-logging out - Reason: ${reason}`);
    
    // Store reason for display in SessionExpiredNotice
    sessionStorage.setItem('logout_reason', 'session_expired');
    
    // Clear any intervals
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }
    
    // Perform logout with redirect
    await signOut({ 
      redirect: true, 
      callbackUrl: '/?reason=session_expired' 
    });
  }, []);

  // Check session validity periodically
  useEffect(() => {
    if (status !== 'authenticated' || !session) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      logoutInProgressRef.current = false;
      return;
    }

    const checkSessionValidity = async () => {
      if (logoutInProgressRef.current) return;

      try {
        // Use a simple endpoint to verify session
        const response = await fetch('/api/user/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(session as any).accessToken || ''}`,
          },
        });

        console.log(`📡 [SessionManager] Session check response: ${response.status}`);

        if (response.status === 401 || response.status === 403) {
          console.warn(`⚠️ [SessionManager] Got ${response.status} - Session likely expired`);
          await performLogout(`API returned ${response.status}`);
        }
      } catch (error) {
        // Network errors don't necessarily mean session is expired
        // Only logout on explicit 401/403 responses
        console.debug('[SessionManager] Session check error:', error);
      }
    };

    // Check on mount
    checkSessionValidity();

    // Check every 10 minutes
    checkIntervalRef.current = setInterval(checkSessionValidity, 10 * 60 * 1000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [session, status, performLogout]);

  // Detect 401 errors from fetch calls
  useEffect(() => {
    if (status !== 'authenticated' || !session || logoutInProgressRef.current) return;

    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        // If we get 401 on non-auth API calls, session has expired
        const urlStr = args[0]?.toString() || '';
        const isAuthEndpoint = urlStr.includes('/auth/') || urlStr.includes('/api/auth');
        
        if (response.status === 401 && !isAuthEndpoint) {
          console.warn(`⚠️ [SessionManager] Got 401 on ${urlStr} - Session expired`);
          await performLogout('API returned 401 Unauthorized');
        }

        return response;
      } catch (error) {
        return originalFetch(...args);
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [session, status, performLogout]);

  return null;
}
