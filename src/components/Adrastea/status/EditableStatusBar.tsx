import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

interface EditableStatusBarProps {
  charId: string;
  statusIndex: number;
  status: { label: string; value: number; max: number; color?: string };
  canEdit: boolean;
  updateStatusValue: (charId: string, statusIndex: number, newValue: number) => void;
  showOnBoard?: boolean;
  toggleShowOnBoard?: (charId: string, statusIndex: number) => void;
}

export function EditableStatusBar({
  charId,
  statusIndex,
  status,
  canEdit,
  updateStatusValue,
  showOnBoard,
  toggleShowOnBoard,
}: EditableStatusBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isDragging && localValue !== null && status.value === localValue) {
      setLocalValue(null);
    }
  }, [status.value, localValue, isDragging]);

  const displayValue = localValue !== null ? localValue : status.value;
  const ratio = status.max > 0 ? displayValue / status.max : 0;
  const barColor = status.max > 0 && ratio <= 4 / 5 ? '#d9534f' : 'rgba(255,255,255,0.7)';

  const handleBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (!canEdit) return;

    setIsDragging(true);
    const barEl = e.currentTarget;
    const rect = barEl.getBoundingClientRect();

    const calcValue = (clientX: number) => {
      const clampedX = Math.max(rect.left, Math.min(clientX, rect.right));
      const r = (clampedX - rect.left) / rect.width;
      return Math.round(r * status.max);
    };

    const onMouseMove = (moveE: MouseEvent) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setLocalValue(calcValue(moveE.clientX));
      });
    };

    const onMouseUp = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setIsDragging(false);
      setLocalValue((prev) => {
        if (prev !== null) updateStatusValue(charId, statusIndex, prev);
        return prev;
      });
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    const initVal = calcValue(e.clientX);
    setLocalValue(initVal);
  };

  return (
    <div
      style={{
        position: 'relative',
        height: 16,
        background: 'rgba(255,255,255,0.1)',
        cursor: canEdit ? 'ew-resize' : 'default',
      }}
      onMouseDown={handleBarMouseDown}
    >
      <div
        style={{
          height: '100%',
          width: `${status.max > 0 ? Math.min(100, ratio * 100) : 0}%`,
          background: barColor,
          transition: isDragging ? 'none' : 'width 0.2s ease',
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: 4,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 12,
          color: '#000',
          fontWeight: 700,
          pointerEvents: 'none',
          textShadow: '0 0 4px #fff, 0 0 4px #fff',
        }}
      >
        {status.label}
      </span>
      <span
        style={{
          position: 'absolute',
          right: canEdit ? (toggleShowOnBoard ? 58 : 40) : 4,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 12,
          color: '#000',
          fontWeight: 600,
          pointerEvents: 'none',
          textShadow: '0 0 4px #fff, 0 0 4px #fff',
        }}
      >
        {displayValue}/{status.max}
      </span>
      {canEdit && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
            zIndex: 1,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {toggleShowOnBoard && (
            <button
              type="button"
              style={{
                width: 18,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0 4px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label={showOnBoard ? 'ボード非表示' : 'ボード表示'}
              onClick={(e) => {
                e.stopPropagation();
                toggleShowOnBoard(charId, statusIndex);
              }}
            >
              {showOnBoard ? (
                <Eye size={12} strokeWidth={3} style={{ filter: 'drop-shadow(0 0 1px #000)' }} />
              ) : (
                <EyeOff size={12} strokeWidth={3} style={{ filter: 'drop-shadow(0 0 1px #000)' }} />
              )}
            </button>
          )}
          <button
            type="button"
            style={{
              width: 18,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0 4px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="ステータスを増やす"
            onClick={(e) => {
              e.stopPropagation();
              updateStatusValue(charId, statusIndex, status.value + 1);
            }}
          >
            <ChevronUp size={12} strokeWidth={3} style={{ filter: 'drop-shadow(0 0 1px #000)' }} />
          </button>
          <button
            type="button"
            style={{
              width: 18,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0 4px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="ステータスを減らす"
            onClick={(e) => {
              e.stopPropagation();
              updateStatusValue(charId, statusIndex, status.value - 1);
            }}
          >
            <ChevronDown size={12} strokeWidth={3} style={{ filter: 'drop-shadow(0 0 1px #000)' }} />
          </button>
        </div>
      )}
    </div>
  );
}
