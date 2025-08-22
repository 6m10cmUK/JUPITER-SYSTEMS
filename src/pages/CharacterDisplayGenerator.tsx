import React, { useState, useRef, useEffect } from 'react';
import CharacterCanvas from '../components/CharacterDisplay/CharacterCanvas';
import CharacterForm from '../components/CharacterDisplay/CharacterForm';
import ThemeModal from '../components/CharacterDisplay/ThemeModal';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showThemeModal, setShowThemeModal] = useState(false);
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
        <div className={`${isSidebarOpen ? 'w-96' : 'w-0'} transition-all duration-300 bg-white shadow-lg overflow-hidden relative`}>
          <div className="w-96">
            {/* ハンバーガーメニューボタン */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="absolute top-4 right-4 z-10 p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                {isSidebarOpen ? (
                  <path d="M6 6L18 18M6 18L18 6" />
                ) : (
                  <>
                    <path d="M3 12H21" />
                    <path d="M3 6H21" />
                    <path d="M3 18H21" />
                  </>
                )}
              </svg>
            </button>

            {/* 設定パネル */}
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">設定</h2>
              
              {/* テーマ選択ボタン */}
              <div className="mb-6">
                <button
                  onClick={() => setShowThemeModal(true)}
                  className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-between"
                >
                  <span className="font-medium">テーマ: {selectedTheme.name}</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>

              {/* キャラクター設定フォーム */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <CharacterForm
                  characterData={characterData}
                  onDataChange={setCharacterData}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ハンバーガーメニューボタン（サイドバーが閉じている時） */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 p-2 bg-white rounded-lg shadow-md text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M3 12H21" />
              <path d="M3 6H21" />
              <path d="M3 18H21" />
            </svg>
          </button>
        )}
        
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
      
      {/* テーマ選択モーダル */}
      <ThemeModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        themes={themes}
        selectedTheme={selectedTheme}
        onThemeChange={setSelectedTheme}
      />
      
      <Footer />
    </div>
  );
};

export default CharacterDisplayGenerator;