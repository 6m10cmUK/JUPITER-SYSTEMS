import React, { useState } from 'react';
import type { CharacterImage } from '../../types/characterDisplay.tsx';

interface ExpressionGridProps {
  expressions: Record<string, CharacterImage>;
  onRemove: (key: string) => void;
  onAdd: () => void;
}

const ExpressionGrid: React.FC<ExpressionGridProps> = ({
  expressions,
  onRemove,
  onAdd
}) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <label style={{ 
          fontSize: '12px', 
          fontWeight: '600', 
          color: '#70757e'
        }}>
          表情差分
        </label>
        <button
          onClick={onAdd}
          style={{
            padding: '6px 12px',
            background: '#0096fa',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          + 表情を追加
        </button>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
        gap: '12px',
        padding: '16px',
        background: '#f7f8f9',
        borderRadius: '8px',
        border: '1px solid #e8eaed',
        minHeight: '120px'
      }}>
        {Object.entries(expressions).map(([key, expression]) => (
          <div
            key={key}
            style={{
              position: 'relative',
              width: '80px',
              height: '80px'
            }}
            onMouseEnter={() => setHoveredKey(key)}
            onMouseLeave={() => setHoveredKey(null)}
          >
            <img
              src={expression.url}
              alt={`表情${key}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'top',
                borderRadius: '8px',
                border: '2px solid white',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
            />
            {hoveredKey === key && (
              <button
                onClick={() => onRemove(key)}
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  width: '24px',
                  height: '24px',
                  background: '#ff4444',
                  border: '2px solid white',
                  borderRadius: '50%',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  zIndex: 10
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        
        {Object.keys(expressions).length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9499a0',
            fontSize: '14px',
            height: '88px'
          }}>
            表情差分が追加されていません
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpressionGrid;