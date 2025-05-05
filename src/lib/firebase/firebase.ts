
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// import { getAuth } from 'firebase/auth'; // Add if Auth is needed
// import { getStorage } from 'firebase/storage'; // Add if Storage is needed

// Your web app's Firebase configuration
// Ensure these environment variables are set in your .env.local file
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional: add if you need Analytics
};

// Initialize Firebase
let app;
// Check if Firebase app has already been initialized (singleton pattern)
// to prevent initializing multiple times, especially in development with HMR.
if (!getApps().length) {
  // Initialize Firebase if it hasn't been initialized yet
  app = initializeApp(firebaseConfig);
  console.log("Firebase initialized"); // Log confirmation for development/debugging
} else {
  // Use the existing Firebase app instance if it has already been initialized
  app = getApp();
}

// Get Firestore instance
const db = getFirestore(app);
// const auth = getAuth(app); // Uncomment if you need Firebase Authentication
// const storage = getStorage(app); // Uncomment if you need Firebase Storage

// Export the initialized services
export { db }; // Export other services like auth, storage as needed
