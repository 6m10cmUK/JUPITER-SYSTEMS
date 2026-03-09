import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/auth';
import { apiFetch } from '../config/api';
import type { AuthUser } from '../services/auth';
import type { UserProfile } from '../types/adrastea.types';

interface AuthContextValue {
  user: AuthUser | null;
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isGuest = user?.isGuest ?? false;

  // 起動時にトークンからユーザー復元
  useEffect(() => {
    const restored = AuthService.restoreUser();
    if (restored) {
      setUser(restored);
      setProfile({
        uid: restored.uid,
        display_name: restored.displayName,
        avatar_url: restored.avatarUrl,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async () => {
    const authUser = await AuthService.signInWithGoogle();
    setUser(authUser);
    setProfile({
      uid: authUser.uid,
      display_name: authUser.displayName,
      avatar_url: authUser.avatarUrl,
      created_at: Date.now(),
      updated_at: Date.now(),
    });
  }, []);

  const signInAsGuest = useCallback(async (displayName: string) => {
    const authUser = await AuthService.signInAsGuest(displayName);
    setUser(authUser);
    setProfile({
      uid: authUser.uid,
      display_name: displayName || 'ゲスト',
      avatar_url: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    });
  }, []);

  const signOut = useCallback(async () => {
    AuthService.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const updateProfile = useCallback(async (data: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>) => {
    if (!user) return;
    const res = await apiFetch('/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('プロフィール更新に失敗しました');
    const updated = { ...data, updated_at: Date.now() };
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
