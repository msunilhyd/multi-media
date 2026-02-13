'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function SessionExpiredNotice() {
  const searchParams = useSearchParams();
  const reason = searchParams?.get('reason');
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (reason === 'session_expired') {
      setShow(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setShow(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [reason]);

  if (!show) return null;

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-[999] animate-in fade-in slide-in-from-top-4">
      <div className="bg-orange-600 text-white rounded-lg shadow-lg flex items-start gap-3 p-4 border border-orange-500">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium">Session Expired</p>
          <p className="text-sm text-orange-100 mt-1">
            Your session expired due to inactivity. Please log in again to continue.
          </p>
        </div>
      </div>
    </div>
  );
}
