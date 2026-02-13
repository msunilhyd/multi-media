'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function PWAInstaller() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(isMobileDevice);
      
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIOSDevice);
      
      return isMobileDevice;
    };

    const isMobileDevice = checkMobile();

    // Only proceed if on mobile and not already installed as PWA
    if (isMobileDevice && !(navigator as any).standalone) {
      // Check if user has dismissed prompt recently
      const dismissedTime = localStorage.getItem('pwaPromptDismissed');
      if (dismissedTime) {
        const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
          // Don't show if dismissed in last 7 days
          return;
        }
      }

      // For Android: listen for beforeinstallprompt
      if (!isIOS) {
        const handleBeforeInstallPrompt = (e: Event) => {
          e.preventDefault();
          setDeferredPrompt(e);
          setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => {
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
      } else {
        // For iOS: show prompt immediately
        setTimeout(() => {
          setShowPrompt(true);
        }, 2000); // Show after 2 seconds for better UX
      }
    }

    // Register service worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
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

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwaPromptDismissed', Date.now().toString());
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-sm w-full border border-purple-500">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500">
          <div>
            <h2 className="text-xl font-bold text-white">Install LinusPlaylists</h2>
            <p className="text-sm text-gray-300 mt-1">Get the best experience</p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Icon/Emoji */}
            <div className="text-center">
              <span className="text-5xl">🎵</span>
            </div>

            {/* Description */}
            <p className="text-gray-300 text-center">
              Install LinusPlaylists on your {isIOS ? 'iPhone' : 'phone'} for:
            </p>

            {/* Features */}
            <ul className="space-y-2 text-sm">
              <li className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-3">✓</span>
                Background music playback
              </li>
              <li className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-3">✓</span>
                Lock screen controls
              </li>
              <li className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-3">✓</span>
                One-tap access to your home screen
              </li>
              <li className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-3">✓</span>
                Works offline
              </li>
            </ul>

            {/* Platform-specific instructions */}
            {isIOS && (
              <div className="bg-gray-700 rounded p-4 text-xs text-gray-300 space-y-2">
                <p className="font-semibold text-white">How to install on iPhone:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap the Share button at the bottom</li>
                  <li>Select "Add to Home Screen"</li>
                  <li>Tap "Add" to confirm</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-purple-500">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors font-medium"
          >
            Not Now
          </button>
          {!isIOS ? (
            <button
              onClick={handleInstall}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors font-medium"
            >
              Install
            </button>
          ) : (
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors font-medium"
            >
              Got it!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
