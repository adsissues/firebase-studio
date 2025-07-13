
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
// import { getStorage } from 'firebase/storage'; // Add if Storage is needed

// Your web app's Firebase configuration
// Ensure these environment variables are set in your .env.local file
//web config

// ========================================================================
// !! IMPORTANT !! -> Firebase API Key Error Fix
// ========================================================================
// The API key below ("REPLACE_WITH_YOUR_REAL_API_KEY") is a placeholder.
// You MUST replace it with your ACTUAL Firebase Web API Key from:
// Firebase Console -> Project Settings -> General -> Your apps -> Web app -> API Key
// Failure to do so will result in "auth/api-key-not-valid" errors and prevent Firebase services from working.
// ========================================================================
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyAr3ZqN5w1xOYYiSZEk12Cak74Ar_dR0Cs", // <-- PASTE YOUR REAL API KEY HERE
  authDomain: "shipshape-wbwno.firebaseapp.com",
  projectId: "shipshape-wbwno",
  storageBucket: "shipshape-wbwno.appspot.com",
  messagingSenderId: "151363841939",
  appId: "1:151363841939:web:e682165aa874215bed8266"
};
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional: add if you need Analytics


// Flag to track if the configuration is valid
let isFirebaseConfigValid = true;
const missingKeys: string[] = [];

// Validate required Firebase config keys more strictly
// Include common placeholder patterns
const requiredKeys: (keyof FirebaseOptions)[] = ['apiKey', 'authDomain', 'projectId'];
const placeholderPatterns = [/YOUR_/, /\[?YOUR/, /<YOUR/, /example/i, /__/, /REPLACE_/]; // Common placeholder patterns

for (const key of requiredKeys) {
  const value = firebaseConfig[key];
  if (!value || typeof value !== 'string' || value.trim() === '') {
    missingKeys.push(`Firebase config key: ${key}`);
    isFirebaseConfigValid = false;
  } else if (key === 'apiKey' && placeholderPatterns.some(pattern => pattern.test(value))) {
       // Check for placeholder patterns
       if (!missingKeys.includes(`apiKey (Placeholder)`)) {
          console.error(`***********************************************************`);
          console.error(`! FIREBASE CONFIGURATION ERROR !`);
          console.error(`The Firebase API Key is a placeholder value ("${value}") and WILL NOT WORK.`);
          console.error(`You MUST replace it with your actual Firebase API Key from the Firebase Console.`);
          console.error(`Firebase services cannot be initialized.`);
          console.error(`***********************************************************`);
          missingKeys.push(`apiKey (Placeholder)`);
       }
       isFirebaseConfigValid = false; // Mark config as INVALID if placeholder is used
  }
}

// Provide specific guidance if config is missing required keys (and not already marked invalid by placeholder)
if (isFirebaseConfigValid && missingKeys.length > 0) {
    console.error("***********************************************************");
    console.error("! FIREBASE CONFIGURATION ERROR !");
    console.error("Firebase initialization cannot proceed due to missing configuration.");
    console.error("Please ensure the following environment variables are set correctly in your .env.local file or firebaseConfig object:");
    missingKeys.forEach(key => console.error(`  - ${key}`));
    console.error("Refer to your Firebase project settings (Project settings > General > Your apps > Web app).");
    console.error("After adding/correcting the variables, restart the development server.");
    console.error("***********************************************************");
    isFirebaseConfigValid = false; // Mark as invalid if required keys are missing
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
          console.error("An error occurred during Firebase initialization. This often means the provided config values (API Key, Project ID, etc.) are incorrect, even if they are present.");
          console.error(`Firebase Error Code: ${error.code}`); // Log the specific Firebase error code
          console.error(`Firebase Error Message: ${error.message}`); // Log the specific Firebase error message
          console.error("Please double-check your Firebase project settings and the values in your .env.local or firebaseConfig object.");
          if (error.code === 'auth/invalid-api-key' || error.code?.includes('api-key-not-valid')) {
             console.error("The API Key provided is invalid. Ensure it's copied correctly from the Firebase console and that it's enabled for your web app.");
          }
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
    console.error("Firebase services (Firestore, Auth) will NOT be initialized due to INVALID configuration (Missing keys or Placeholder API Key).");
}


// Export the initialized services (or null if initialization failed)
// Also export the validity flag for components to check
export { db, auth, isFirebaseConfigValid };
