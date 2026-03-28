import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCygZqrfMcMXZXAMoVEAKz30GWmCmsMi4I",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "foco-os---produtividade-bfb58.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "foco-os---produtividade-bfb58",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "foco-os---produtividade-bfb58.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "569076440640",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:569076440640:web:12f9becde69b651fcc09a5"
};

// Initialize Firebase with strict check to avoid build-time crashes on Vercel
const isConfigValid = !!(firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('AIza'));

let app: any;
let auth: any;
let db: any;

try {
  if (getApps().length > 0) {
    app = getApp();
  } else if (isConfigValid) {
    app = initializeApp(firebaseConfig);
    if (typeof window !== 'undefined') {
      console.log('Firebase Connected! Project:', firebaseConfig.projectId);
    }
  }
  
  if (app) {
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export { auth, db, app };
