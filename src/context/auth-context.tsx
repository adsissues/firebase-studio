
"use client";

import * as React from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigValid } from '@/lib/firebase/firebase'; // Import isFirebaseConfigValid
import type { AppUser } from '@/types'; // Use AppUser type

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isAdmin: boolean; // Add isAdmin flag
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true, // Start as true until config check and auth check complete
  isAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    // If Firebase config is invalid, don't attempt to listen for auth changes.
    // Set loading to false immediately.
    if (!isFirebaseConfigValid) {
      console.warn("AuthContext: Firebase is not configured. Skipping authentication checks.");
      setLoading(false);
      setUser(null);
      setIsAdmin(false);
      return; // Exit early
    }

    // Proceed with auth state listener only if config is valid
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in, fetch additional user data (like role) from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            // Combine Firebase user data with Firestore data (role)
            const appUser: AppUser = {
              ...firebaseUser, // Spread properties from FirebaseUser
              uid: firebaseUser.uid, // Ensure uid is explicitly included
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              emailVerified: firebaseUser.emailVerified,
              isAnonymous: firebaseUser.isAnonymous,
              metadata: firebaseUser.metadata,
              providerData: firebaseUser.providerData,
              refreshToken: firebaseUser.refreshToken,
              tenantId: firebaseUser.tenantId,
              delete: firebaseUser.delete,
              getIdToken: firebaseUser.getIdToken,
              getIdTokenResult: firebaseUser.getIdTokenResult,
              reload: firebaseUser.reload,
              toJSON: firebaseUser.toJSON,
              // --- Add custom properties ---
              role: userData.role || 'user', // Default to 'user' if role doesn't exist
            };
            setUser(appUser);
            setIsAdmin(appUser.role === 'admin'); // Check if the role is admin
            console.log("User logged in:", appUser);
          } else {
            // User document doesn't exist in Firestore yet (might be first login)
            // Treat as a basic user for now, or handle role assignment logic
             const basicUser: AppUser = {
                ...firebaseUser,
                uid: firebaseUser.uid, // Ensure uid is explicitly included
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                emailVerified: firebaseUser.emailVerified,
                isAnonymous: firebaseUser.isAnonymous,
                metadata: firebaseUser.metadata,
                providerData: firebaseUser.providerData,
                refreshToken: firebaseUser.refreshToken,
                tenantId: firebaseUser.tenantId,
                delete: firebaseUser.delete,
                getIdToken: firebaseUser.getIdToken,
                getIdTokenResult: firebaseUser.getIdTokenResult,
                reload: firebaseUser.reload,
                toJSON: firebaseUser.toJSON,
                role: 'user' // Assign default role
             };
            setUser(basicUser);
            setIsAdmin(false);
            console.log("User logged in (no Firestore doc yet):", basicUser);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          // Handle error, maybe sign out user or set default role
           const errorUser: AppUser = {
                ...firebaseUser,
                uid: firebaseUser.uid, // Ensure uid is explicitly included
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                emailVerified: firebaseUser.emailVerified,
                isAnonymous: firebaseUser.isAnonymous,
                metadata: firebaseUser.metadata,
                providerData: firebaseUser.providerData,
                refreshToken: firebaseUser.refreshToken,
                tenantId: firebaseUser.tenantId,
                delete: firebaseUser.delete,
                getIdToken: firebaseUser.getIdToken,
                getIdTokenResult: firebaseUser.getIdTokenResult,
                reload: firebaseUser.reload,
                toJSON: firebaseUser.toJSON,
                role: 'user' // Assign default role on error
             };
          setUser(errorUser);
          setIsAdmin(false);
        }
      } else {
        // User is signed out
        setUser(null);
        setIsAdmin(false);
        console.log("User logged out.");
      }
      setLoading(false); // Set loading to false after auth check completes
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Dependency array is empty, runs once on mount after config check

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the AuthContext
export const useAuth = () => React.useContext(AuthContext);

