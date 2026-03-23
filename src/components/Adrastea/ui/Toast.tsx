import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { theme } from '../../../styles/theme';

export type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error';
};

export function useToast(): {
  toasts: Toast[];
  showToast: (message: string, type: 'success' | 'error') => void;
} {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    // 3秒後に自動削除
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return { toasts, showToast };
}

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 10002,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: theme.bgSurface,
            color: toast.type === 'success' ? theme.success : theme.danger,
            border: `1px solid ${theme.borderSubtle}`,
            padding: '12px 20px',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: theme.shadowMd,
            marginBottom: '8px',
            pointerEvents: 'auto',
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>,
    document.body
  );
}
