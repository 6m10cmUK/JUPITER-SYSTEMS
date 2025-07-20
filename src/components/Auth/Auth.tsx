import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { AuthService } from '../../services/auth';
import styles from './Auth.module.css';

interface AuthProps {
  onAuthChange?: (user: User | null) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthChange }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
      onAuthChange?.(user);
    });

    return () => unsubscribe();
  }, [onAuthChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(`.${styles.authContainer}`)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSignIn = async () => {
    try {
      await AuthService.signInWithGoogle();
    } catch (error) {
      console.error('ログインエラー:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
      setShowMenu(false);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  if (loading) {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  return (
    <div className={styles.authContainer}>
      {user ? (
        <div className={styles.userSection}>
          <button 
            onClick={() => {
              console.log('Avatar clicked, showMenu:', !showMenu);
              setShowMenu(!showMenu);
            }} 
            className={styles.avatarButton}
            aria-label="ユーザーメニュー"
          >
            <img 
              src={user.photoURL || ''} 
              alt={user.displayName || 'User'} 
              className={styles.userAvatar}
            />
          </button>
          {showMenu && (
            <div className={styles.dropdownMenu}>
              <div className={styles.menuHeader}>
                <img 
                  src={user.photoURL || ''} 
                  alt={user.displayName || 'User'} 
                  className={styles.menuAvatar}
                />
                <div className={styles.userDetails}>
                  <span className={styles.userName}>{user.displayName}</span>
                  <span className={styles.userEmail}>{user.email}</span>
                </div>
              </div>
              <div className={styles.menuDivider} />
              <button onClick={handleSignOut} className={styles.menuItem}>
                <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 13v-2H7V8l-5 4 5 4v-3z"/>
                  <path d="M20 3h-9c-1.11 0-2 .89-2 2v4h2V5h9v14h-9v-4H9v4c0 1.11.89 2 2 2h9c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2z"/>
                </svg>
                ログアウト
              </button>
            </div>
          )}
        </div>
      ) : (
        <button onClick={handleSignIn} className={styles.signInButton}>
          <svg className={styles.googleIcon} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Googleでログイン
        </button>
      )}
    </div>
  );
};