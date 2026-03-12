import React, { createContext, useContext } from 'react';
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from '../../convex/_generated/api';
import type { UserProfile } from '../types/adrastea.types';

export interface AuthUser {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  isGuest?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: UserProfile | null;
  isGuest: boolean;
  loading: boolean;
  signIn: () => Promise<void>;
  signInAsGuest: (displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile?: (data: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();
  const viewerData = useQuery(api.users.viewer);

  const signIn = async () => {
    await convexSignIn("google", { redirectTo: window.location.pathname + window.location.search });
  };

  const signInAsGuest = async (_displayName: string) => {
    await convexSignIn("anonymous");
  };

  const signOut = async () => {
    await convexSignOut();
  };

  const uid = viewerData?.id ?? null;

  const user: AuthUser | null = (isAuthenticated && uid)
    ? { uid, displayName: "ユーザー", avatarUrl: null, isGuest: false }
    : null;

  const profile: UserProfile | null = (isAuthenticated && uid)
    ? {
        uid,
        display_name: "ユーザー",
        avatar_url: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      }
    : null;

  const isGuest = user?.isGuest ?? false;
  // viewerData が undefined = ロード中。null = 未認証
  const loading = isLoading || (isAuthenticated && viewerData === undefined);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isGuest,
      loading,
      signIn,
      signInAsGuest,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
