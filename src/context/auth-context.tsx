"use client";

import * as React from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore'; // Added updateDoc
import { auth, db, isFirebaseConfigValid } from '@/lib/firebase/firebase';
import type { AppUser } from '@/types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  assignedLocations: string[]; // Added assignedLocations
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  assignedLocations: [], // Default to empty array
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [assignedLocations, setAssignedLocations] = React.useState<string[]>([]); // State for assigned locations

  React.useEffect(() => {
    if (!isFirebaseConfigValid) {
      console.warn("AuthContext: Firebase is not configured correctly. Skipping authentication checks.");
      setLoading(false);
      setUser(null);
      setIsAdmin(false);
      setAssignedLocations([]);
      return;
    }

     if (!auth) {
         console.error("AuthContext: Firebase Auth service is not available. Cannot listen for auth state changes.");
         setLoading(false);
         setUser(null);
         setIsAdmin(false);
         setAssignedLocations([]);
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
                    role: 'user',
                    assignedLocations: [], // Add default assignedLocations
                 };
             setUser(basicUser);
             setIsAdmin(false);
             setAssignedLocations([]);
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
              assignedLocations: userData.assignedLocations || [], // Fetch assignedLocations
            };
            // Update lastLoginAt without overwriting other fields
            await updateDoc(userDocRef, { lastLoginAt: serverTimestamp() });
            console.log("User document found in Firestore:", appUser);
          } else {
            // User document doesn't exist, create it with default role 'user'
            console.log(`User document for ${firebaseUser.uid} not found. Creating with default role 'user'.`);
            const newUserProfileData = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email, 
              photoURL: firebaseUser.photoURL || null,
              role: 'user',
              assignedLocations: [], // Initialize with empty array
              createdAt: serverTimestamp(), 
              lastLoginAt: serverTimestamp(), 
            };
            await setDoc(userDocRef, newUserProfileData);
            appUser = {
                ...firebaseUser, uid: firebaseUser.uid, email: firebaseUser.email,
                displayName: firebaseUser.displayName, photoURL: firebaseUser.photoURL, emailVerified: firebaseUser.emailVerified,
                isAnonymous: firebaseUser.isAnonymous, metadata: firebaseUser.metadata, providerData: firebaseUser.providerData,
                refreshToken: firebaseUser.refreshToken, tenantId: firebaseUser.tenantId, delete: firebaseUser.delete,
                getIdToken: firebaseUser.getIdToken, getIdTokenResult: firebaseUser.getIdTokenResult,
                reload: firebaseUser.reload, toJSON: firebaseUser.toJSON,
                role: 'user', // Default role after creation
                assignedLocations: [], // Default assignedLocations
             };
            console.log("New user document created in Firestore:", appUser);
          }
          setUser(appUser);
          setIsAdmin(appUser.role === 'admin');
          setAssignedLocations(appUser.assignedLocations || []);
        } catch (error) {
          console.error("Error fetching or creating user profile in Firestore:", error);
           const errorUser: AppUser = {
                ...firebaseUser, uid: firebaseUser.uid, email: firebaseUser.email,
                displayName: firebaseUser.displayName, photoURL: firebaseUser.photoURL, emailVerified: firebaseUser.emailVerified,
                isAnonymous: firebaseUser.isAnonymous, metadata: firebaseUser.metadata, providerData: firebaseUser.providerData,
                refreshToken: firebaseUser.refreshToken, tenantId: firebaseUser.tenantId, delete: firebaseUser.delete,
                getIdToken: firebaseUser.getIdToken, getIdTokenResult: firebaseUser.getIdTokenResult,
                reload: firebaseUser.reload, toJSON: firebaseUser.toJSON,
                role: 'user',
                assignedLocations: [], // Default assignedLocations
             };
          setUser(errorUser);
          setIsAdmin(false);
          setAssignedLocations([]);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setAssignedLocations([]);
        console.log("User logged out.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, assignedLocations }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => React.useContext(AuthContext);

