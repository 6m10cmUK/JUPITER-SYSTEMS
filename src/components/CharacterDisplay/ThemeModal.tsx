import React from 'react';
import type { Theme } from '../../types/characterDisplay';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  themes: Theme[];
  selectedTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  onClose,
  themes,
  selectedTheme,
  onThemeChange
}) => {
  if (!isOpen) return null;

  const handleThemeSelect = (theme: Theme) => {
    onThemeChange(theme);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* モーダル本体 */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            テーマを選択
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6L18 18M6 18L18 6" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          <div className="grid grid-cols-3 gap-4">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeSelect(theme)}
                className={`relative group overflow-hidden rounded-lg transition-all hover:shadow-xl hover:scale-105 ${
                  selectedTheme.id === theme.id
                    ? 'ring-2 ring-blue-500 ring-offset-2'
                    : ''
                }`}
              >
                {/* テーマプレビュー（タイル） */}
                <div 
                  className="w-full aspect-[4/3] relative"
                  style={{
                    backgroundColor: theme.backgroundColor,
                    backgroundImage: theme.backgroundImage ? `url(${theme.backgroundImage})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {/* オーバーレイグラデーション */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* 選択中マーク */}
                  {selectedTheme.id === theme.id && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1.5 shadow-lg">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  )}
                  
                  {/* カラーパレット（プレビュー内） */}
                  <div className="absolute bottom-2 right-2 flex gap-1 p-1.5 bg-white/90 backdrop-blur rounded">
                    <div 
                      className="w-5 h-5 rounded-sm shadow-sm"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                    <div 
                      className="w-5 h-5 rounded-sm shadow-sm"
                      style={{ backgroundColor: theme.secondaryColor }}
                    />
                    <div 
                      className="w-5 h-5 rounded-sm shadow-sm"
                      style={{ backgroundColor: theme.textColor }}
                    />
                  </div>
                </div>
                
                {/* テーマ情報（下部） */}
                <div className="p-3 bg-white border-t">
                  <h4 className="font-semibold text-gray-900 text-sm mb-0.5">{theme.name}</h4>
                  <p className="text-xs text-gray-500 line-clamp-1">{theme.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeModal;