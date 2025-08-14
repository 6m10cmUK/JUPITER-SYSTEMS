import React, { useState, useRef } from 'react';
import CharacterCanvas from '../components/CharacterDisplay/CharacterCanvas';
import CharacterForm from '../components/CharacterDisplay/CharacterForm';
import ThemeSelector from '../components/CharacterDisplay/ThemeSelector';
import Header from '../components/CharacterDisplay/Header';
import { Footer } from '../components/Footer/Footer';
import type { CharacterData, Theme } from '../types/characterDisplay.tsx';
import { themes } from '../config/themes';

const CharacterDisplay: React.FC = () => {
  const [characterData, setCharacterData] = useState<CharacterData>({
    baseImage: null,
    expressions: {},
    currentExpression: '',
    characterName: '',
    scenarioName: ''
  });
  
  const [selectedTheme, setSelectedTheme] = useState<Theme>(themes[0]);
  const [activeTab, setActiveTab] = useState<'theme' | 'settings'>('theme');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = `${characterData.characterName || 'character'}_display.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header title="キャラクターディスプレイ画像生成" />
      
      <div className="flex flex-1 relative">
        {/* サイドバー */}
        <div className={`${isSidebarOpen ? 'w-96' : 'w-0'} transition-all duration-300 bg-white dark:bg-gray-800 shadow-lg overflow-hidden`}>
          <div className="w-96 p-6">
            {/* タブボタン */}
            <div className="flex mb-6 border-b">
              <button
                onClick={() => setActiveTab('theme')}
                className={`flex-1 pb-3 ${activeTab === 'theme' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
              >
                テーマ
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 pb-3 ${activeTab === 'settings' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
              >
                設定
              </button>
            </div>

            {/* タブコンテンツ */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              {activeTab === 'theme' ? (
                <ThemeSelector 
                  themes={themes}
                  selectedTheme={selectedTheme}
                  onThemeChange={setSelectedTheme}
                />
              ) : (
                <CharacterForm
                  characterData={characterData}
                  onDataChange={setCharacterData}
                />
              )}
            </div>
          </div>
        </div>

        {/* 開閉ボタン */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-blue-500 text-white p-2 rounded-r-md hover:bg-blue-600"
          style={{ left: isSidebarOpen ? '384px' : '0px' }}
        >
          {isSidebarOpen ? '◀' : '▶'}
        </button>
        
        {/* メインコンテンツ */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <CharacterCanvas
              ref={canvasRef}
              characterData={characterData}
              theme={selectedTheme}
            />
            
            <div className="flex justify-center">
              <button
                onClick={handleDownload}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-200"
              >
                画像をダウンロード
              </button>
            </div>
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
};

export default CharacterDisplay;