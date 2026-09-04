import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Critical: export db with firestoreDatabaseId if present, or standard
export const db: Firestore = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Safely guard Auth initialization to prevent Uncaught FirebaseError: auth/invalid-api-key
let authInstance: Auth | null = null;
try {
  const cfg = firebaseConfig as { apiKey?: string };
  const envKey = typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> }).env?.VITE_FIREBASE_API_KEY : undefined;
  if (cfg.apiKey || envKey) {
    authInstance = getAuth(app);
  }
} catch (err) {
  console.warn('Firebase Auth could not be initialized:', err);
}

export const auth = authInstance;
export default app;
