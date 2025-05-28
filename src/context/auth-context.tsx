
"use client";

import * as React from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth'; // Added signOut
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigValid } from '@/lib/firebase/firebase';
import type { AppUser } from '@/types';
import { useToast } from "@/hooks/use-toast"; // Added useToast

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  assignedLocations: string[];
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  assignedLocations: [],
});

// Define the inactivity timeout duration (e.g., 30 minutes in milliseconds)
const INACTIVITY_TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [assignedLocations, setAssignedLocations] = React.useState<string[]>([]);
  const { toast } = useToast(); // Initialize useToast

  const inactivityTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleInactivityLogout = React.useCallback(async () => {
    if (auth) {
      try {
        await signOut(auth);
        toast({
          title: "Session Expired",
          description: "You have been logged out due to inactivity.",
          variant: "destructive",
        });
        // The onAuthStateChanged listener will handle setting user to null
      } catch (error) {
        console.error("Error during inactivity logout:", error);
        toast({
          title: "Logout Error",
          description: "Could not log out automatically. Please try logging out manually.",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  const resetInactivityTimer = React.useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (auth && user) { // Only set timer if user is logged in and auth is available
      inactivityTimerRef.current = setTimeout(handleInactivityLogout, INACTIVITY_TIMEOUT_DURATION);
    }
  }, [user, auth, handleInactivityLogout]);

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
                    assignedLocations: [],
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
              assignedLocations: userData.assignedLocations || [],
            };
            await updateDoc(userDocRef, { lastLoginAt: serverTimestamp() });
            console.log("User document found in Firestore:", appUser);
          } else {
            console.log(`User document for ${firebaseUser.uid} not found. Creating with default role 'user'.`);
            const newUserProfileData = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email,
              photoURL: firebaseUser.photoURL || null,
              role: 'user',
              assignedLocations: [],
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
                role: 'user',
                assignedLocations: [],
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
                assignedLocations: [],
             };
          setUser(errorUser);
          setIsAdmin(false);
          setAssignedLocations([]);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setAssignedLocations([]);
        if (inactivityTimerRef.current) { // Clear timer on explicit logout
          clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = null;
        }
        console.log("User logged out.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []); // Empty dependency array for onAuthStateChanged

  React.useEffect(() => {
    // Setup or clear activity listeners based on user state
    if (user && auth) {
      resetInactivityTimer(); // Start timer when user logs in
      const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
      
      const activityListener = () => {
        resetInactivityTimer();
      };

      activityEvents.forEach(event => {
        window.addEventListener(event, activityListener);
      });

      return () => {
        activityEvents.forEach(event => {
          window.removeEventListener(event, activityListener);
        });
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = null;
        }
      };
    } else {
      // No user, clear any existing timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    }
  }, [user, auth, resetInactivityTimer]);


  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, assignedLocations }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => React.useContext(AuthContext);
