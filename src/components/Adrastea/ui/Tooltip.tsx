import React, { useState, useRef, useCallback } from 'react';
import { theme } from '../../../styles/theme';

interface TooltipProps {
  label: string;
  delay?: number;
  children: React.ReactElement<any>;
}

export function Tooltip({ label, delay = 0, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 4 });
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  return (
    <>
      {React.cloneElement(children, {
        onMouseEnter: (e: React.MouseEvent) => {
          show(e);
          (children.props as any).onMouseEnter?.(e);
        },
        onMouseLeave: (e: React.MouseEvent) => {
          hide();
          (children.props as any).onMouseLeave?.(e);
        },
      })}
      {visible && (
        <div
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y,
            transform: 'translateX(-50%)',
            background: theme.bgSurface,
            border: `1px solid ${theme.border}`,
            color: theme.textPrimary,
            fontSize: '11px',
            padding: '2px 6px',
            whiteSpace: 'nowrap',
            zIndex: 10000,
            pointerEvents: 'none',
            boxShadow: theme.shadowSm,
          }}
        >
          {label}
        </div>
      )}
    </>
  );
}
