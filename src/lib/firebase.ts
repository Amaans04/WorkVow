import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Log Firebase config for debugging (without sensitive info)
console.log('Firebase config loaded:', {
  hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  configValid: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
              !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN && 
              !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
});

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize FCM if browser supports it
let messaging: any = null;

// Only initialize messaging on the client side and if supported
if (typeof window !== 'undefined') {
  isSupported().then((isSupported: boolean) => {
    if (isSupported) {
      messaging = getMessaging(app);
    }
  }).catch(err => {
    console.error("Error checking messaging support:", err);
  });
}

// Check if we should use emulators
const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

// Set up emulators for local development
if (typeof window !== 'undefined' && useEmulator) {
  try {
    // Check if emulators are available by making a test request
    const checkEmulatorAvailability = async () => {
      try {
        const authEmulatorUrl = 'http://localhost:9099';
        const response = await fetch(`${authEmulatorUrl}/emulator/v1/projects/${firebaseConfig.projectId}:accessToken`, {
          method: 'OPTIONS'
        });
        
        if (response.ok || response.status === 204) {
          // Auth emulator
          connectAuthEmulator(auth, authEmulatorUrl);
          
          // Firestore emulator
          connectFirestoreEmulator(db, 'localhost', 8080);
          
          console.log('Successfully connected to Firebase emulators');
        } else {
          console.log('Firebase emulators not available, using production Firebase');
        }
      } catch (error) {
        console.log('Firebase emulators not available, using production Firebase');
      }
    };
    
    checkEmulatorAvailability();
  } catch (error) {
    console.error("Error connecting to Firebase emulators:", error);
  }
}

console.log('Firebase initialized successfully');

export { app, auth, db, messaging }; 