
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // Import getAuth
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

// Validate required Firebase config keys
const requiredKeys: (keyof FirebaseOptions)[] = ['apiKey', 'authDomain', 'projectId'];
for (const key of requiredKeys) {
  if (!firebaseConfig[key]) {
    missingKeys.push(`NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}`);
    isFirebaseConfigValid = false;
  }
}

// Removed the check for placeholder API keys that caused the console error.
// The check above for missing keys is sufficient for basic validation.
// If needed, a warning (not error) about placeholder keys could be added back carefully.

if (!isFirebaseConfigValid) {
    console.error("***********************************************************");
    console.error("! FIREBASE CONFIGURATION ERROR !");
    console.error("Firebase initialization cannot proceed due to missing configuration.");
    console.error("Please ensure the following environment variables are set correctly in your .env.local file:");
    missingKeys.forEach(key => console.error(`  - ${key}`));
    console.error("Refer to your Firebase project settings (Project settings > General > Your apps > Web app).");
    console.error("After adding the variables, restart the development server.");
    console.error("***********************************************************");
    // Don't throw an error here to allow the app to potentially load,
    // but Firebase features will fail.
}


// Initialize Firebase
let app;
let db: any = null; // Initialize db and auth as null initially
let auth: any = null;

// Only attempt initialization if config is valid
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
          console.error("An error occurred during Firebase initialization, likely due to invalid config values:");
          console.error(error.message); // Log the specific Firebase error
           console.error("Double-check your Firebase project settings and the values in .env.local.");
          console.error("***********************************************************");
          // Set services to null again to indicate failure
          db = null;
          auth = null;
          isFirebaseConfigValid = false; // Mark as invalid if initialization fails
      }
    } else {
      app = getApp();
      db = getFirestore(app);
      auth = getAuth(app);
      // storage = getStorage(app); // Uncomment if needed
      console.log("Using existing Firebase app instance.");
    }
} else {
    console.warn("Firebase services (Firestore, Auth) are not initialized due to configuration errors.");
}


// Export the initialized services (or null if initialization failed)
export { db, auth, isFirebaseConfigValid };
