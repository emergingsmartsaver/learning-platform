import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { LoginButton } from './LoginButton';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-slate-600">Sign in to continue</p>
        <LoginButton />
      </div>
    );
  }

  return <>{children}</>;
}
