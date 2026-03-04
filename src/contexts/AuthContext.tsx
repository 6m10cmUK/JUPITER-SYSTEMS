import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthService } from '../services/auth';
import type { UserProfile } from '../types/adrastea.types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  isGuest: boolean;
  loading: boolean;
  signIn: () => Promise<void>;
  signInAsGuest: (displayName: string) => void;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const profileRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(profileRef);

        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            display_name: firebaseUser.displayName || 'ユーザー',
            avatar_url: firebaseUser.photoURL || null,
            created_at: Date.now(),
            updated_at: Date.now(),
          };
          await setDoc(profileRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async () => {
    await AuthService.signInWithGoogle();
  }, []);

  const signInAsGuest = useCallback((displayName: string) => {
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const guestProfile: UserProfile = {
      uid: guestId,
      display_name: displayName || 'ゲスト',
      avatar_url: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    setProfile(guestProfile);
    setIsGuest(true);
  }, []);

  const signOut = useCallback(async () => {
    if (isGuest) {
      setProfile(null);
      setIsGuest(false);
      return;
    }
    await AuthService.signOut();
    setProfile(null);
  }, [isGuest]);

  const updateProfile = useCallback(async (data: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>) => {
    if (!user) return;
    const profileRef = doc(db, 'users', user.uid);
    const updated = { ...data, updated_at: Date.now() };
    await setDoc(profileRef, updated, { merge: true });
    setProfile((prev) => prev ? { ...prev, ...updated } : null);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, isGuest, loading, signIn, signInAsGuest, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
