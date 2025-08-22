import { useState, useEffect, useCallback, useRef } from 'react';
import { PDFApiService } from '../services/api';
import type { ServerStatus } from '../types/server.types';

interface UseServerStatusOptions {
  checkInterval?: number;  // ミリ秒単位
  keepAliveInterval?: number;  // ミリ秒単位
  enableKeepalive?: boolean;
  autoStart?: boolean;  // 自動起動するかどうか
}

export const useServerStatus = (options: UseServerStatusOptions = {}) => {
  const {
    checkInterval = 5000,  // 5秒
    keepAliveInterval = 10 * 60 * 1000,  // 10分
    enableKeepalive = true,
    autoStart = false  // デフォルトは自動起動しない
  } = options;

  const [status, setStatus] = useState<ServerStatus>('checking');
  const [retryCount, setRetryCount] = useState(0);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      console.log('サーバーヘルスチェック中...');
      const isHealthy = await PDFApiService.checkHealth();
      
      if (isHealthy) {
        console.log('サーバーは正常に動作しています');
        setStatus('online');
        setRetryCount(0);
        return true;
      } else {
        console.log('サーバーからの応答がありません');
        setStatus('offline');
        return false;
      }
    } catch (error) {
      console.error('サーバーヘルスチェックエラー:', error);
      setStatus('offline');
      setRetryCount(prev => prev + 1);
      return false;
    }
  }, []);

  const wakeUpServer = useCallback(async () => {
    console.log('サーバーを起動中...');
    setStatus('checking');
    
    const isHealthy = await checkHealth();
    
    if (!isHealthy && retryCount < 3) {
      // リトライ
      checkIntervalRef.current = setTimeout(() => {
        wakeUpServer();
      }, checkInterval);
    }
  }, [checkHealth, checkInterval, retryCount]);

  // 初回起動（autoStartがtrueの場合のみ）
  useEffect(() => {
    if (autoStart) {
      wakeUpServer();
    }

    return () => {
      if (checkIntervalRef.current) {
        clearTimeout(checkIntervalRef.current);
      }
    };
  }, [autoStart, wakeUpServer]);

  // キープアライブ
  useEffect(() => {
    if (!enableKeepalive || status !== 'online') {
      return;
    }

    keepAliveIntervalRef.current = setInterval(() => {
      console.log('キープアライブping送信中...');
      checkHealth();
    }, keepAliveInterval);

    return () => {
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
    };
  }, [enableKeepalive, status, keepAliveInterval, checkHealth]);

  return {
    status,
    retryCount,
    checkHealth,
    wakeUpServer
  };
};