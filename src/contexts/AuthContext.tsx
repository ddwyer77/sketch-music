"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { userRole } from '@/types/user';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: (userType: userRole) => Promise<User>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, firstName: string, lastName: string, paymentEmail?: string, userType?: userRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async (userType: userRole) => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user document already exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Only create new user document if it doesn't exist
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          paymentEmail: user.email,
          roles: [userType],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      return user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string,
    paymentEmail?: string,
    userType: userRole = 'creator'
  ) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document
      await setDoc(doc(db, 'users', result.user.uid), {
        email,
        first_name: firstName,
        last_name: lastName,
        roles: [userType],
        groups: [],
        payment_info: paymentEmail ? [{ email: paymentEmail }] : []
      });
    } catch (error: unknown) {
      console.error('Error signing up with email:', error);
      // Convert Firebase error codes to user-friendly messages
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/weak-password':
            throw new Error('Password should be at least 6 characters long');
          case 'auth/email-already-in-use':
            throw new Error('This email is already registered');
          case 'auth/invalid-email':
            throw new Error('Please enter a valid email address');
          default:
            throw new Error('Failed to create account. Please try again.');
        }
      }
      throw new Error('Failed to create account. Please try again.');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // window.location.href = '/';
    } catch (error: unknown) {
      console.error('Error signing out:', error);
      throw error instanceof Error ? error : new Error('Failed to sign out');
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 