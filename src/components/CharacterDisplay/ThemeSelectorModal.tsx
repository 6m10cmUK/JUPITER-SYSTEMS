import React from 'react';
import type { Theme } from '../../types/characterDisplay.tsx';
import { themes } from '../../config/themes';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTheme: Theme;
  onThemeSelect: (theme: Theme) => void;
}

const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedTheme,
  onThemeSelect
}) => {
  if (!isOpen) return null;

  const handleThemeClick = (theme: Theme) => {
    onThemeSelect(theme);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* ヘッダー */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e8eaed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '18px', 
            fontWeight: '600',
            color: '#1f2126'
          }}>
            テーマを選択
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#70757e" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* テーマリスト */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {themes.map((theme) => (
            <div
              key={theme.id}
              onClick={() => handleThemeClick(theme)}
              style={{
                cursor: 'pointer',
                borderRadius: '12px',
                overflow: 'hidden',
                border: selectedTheme.id === theme.id ? '2px solid #0096fa' : '2px solid #e8eaed',
                transition: 'all 0.2s ease',
                background: 'white'
              }}
              onMouseEnter={(e) => {
                if (selectedTheme.id !== theme.id) {
                  e.currentTarget.style.borderColor = '#0096fa66';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedTheme.id !== theme.id) {
                  e.currentTarget.style.borderColor = '#e8eaed';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {/* プレビュー */}
              <div style={{
                height: '120px',
                background: `linear-gradient(135deg, ${theme.backgroundColor}, ${theme.secondaryColor || theme.backgroundColor})`,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* サンプル枠 */}
                {theme.borderStyle !== 'none' && (
                  <div style={{
                    position: 'absolute',
                    inset: '10px',
                    border: `2px ${theme.borderStyle === 'solid' ? 'solid' : 'dashed'} ${theme.primaryColor}`,
                    borderRadius: '4px',
                    opacity: 0.5
                  }} />
                )}
                
                {/* サンプルテキスト */}
                <div style={{
                  fontFamily: theme.fontFamily,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: theme.textColor,
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                  Sample Text
                </div>
              </div>

              {/* テーマ名 */}
              <div style={{
                padding: '12px',
                borderTop: '1px solid #e8eaed'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1f2126'
                }}>
                  {theme.name}
                </h3>
                {selectedTheme.id === theme.id && (
                  <p style={{
                    margin: '4px 0 0',
                    fontSize: '12px',
                    color: '#0096fa',
                    fontWeight: '500'
                  }}>
                    使用中
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThemeSelectorModal;