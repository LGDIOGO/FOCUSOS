import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase with strict check to avoid build-time crashes on Vercel
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('AIza');
const app = getApps().length > 0 ? getApp() : (isConfigValid ? initializeApp(firebaseConfig) : null);
const auth = app ? getAuth(app) : null as any;
const db = app ? getFirestore(app) : null as any;

if (typeof window !== 'undefined') {
  console.log('Firebase Connected! Project:', firebaseConfig.projectId);
}

export { auth, db, app };
