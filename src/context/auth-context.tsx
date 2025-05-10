"use client";

import * as React from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'; // Added setDoc and serverTimestamp
import { auth, db, isFirebaseConfigValid } from '@/lib/firebase/firebase';
import type { AppUser } from '@/types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    if (!isFirebaseConfigValid) {
      console.warn("AuthContext: Firebase is not configured correctly. Skipping authentication checks.");
      setLoading(false);
      setUser(null);
      setIsAdmin(false);
      return;
    }

     if (!auth) {
         console.error("AuthContext: Firebase Auth service is not available. Cannot listen for auth state changes.");
         setLoading(false);
         setUser(null);
         setIsAdmin(false);
         return;
     }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
         if (!db) {
             console.error("AuthContext: Firestore service is not available. Cannot fetch or create user role.");
              const basicUser: AppUser = {
                    ...firebaseUser, uid: firebaseUser.uid, email: firebaseUser.email,
                    displayName: firebaseUser.displayName, photoURL: firebaseUser.photoURL, emailVerified: firebaseUser.emailVerified,
                    isAnonymous: firebaseUser.isAnonymous, metadata: firebaseUser.metadata, providerData: firebaseUser.providerData,
                    refreshToken: firebaseUser.refreshToken, tenantId: firebaseUser.tenantId, delete: firebaseUser.delete,
                    getIdToken: firebaseUser.getIdToken, getIdTokenResult: firebaseUser.getIdTokenResult,
                    reload: firebaseUser.reload, toJSON: firebaseUser.toJSON,
                    role: 'user'
                 };
             setUser(basicUser);
             setIsAdmin(false);
             setLoading(false);
             return;
         }

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          let appUser: AppUser;
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            appUser = {
              ...firebaseUser, uid: firebaseUser.uid, email: firebaseUser.email,
              displayName: firebaseUser.displayName, photoURL: firebaseUser.photoURL, emailVerified: firebaseUser.emailVerified,
              isAnonymous: firebaseUser.isAnonymous, metadata: firebaseUser.metadata, providerData: firebaseUser.providerData,
              refreshToken: firebaseUser.refreshToken, tenantId: firebaseUser.tenantId, delete: firebaseUser.delete,
              getIdToken: firebaseUser.getIdToken, getIdTokenResult: firebaseUser.getIdTokenResult,
              reload: firebaseUser.reload, toJSON: firebaseUser.toJSON,
              role: userData.role || 'user',
            };
            console.log("User document found in Firestore:", appUser);
          } else {
            // User document doesn't exist, create it with default role 'user'
            console.log(`User document for ${firebaseUser.uid} not found. Creating with default role 'user'.`);
            const newUserProfileData = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email, // Use email if displayName is null
              photoURL: firebaseUser.photoURL || null,
              role: 'user',
              createdAt: serverTimestamp(), // Add a timestamp for when the profile was created
              lastLoginAt: serverTimestamp(), // Track last login
            };
            await setDoc(userDocRef, newUserProfileData);
            appUser = {
                ...firebaseUser, uid: firebaseUser.uid, email: firebaseUser.email,
                displayName: firebaseUser.displayName, photoURL: firebaseUser.photoURL, emailVerified: firebaseUser.emailVerified,
                isAnonymous: firebaseUser.isAnonymous, metadata: firebaseUser.metadata, providerData: firebaseUser.providerData,
                refreshToken: firebaseUser.refreshToken, tenantId: firebaseUser.tenantId, delete: firebaseUser.delete,
                getIdToken: firebaseUser.getIdToken, getIdTokenResult: firebaseUser.getIdTokenResult,
                reload: firebaseUser.reload, toJSON: firebaseUser.toJSON,
                role: 'user' // Default role after creation
             };
            console.log("New user document created in Firestore:", appUser);
          }
          setUser(appUser);
          setIsAdmin(appUser.role === 'admin');
        } catch (error) {
          console.error("Error fetching or creating user profile in Firestore:", error);
           const errorUser: AppUser = {
                ...firebaseUser, uid: firebaseUser.uid, email: firebaseUser.email,
                displayName: firebaseUser.displayName, photoURL: firebaseUser.photoURL, emailVerified: firebaseUser.emailVerified,
                isAnonymous: firebaseUser.isAnonymous, metadata: firebaseUser.metadata, providerData: firebaseUser.providerData,
                refreshToken: firebaseUser.refreshToken, tenantId: firebaseUser.tenantId, delete: firebaseUser.delete,
                getIdToken: firebaseUser.getIdToken, getIdTokenResult: firebaseUser.getIdTokenResult,
                reload: firebaseUser.reload, toJSON: firebaseUser.toJSON,
                role: 'user'
             };
          setUser(errorUser);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        console.log("User logged out.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => React.useContext(AuthContext);
