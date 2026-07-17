import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { LoginButton } from './LoginButton';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-4 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 px-10 py-8 shadow-md">
          <p className="text-sm text-indigo-100">Sign in to continue</p>
          <LoginButton />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
