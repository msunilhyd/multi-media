'use client';

import { SessionProvider } from 'next-auth/react';
import SessionManager from './SessionManager';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionManager />
      {children}
    </SessionProvider>
  );
}