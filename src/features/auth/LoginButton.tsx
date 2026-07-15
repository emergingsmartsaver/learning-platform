import { useAuth } from './AuthContext';

export function LoginButton() {
  const { user, signInWithGoogle, signOut } = useAuth();

  if (user) {
    return (
      <div className="flex items-center gap-3">
        {user.photoURL && (
          <img src={user.photoURL} alt={user.displayName ?? 'User'} className="h-8 w-8 rounded-full" />
        )}
        <span className="text-sm text-slate-700">{user.displayName}</span>
        <button
          onClick={() => signOut()}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signInWithGoogle()}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
    >
      Sign in with Google
    </button>
  );
}
