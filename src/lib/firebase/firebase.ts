
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
// import { getStorage } from 'firebase/storage'; // Add if Storage is needed

// Your web app's Firebase configuration
// Ensure these environment variables are set in your .env.local file
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional: add if you need Analytics
};

// Flag to track if the configuration is valid
let isFirebaseConfigValid = true;
const missingKeys: string[] = [];

// Validate required Firebase config keys more strictly
// Include common placeholder patterns
const requiredKeys: (keyof FirebaseOptions)[] = ['apiKey', 'authDomain', 'projectId'];
const placeholderPatterns = [/YOUR_/, /\[?YOUR/, /<YOUR/, /example/i, /__/]; // Common placeholder patterns

for (const key of requiredKeys) {
  const value = firebaseConfig[key];
  if (!value || typeof value !== 'string' || value.trim() === '') {
    missingKeys.push(`NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}`);
    isFirebaseConfigValid = false;
  } else if (key === 'apiKey' && placeholderPatterns.some(pattern => pattern.test(value))) {
     // Specifically check apiKey for placeholders
     console.error(`***********************************************************`);
     console.error(`! FIREBASE CONFIGURATION WARNING !`);
     console.error(`NEXT_PUBLIC_FIREBASE_API_KEY ("${value}") looks like a placeholder.`);
     console.error(`Please replace it with your actual Firebase API key from your project settings.`);
     console.error(`***********************************************************`);
     isFirebaseConfigValid = false; // Treat placeholder API key as invalid for auth/firestore
     if (!missingKeys.includes(`NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}`)) {
        missingKeys.push(`NEXT_PUBLIC_FIREBASE_${key.toUpperCase()} (Placeholder)`);
     }
  }
}

// Provide specific guidance if config is invalid
if (!isFirebaseConfigValid) {
    console.error("***********************************************************");
    console.error("! FIREBASE CONFIGURATION ERROR !");
    console.error("Firebase initialization cannot proceed due to missing or invalid configuration.");
    console.error("Please ensure the following environment variables are set correctly in your .env.local file:");
    missingKeys.forEach(key => console.error(`  - ${key}`));
    console.error("Refer to your Firebase project settings (Project settings > General > Your apps > Web app).");
    console.error("After adding/correcting the variables, restart the development server.");
    console.error("***********************************************************");
}


// Initialize Firebase
let app;
// Use specific types for db and auth, initialized to null
let db: Firestore | null = null;
let auth: Auth | null = null;
// let storage = null; // Initialize if needed

// Only attempt initialization if config is deemed valid *before* trying to initialize
if (isFirebaseConfigValid) {
    if (!getApps().length) {
      try {
          app = initializeApp(firebaseConfig);
          db = getFirestore(app);
          auth = getAuth(app);
          // storage = getStorage(app); // Uncomment if needed
          console.log("Firebase initialized successfully.");
      } catch (error: any) {
          console.error("***********************************************************");
          console.error("! FIREBASE INITIALIZATION FAILED !");
          console.error("An error occurred during Firebase initialization. This often means the provided config values (API Key, Project ID, etc.) are incorrect, even if they are present and not placeholders.");
          console.error("Firebase Error:", error.message); // Log the specific Firebase error
          console.error("Please double-check your Firebase project settings and the values in your .env.local file.");
          console.error("Specifically, ensure the API Key is valid and enabled for your web app in the Firebase console.");
          console.error("***********************************************************");
          // Set services to null again to indicate failure and mark config as invalid
          db = null;
          auth = null;
          isFirebaseConfigValid = false; // Mark as invalid if initialization fails
      }
    } else {
      app = getApp();
      // Ensure db and auth are re-assigned even if using existing app
      try {
          db = getFirestore(app);
          auth = getAuth(app);
          // storage = getStorage(app); // Uncomment if needed
          console.log("Using existing Firebase app instance.");
      } catch (error: any) {
          console.error("Error getting services from existing Firebase app instance:", error);
          db = null;
          auth = null;
          isFirebaseConfigValid = false;
      }
    }
} else {
    // Log warning if the initial config check failed
    console.warn("Firebase services (Firestore, Auth) will not be initialized due to configuration errors.");
}


// Export the initialized services (or null if initialization failed)
// Also export the validity flag for components to check
export { db, auth, isFirebaseConfigValid };
