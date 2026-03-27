import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCygZqrfMcMXZXAMoVEAKz30GWmCmsMi4I",
  authDomain: "foco-os---produtividade-bfb58.firebaseapp.com",
  projectId: "foco-os---produtividade-bfb58",
  storageBucket: "foco-os---produtividade-bfb58.firebasestorage.app",
  messagingSenderId: "569076440640",
  appId: "1:569076440640:web:12f9becde69b651fcc09a5"
};

// Initialize Firebase with strict check to avoid build-time crashes on Vercel
// RE-DEPLOY TRIGGER: Pick up NEXT_PUBLIC_FIREBASE keys from Vercel dashboard.
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('AIza');
const app = getApps().length > 0 ? getApp() : (isConfigValid ? initializeApp(firebaseConfig) : null);
const auth = app ? getAuth(app) : null as any;
const db = app ? getFirestore(app) : null as any;

if (typeof window !== 'undefined') {
  console.log('Firebase Connected! Project:', firebaseConfig.projectId);
}

export { auth, db, app };
