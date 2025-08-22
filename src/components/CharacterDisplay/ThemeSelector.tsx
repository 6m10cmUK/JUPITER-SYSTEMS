import React from 'react';
import type { Theme } from '../../types/characterDisplay.tsx';

interface ThemeSelectorProps {
  themes: Theme[];
  selectedTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  themes,
  selectedTheme,
  onThemeChange
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
        テーマ選択
      </h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => onThemeChange(theme)}
            className={`relative p-4 rounded-lg border-2 transition-all ${
              selectedTheme.id === theme.id
                ? 'border-blue-500 shadow-lg'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div
              className="w-full h-20 rounded mb-2"
              style={{
                background: `linear-gradient(135deg, ${theme.backgroundColor} 0%, ${theme.primaryColor} 100%)`
              }}
            />
            <p className="text-sm font-medium text-center">
              {theme.name}
            </p>
            {theme.decorations?.elements && theme.decorations.elements.length > 0 && (
              <div className="absolute top-2 left-2 text-xs opacity-60">
                {theme.decorations.elements[0]?.content}
              </div>
            )}
          </button>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded">
        <h3 className="text-sm font-semibold mb-2">選択中のテーマ: {selectedTheme.name}</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-600 dark:text-gray-400">背景色:</span>
            <span
              className="ml-2 px-2 py-1 rounded"
              style={{ backgroundColor: selectedTheme.backgroundColor, color: selectedTheme.textColor }}
            >
              {selectedTheme.backgroundColor}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">メイン色:</span>
            <span
              className="ml-2 px-2 py-1 rounded"
              style={{ backgroundColor: selectedTheme.primaryColor, color: '#fff' }}
            >
              {selectedTheme.primaryColor}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;