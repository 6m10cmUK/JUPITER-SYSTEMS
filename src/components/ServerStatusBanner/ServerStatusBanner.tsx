import React from 'react';
import type { ServerStatus } from '../../types/server.types';
import styles from './ServerStatusBanner.module.css';

interface ServerStatusBannerProps {
  status: ServerStatus;
}

export const ServerStatusBanner: React.FC<ServerStatusBannerProps> = ({ status }) => {
  if (status === 'online') {
    return null;
  }

  if (status === 'checking') {
    return (
      <div className={`${styles.banner} ${styles.checking}`}>
        🔄 サーバーを起動中です... 初回は最大30秒かかる場合があります
      </div>
    );
  }

  return (
    <div className={`${styles.banner} ${styles.offline}`}>
      ⚠️ サーバーに接続できません。再接続を試行中...
    </div>
  );
};