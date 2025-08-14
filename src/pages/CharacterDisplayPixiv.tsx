import React, { useState, useRef } from 'react';
import CharacterCanvas from '../components/CharacterDisplay/CharacterCanvas';
import CharacterFormPixiv from '../components/CharacterDisplay/CharacterFormPixiv';
import ThemeSelector from '../components/CharacterDisplay/ThemeSelector';
import { Footer } from '../components/Footer/Footer';
import type { CharacterData, Theme } from '../types/characterDisplay.tsx';
import { themes } from '../config/themes';
import '../styles/pixiv-theme.css';

const CharacterDisplayPixiv: React.FC = () => {
  const [characterData, setCharacterData] = useState<CharacterData>({
    baseImage: null,
    expressions: [],
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
    <div style={{ minHeight: '100vh', background: '#f7f8f9' }}>
      {/* ヘッダー */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e8eaed',
        padding: '16px 24px',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2126', margin: 0 }}>
            キャラクターディスプレイ画像生成
          </h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="pixiv-button-secondary"
              onClick={() => window.location.href = '/'}
            >
              ホーム
            </button>
          </div>
        </div>
      </header>
      
      <div style={{ display: 'flex', height: 'calc(100vh - 130px)' }}>
        {/* サイドバー */}
        <aside 
          className="pixiv-sidebar"
          style={{
            width: isSidebarOpen ? '380px' : '0',
            transition: 'width 0.3s ease',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <div style={{ width: '380px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* タブ */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e8eaed', background: 'white' }}>
              <button
                className={`pixiv-tab ${activeTab === 'theme' ? 'active' : ''}`}
                onClick={() => setActiveTab('theme')}
                style={{ flex: 1, border: 'none', background: 'none' }}
              >
                テーマ
              </button>
              <button
                className={`pixiv-tab ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
                style={{ flex: 1, border: 'none', background: 'none' }}
              >
                設定
              </button>
            </div>

            {/* タブコンテンツ */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {activeTab === 'theme' ? (
                <div>
                  <h2 className="pixiv-section-header">テーマを選択</h2>
                  <ThemeSelector 
                    themes={themes}
                    selectedTheme={selectedTheme}
                    onThemeChange={setSelectedTheme}
                  />
                </div>
              ) : (
                <div>
                  <h2 className="pixiv-section-header">キャラクター設定</h2>
                  <CharacterFormPixiv
                    characterData={characterData}
                    onDataChange={setCharacterData}
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* 開閉ボタン */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{
              position: 'absolute',
              right: '-40px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '64px',
              background: 'white',
              border: '1px solid #e8eaed',
              borderLeft: 'none',
              borderRadius: '0 8px 8px 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '2px 0 8px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease'
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#70757e"
              strokeWidth="2"
              style={{
                transform: isSidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: 'transform 0.3s ease'
              }}
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </aside>
        
        {/* メインコンテンツ */}
        <main style={{ 
          flex: 1, 
          padding: '32px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{ width: '100%', maxWidth: '900px' }}>
            {/* プレビューカード */}
            <div className="pixiv-card" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 className="pixiv-section-header">プレビュー</h2>
              </div>
              <CharacterCanvas
                ref={canvasRef}
                characterData={characterData}
                theme={selectedTheme}
              />
            </div>
            
            {/* ダウンロードセクション */}
            <div style={{ 
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <p style={{ margin: 0, color: '#5c6066', fontSize: '14px' }}>
                  画像の準備ができました
                </p>
                <p style={{ margin: '4px 0 0', color: '#9499a0', fontSize: '12px' }}>
                  PNG形式でダウンロードされます
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="pixiv-button-primary"
                style={{ fontSize: '14px' }}
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

export default CharacterDisplayPixiv;