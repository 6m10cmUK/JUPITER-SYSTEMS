import React, { useState } from 'react';
import { useDiscordObsSettings } from '../hooks/useDiscordObsSettings';
import { UserSettings, AnimationSettingsPanel, GeneralSettingsPanel, TabView } from '../components/DiscordObs';

const DiscordObs: React.FC = () => {
  const {
    userId, setUserId,
    standImageUrl, setStandImageUrl,
    userName, setUserName,
    animationSettings, setAnimationSettings,
    generalSettings, setGeneralSettings,
    generatedCSS,
    loadDemo,
    copyCSS,
  } = useDiscordObsSettings();

  const [activeTab, setActiveTab] = useState<'preview' | 'css'>('preview');
  const [isSpeaking, setIsSpeaking] = useState(true);
  const [isInChat, setIsInChat] = useState(true);

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>Discord Streamkit CSS Generator</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Discord StreamkitをOBSでカスタマイズするためのCSSコードを生成します
      </p>

      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <button
          onClick={loadDemo}
          style={{
            padding: '10px 20px', fontSize: '14px',
            backgroundColor: '#6c757d', color: 'white',
            border: 'none', borderRadius: '4px', cursor: 'pointer',
          }}
        >
          🔄 デモデータにリセット
        </button>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          ※ 設定を初期状態に戻します
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <div>
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>📋 ユーザーIDの確認方法</h3>
            <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
              <li>Discordで開発者モードを有効にする (設定 → 詳細設定 → 開発者モード)</li>
              <li>ユーザーを右クリックして「IDをコピー」を選択</li>
              <li>取得したIDを下記のユーザーID欄に入力</li>
            </ol>
          </div>

          <UserSettings
            userId={userId} setUserId={setUserId}
            standImageUrl={standImageUrl} setStandImageUrl={setStandImageUrl}
            userName={userName} setUserName={setUserName}
          />
          <AnimationSettingsPanel
            animationSettings={animationSettings}
            setAnimationSettings={setAnimationSettings}
          />
          <GeneralSettingsPanel
            generalSettings={generalSettings}
            setGeneralSettings={setGeneralSettings}
          />

          <div style={{
            padding: '15px', backgroundColor: '#e7f3ff',
            borderRadius: '4px', border: '1px solid #b3d9ff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
              <span style={{ fontSize: '18px' }}>⚡</span>
              <span style={{ fontWeight: 'bold', color: '#0056b3' }}>自動生成</span>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#0056b3' }}>
              設定を変更すると右側のCSSコードが自動で更新されます
            </p>
          </div>
        </div>

        <TabView
          activeTab={activeTab} setActiveTab={setActiveTab}
          generatedCSS={generatedCSS} onCopy={copyCSS}
          standImageUrl={standImageUrl} userName={userName} userId={userId}
          animationSettings={animationSettings} generalSettings={generalSettings}
          isSpeaking={isSpeaking} isInChat={isInChat}
          setIsSpeaking={setIsSpeaking} setIsInChat={setIsInChat}
        />
      </div>
    </div>
  );
};

export default DiscordObs;
