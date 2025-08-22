import React, { useState, useRef, useEffect } from 'react';
import CharacterCanvas from '../components/CharacterDisplay/CharacterCanvas';
import CharacterForm from '../components/CharacterDisplay/CharacterForm';
import ThemeSelector from '../components/CharacterDisplay/ThemeSelector';
import { Footer } from '../components/Footer/Footer';
import type { CharacterData, Theme } from '../types/characterDisplay';
import { themes } from '../config/themes';

const CharacterDisplayGenerator: React.FC = () => {
  useEffect(() => {
    document.title = 'JUPITER SYSTEMS / Character Display Generator'
  }, [])
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex flex-1 relative">
        {/* サイドバー */}
        <div className={`${isSidebarOpen ? 'w-96' : 'w-0'} transition-all duration-300 bg-white shadow-lg overflow-hidden`}>
          <div className="w-96 p-6">
            {/* タブボタン */}
            <div className="flex mb-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('theme')}
                className={`flex-1 pb-3 font-medium transition-colors ${
                  activeTab === 'theme' 
                    ? 'border-b-2 border-jupiter-primary text-jupiter-primary' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                テーマ
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 pb-3 font-medium transition-colors ${
                  activeTab === 'settings' 
                    ? 'border-b-2 border-jupiter-primary text-jupiter-primary' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                設定
              </button>
            </div>

            {/* タブコンテンツ */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
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
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-blue-500 text-white p-2 rounded-r-lg hover:bg-blue-600 transition-colors shadow-md"
          style={{ left: isSidebarOpen ? '384px' : '0px' }}
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className={`transform transition-transform ${isSidebarOpen ? '' : 'rotate-180'}`}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        
        {/* メインコンテンツ */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">プレビュー</h2>
              <CharacterCanvas
                ref={canvasRef}
                characterData={characterData}
                theme={selectedTheme}
              />
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={handleDownload}
                className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
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

export default CharacterDisplayGenerator;