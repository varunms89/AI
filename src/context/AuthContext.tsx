import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signInAnonymously,
  signOut as authSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Sync or initialize user profile in Firestore
        const userDocPath = `users/${currentUser.uid}`;
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const existingSnap = await getDoc(userDocRef);

          const now = new Date().toISOString();
          if (!existingSnap.exists()) {
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email || 'anonymous@user.com',
              displayName: currentUser.displayName || 'Cloud AI Specialist',
              photoURL: currentUser.photoURL || '',
              createdAt: now,
              lastLoginAt: now,
            });
          } else {
            await setDoc(
              userDocRef,
              {
                lastLoginAt: now,
                displayName: currentUser.displayName || existingSnap.data().displayName || '',
                photoURL: currentUser.photoURL || existingSnap.data().photoURL || '',
              },
              { merge: true }
            );
          }
        } catch (err: any) {
          console.error('Failed to sync user document in Firestore:', err);
          // Non-blocking for local state
        }
      } else {
        // Try silent anonymous authentication so Firestore operations succeed for guests
        try {
          await signInAnonymously(auth);
        } catch (anonErr) {
          console.debug('Anonymous sign-in not available:', anonErr);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err.message || 'Failed to sign in with Google');
      throw err;
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      await authSignOut(auth);
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message || 'Failed to sign out');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
