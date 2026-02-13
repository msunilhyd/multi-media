'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  duration?: number;
  onClose?: () => void;
}

export default function Toast({ message, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-[999] animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-green-600 text-white rounded-lg shadow-lg flex items-start gap-3 p-4 border border-green-500">
        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="flex-1 text-sm sm:text-base font-medium">{message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className="flex-shrink-0 text-green-200 hover:text-white transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
