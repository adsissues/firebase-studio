
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth'; // Import getAuth and Auth type
import { Firestore } from 'firebase/firestore'; // Import Firestore type
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
const requiredKeys: (keyof FirebaseOptions)[] = ['apiKey', 'authDomain', 'projectId'];
for (const key of requiredKeys) {
  if (!firebaseConfig[key] || firebaseConfig[key]?.trim() === '') {
    missingKeys.push(`NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}`);
    isFirebaseConfigValid = false;
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
    console.error("After adding the variables, restart the development server.");
    console.error("***********************************************************");
    // Throw an error to prevent the app from proceeding with invalid config
    // throw new Error("Firebase configuration is invalid or incomplete. Cannot initialize Firebase services.");
    // Note: Throwing here might break the build in some CI environments. Logging might be preferred.
}


// Initialize Firebase
let app;
// Use specific types for db and auth, initialized to null
let db: Firestore | null = null;
let auth: Auth | null = null;

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
          console.error("Firebase Error:", error.message); // Log the specific Firebase error
          console.error("Please double-check your Firebase project settings and the values in your .env.local file.");
          console.error("Specifically, ensure the API Key is valid for your project.");
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
}

// Only log warning if initialization was attempted but failed, or if initial check failed
if (!isFirebaseConfigValid) {
    console.warn("Firebase services (Firestore, Auth) are not available due to configuration errors or initialization failure.");
}


// Export the initialized services (or null if initialization failed)
// Also export the validity flag for components to check
export { db, auth, isFirebaseConfigValid };
