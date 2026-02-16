'use client';

import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';

export default function PWAInstaller() {
  const [showMobilePrompt, setShowMobilePrompt] = useState(false);
  const [showDesktopPrompt, setShowDesktopPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    
    setIsMobile(isMobileDevice);
    setIsIOS(isIOSDevice);

    // Check if already installed as PWA
    const isPWAInstalled = (navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isPWAInstalled) {
      console.log('✅ PWA: Application already installed');
      return;
    }

    // Check if user has dismissed prompt recently
    const dismissedTime = localStorage.getItem('pwaPromptDismissed');
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 2) {
        console.log('⏭️ PWA: Prompt dismissed recently');
        return;
      }
    }

    // Handle beforeinstallprompt event for Android and Desktop Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      if (isMobileDevice && !isIOSDevice) {
        console.log('📲 PWA: beforeinstallprompt event fired on Android');
        setTimeout(() => {
          setShowMobilePrompt(true);
        }, 1500);
      } else if (!isMobileDevice) {
        console.log('🖥️ PWA: beforeinstallprompt event fired on desktop');
        setShowDesktopPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS: show instructions after delay
    if (isIOSDevice && isMobileDevice) {
      setTimeout(() => {
        setShowMobilePrompt(true);
      }, 2000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Register service worker
  useEffect(() => {
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
          }, 60000);

          return () => clearInterval(interval);
        })
        .catch((error) => {
          console.error('❌ PWA: Service Worker registration failed:', error);
        });

      // Handle service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 PWA: Service Worker updated');
      });
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`✅ PWA: User response: ${outcome}`);
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowMobilePrompt(false);
        setShowDesktopPrompt(false);
        localStorage.setItem('pwaPromptDismissed', Date.now().toString());
      }
    }
  };

  const handleDismiss = () => {
    setShowMobilePrompt(false);
    setShowDesktopPrompt(false);
    localStorage.setItem('pwaPromptDismissed', Date.now().toString());
  };

  // Mobile Prompt (Android + iOS)
  if (showMobilePrompt && isMobile) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end z-50 sm:items-center sm:justify-center p-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-purple-500 sm:mb-0 mb-0 animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-purple-500/30">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">Install LinusPlaylists</h2>
              <p className="text-sm text-gray-300 mt-1">Get the full experience</p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-white transition-colors ml-4 flex-shrink-0"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-4">
              {/* Icon */}
              <div className="text-center">
                <span className="text-6xl">⚡</span>
              </div>

              {/* Description */}
              <p className="text-gray-300 text-center font-medium">
                Install on your {isIOS ? 'iPhone' : 'home screen'} for instant access
              </p>

              {/* Features */}
              <ul className="space-y-2 text-sm">
                <li className="flex items-start text-gray-300">
                  <span className="text-purple-400 mr-3 font-bold text-lg">✓</span>
                  <span>Fast access from home screen</span>
                </li>
                <li className="flex items-start text-gray-300">
                  <span className="text-purple-400 mr-3 font-bold text-lg">✓</span>
                  <span>Works offline</span>
                </li>
                <li className="flex items-start text-gray-300">
                  <span className="text-purple-400 mr-3 font-bold text-lg">✓</span>
                  <span>Background playback</span>
                </li>
                <li className="flex items-start text-gray-300">
                  <span className="text-purple-400 mr-3 font-bold text-lg">✓</span>
                  <span>Lock screen controls</span>
                </li>
              </ul>

              {/* Platform-specific instructions and actions */}
              {isIOS ? (
                <>
                  {/* iOS Step-by-step instructions */}
                  <div className="space-y-3 mt-4">
                    <p className="font-semibold text-blue-300 text-sm">📱 3 Simple Steps:</p>
                    
                    <div className="bg-blue-600/20 border border-blue-500/50 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                        <div className="flex-1">
                          <p className="font-medium text-white text-sm mb-1">Tap Share</p>
                          <p className="text-xs text-gray-300">Look for the box with an arrow at the bottom of your screen</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-600/20 border border-blue-500/50 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                        <div className="flex-1">
                          <p className="font-medium text-white text-sm mb-1">Find "Add to Home Screen"</p>
                          <p className="text-xs text-gray-300">Scroll down if you don't see it immediately</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-600/20 border border-blue-500/50 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                        <div className="flex-1">
                          <p className="font-medium text-white text-sm mb-1">Tap "Add"</p>
                          <p className="text-xs text-gray-300">That's it! App appears on your home screen</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-purple-600/20 border border-purple-500/50 rounded-lg p-4 text-sm text-gray-200">
                  <p className="font-semibold text-purple-300 mb-2">✨ One-click installation</p>
                  <p className="text-xs text-gray-300">Click the Install button below to add LinusPlaylists to your home screen instantly</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 border-t border-purple-500/30 bg-gray-900/50">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium text-sm"
            >
              {isIOS ? 'Ready!' : 'Later'}
            </button>
            {!isIOS && deferredPrompt && (
              <button
                onClick={handleInstall}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all font-medium text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <Download size={18} />
                Install Now
              </button>
            )}
            {isIOS && (
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg transition-all font-medium text-sm shadow-lg"
              >
                Understood
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop Prompt
  if (showDesktopPrompt && !isMobile && deferredPrompt) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-purple-500/50 max-w-sm p-5 animate-in slide-in-from-bottom-5">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 text-4xl">⚡</div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-base mb-2">Install LinusPlaylists</h3>
              <p className="text-sm text-gray-300 mb-4">
                Add to your desktop for instant access, offline support, and background playback.
              </p>
              
              {/* Benefits */}
              <ul className="text-xs text-gray-400 space-y-1.5 mb-4">
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">✓</span>
                  <span>App-like experience</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">✓</span>
                  <span>Works offline</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">✓</span>
                  <span>Background playback</span>
                </li>
              </ul>
              
              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="flex-1 px-3 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all font-semibold text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download size={16} />
                  Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium text-sm"
                >
                  Later
                </button>
              </div>
            </div>
            
            {/* Close */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
