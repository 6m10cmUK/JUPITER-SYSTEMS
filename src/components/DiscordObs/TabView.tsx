import React from 'react';
import type { AnimationSettings, GeneralSettings } from '../../types/discordObs.types';
import { PreviewPanel } from './PreviewPanel';
import { CssOutputPanel } from './CssOutputPanel';

interface Props {
  activeTab: 'preview' | 'css';
  setActiveTab: (tab: 'preview' | 'css') => void;
  generatedCSS: string;
  onCopy: () => void;
  standImageUrl: string;
  userName: string;
  userId: string;
  animationSettings: AnimationSettings;
  generalSettings: GeneralSettings;
  isSpeaking: boolean;
  isInChat: boolean;
  setIsSpeaking: (v: boolean) => void;
  setIsInChat: (v: boolean) => void;
}

export const TabView: React.FC<Props> = ({
  activeTab, setActiveTab, generatedCSS, onCopy,
  standImageUrl, userName, userId, animationSettings, generalSettings,
  isSpeaking, isInChat, setIsSpeaking, setIsInChat,
}) => (
  <div>
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', borderBottom: '2px solid #e9ecef' }}>
        {(['preview', 'css'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 24px', fontSize: '16px', fontWeight: 'bold',
              backgroundColor: activeTab === tab ? '#007bff' : 'transparent',
              color: activeTab === tab ? 'white' : '#666',
              border: 'none', borderRadius: '4px 4px 0 0',
              cursor: 'pointer', marginRight: tab === 'preview' ? '8px' : '0',
            }}
          >
            {tab === 'preview' ? '👁️ プレビュー' : '📋 CSSコード'}
          </button>
        ))}
      </div>
    </div>

    {generatedCSS ? (
      <div>
        {activeTab === 'preview' && (
          <PreviewPanel
            standImageUrl={standImageUrl}
            userName={userName}
            userId={userId}
            animationSettings={animationSettings}
            generalSettings={generalSettings}
            isSpeaking={isSpeaking}
            isInChat={isInChat}
            setIsSpeaking={setIsSpeaking}
            setIsInChat={setIsInChat}
          />
        )}
        {activeTab === 'css' && (
          <CssOutputPanel generatedCSS={generatedCSS} onCopy={onCopy} />
        )}
      </div>
    ) : (
      <div style={{
        padding: '60px', textAlign: 'center', color: '#666',
        border: '2px dashed #ddd', borderRadius: '8px',
      }}>
        <p style={{ fontSize: '18px', marginBottom: '10px' }}>✨ CSS生成準備完了</p>
        <p style={{ fontSize: '14px' }}>💡 「CSSコードを生成」ボタンを押すとプレビューとCSSが表示されます</p>
      </div>
    )}
  </div>
);
