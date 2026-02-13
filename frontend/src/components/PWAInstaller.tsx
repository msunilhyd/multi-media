'use client';

import { useEffect } from 'react';

export default function PWAInstaller() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js', {
          scope: '/',
        })
        .then((registration) => {
          console.log('✅ PWA: Service Worker registered successfully');
          console.log('📍 Scope:', registration.scope);

          // Check for updates periodically
          const interval = setInterval(() => {
            registration.update();
          }, 60000); // Check every minute

          return () => clearInterval(interval);
        })
        .catch((error) => {
          console.error('❌ PWA: Service Worker registration failed:', error);
        });

      // Handle service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 PWA: Service Worker updated');
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('📨 PWA: Message from Service Worker:', event.data);
      });
    }

    // Test MediaSession API support
    if ('mediaSession' in navigator) {
      console.log('✅ PWA: MediaSession API supported');
      console.log('📋 Supported actions:');
      ['play', 'pause', 'previoustrack', 'nexttrack', 'seekbackward', 'seekforward', 'skipad'].forEach(
        (action) => {
          try {
            navigator.mediaSession.setActionHandler(action as any, () => {});
            console.log(`  ✓ ${action}`);
          } catch (e) {
            console.log(`  ✗ ${action}`);
          }
        }
      );
    } else {
      console.warn('⚠️ PWA: MediaSession API not supported on this browser');
    }
  }, []);

  return null;
}
