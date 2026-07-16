import { useAuth } from './AuthContext';

export function LoginButton() {
  const { user, signInWithGoogle, signOut } = useAuth();

  if (user) {
    return (
      <div className="flex items-center gap-3">
        {user.photoURL && (
          <img src={user.photoURL} alt={user.displayName ?? 'User'} className="h-8 w-8 rounded-full ring-2 ring-white/40" />
        )}
        <span className="text-sm text-white">{user.displayName}</span>
        <button
          onClick={() => signOut()}
          className="rounded-md border border-white/40 px-3 py-1.5 text-sm text-white hover:bg-white/10"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signInWithGoogle()}
      className="rounded-md bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
    >
      Sign in with Google
    </button>
  );
}
