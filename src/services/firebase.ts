import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Values are injected from .env.local — see .env.example for required keys.
// Never commit real Firebase config values.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Diagnostic only — Vite bakes these values in at BUILD time, so if env
// vars were added/changed in Cloudflare after the first build, the live
// bundle can still be running with stale or blank config. Check this log
// in prod to confirm projectId matches your actual Firebase project.
if (!firebaseConfig.projectId) {
  console.error(
    'Firebase projectId is missing — env vars were likely not present at build time. ' +
      'Add them in Cloudflare Pages → Settings → Environment variables (Production scope) and trigger a fresh deploy.'
  );
} else {
  console.info('[Firebase] Connected project:', firebaseConfig.projectId);
}
