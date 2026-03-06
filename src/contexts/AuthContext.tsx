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
  signInAsGuest: (displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // pendingGuestName: 匿名ログイン時に onAuthStateChanged で使う表示名を一時保持
  const pendingGuestNameRef = React.useRef<string | null>(null);

  const isGuest = user?.isAnonymous ?? false;

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        if (firebaseUser.isAnonymous) {
          // 匿名ユーザー: Firestore profile は作らず、ローカルのみ
          const displayName = pendingGuestNameRef.current || 'ゲスト';
          pendingGuestNameRef.current = null;
          setProfile({
            uid: firebaseUser.uid,
            display_name: displayName,
            avatar_url: null,
            created_at: Date.now(),
            updated_at: Date.now(),
          });
          setLoading(false);
        } else {
          // 通常ユーザー: Firestore profile を読み書き
          const profileRef = doc(db, 'users', firebaseUser.uid);
          try {
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
          } catch (err) {
            console.error('Failed to load/create user profile:', err);
            setProfile(null);
          } finally {
            setLoading(false);
          }
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async () => {
    await AuthService.signInWithGoogle();
  }, []);

  const signInAsGuest = useCallback(async (displayName: string) => {
    pendingGuestNameRef.current = displayName || 'ゲスト';
    await AuthService.signInAnonymously();
  }, []);

  const signOut = useCallback(async () => {
    await AuthService.signOut();
    setProfile(null);
  }, []);

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
