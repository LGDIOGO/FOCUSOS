import * as admin from 'firebase-admin';

const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "foco-os---produtividade-bfb58",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  try {
    if (firebaseAdminConfig.clientEmail && firebaseAdminConfig.privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseAdminConfig as any),
      });
    } else {
      // Fallback for local development if envs are missing but we are authenticated via CLI
      admin.initializeApp({
        projectId: firebaseAdminConfig.projectId,
      });
    }
    console.log('Firebase Admin Initialized');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
