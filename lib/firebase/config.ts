import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCygZqrfMcMXZXAMoVEAKz30GWmCmsMi4I",
  authDomain: "foco-os---produtividade-bfb58.firebaseapp.com",
  projectId: "foco-os---produtividade-bfb58",
  storageBucket: "foco-os---produtividade-bfb58.firebasestorage.app",
  messagingSenderId: "569076440640",
  appId: "1:569076440640:web:12f9becde69b651fcc09a5",
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

if (typeof window !== 'undefined') {
  console.log('Firebase Connected! Project:', firebaseConfig.projectId);
}

export { auth, db, app };
