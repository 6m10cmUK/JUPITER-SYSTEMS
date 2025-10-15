import React, { useState, useEffect } from 'react';

interface AnimationSettings {
  bounce: { enabled: boolean; distance: number };
  border: { enabled: boolean; thickness: number };
  duration: number;
}

interface GeneralSettings {
  hideNames: boolean;
  hideOtherUsers: boolean;
  transparentBackground: boolean;
  maxImageWidth: number;
  borderRadius: number;
  dimWhenNotSpeaking: boolean;
}

const DiscordObs: React.FC = () => {
  // シングルユーザー設定（デフォルトでデモデータ）
  const [userId, setUserId] = useState("320897851515207681");
  const [standImageUrl, setStandImageUrl] = useState("/demo.webp");
  const [userName, setUserName] = useState("デモキャラクター");
  
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>({
    bounce: { enabled: true, distance: 15 },
    border: { enabled: false, thickness: 10 },
    duration: 666
  });
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    hideNames: true,
    hideOtherUsers: true,
    transparentBackground: true,
    maxImageWidth: 300,
    borderRadius: 0,
    dimWhenNotSpeaking: true
  });
  const [generatedCSS, setGeneratedCSS] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'css'>('preview');
  const [isSpeaking, setIsSpeaking] = useState(true);

  // ID候補リスト
  const userCandidates = [
    { name: 'みけ', id: '295100509042245632' },
    { name: '吉岡', id: '382146290206638081' },
    { name: 'ユピ', id: '320897851515207681' },
    { name: 'C太', id: '447750795740315649' },
    { name: 'gale', id: '499987801220317214' },
    { name: 'タケイ', id: '407153865763323915' },
    { name: 'あみ', id: '772707009925087262' },
    { name: 'いもうと', id: '775641372970844160' },
    { name: 'ふみしぐれ', id: '514765307022278663' },
    { name: '姉ちゃん', id: '772666013552476180' },
    { name: '漸化式', id: '706032740637868112' },
    { name: '虚無', id: '468353532005974017' }
  ];

  // 設定変更時に自動でCSS生成
  useEffect(() => {
    generateCSS();
  }, [userId, standImageUrl, userName, animationSettings, generalSettings]);

  const generateCSS = () => {
    let css = ':root {\n';
    
    // CSS変数定義（シングルユーザー）
    css += `  /* ${userName || userId} */\n`;
    css += `  --img-stand-url-${userId}: url("${standImageUrl}");\n`;
    css += '}\n\n/* 基本設定 */\n';
    
    if (generalSettings.transparentBackground) {
      css += 'body, #root {\n  overflow: hidden !important;\n}\n\n';
    }
    
    // レイアウト設定
    css += '[class*="Voice_voiceStates__"] {\n';
    css += '  display: flex;\n';
    css += '  align-items: flex-end;\n';
    css += '  padding: 16px;\n';
    css += '}\n\n';
    
    css += '[class*="Voice_voiceState__"] {\n';
    css += '  height: auto;\n';
    css += '  margin-bottom: 0px;\n';
    css += '}\n\n';
    
    // アバター基本設定
    if (generalSettings.dimWhenNotSpeaking) {
      css += '[class*="Voice_avatar__"] {\n';
      css += '  filter: brightness(70%);\n';
      css += '}\n\n';
    }
    
    // 喋ってる時のアニメーション
    css += '[class*="Voice_avatarSpeaking__"] {\n';
    css += '  position: relative;\n';
    
    // filter効果を組み合わせ
    let filters = ['brightness(100%)'];
    if (animationSettings.border.enabled) {
      const borderSize = Math.max(1, Math.round(animationSettings.border.thickness / 10));
      filters.push(`drop-shadow(-${borderSize}px -${borderSize}px 0 white)`);
      filters.push(`drop-shadow(${borderSize}px -${borderSize}px 0 white)`);
      filters.push(`drop-shadow(-${borderSize}px ${borderSize}px 0 white)`);
      filters.push(`drop-shadow(${borderSize}px ${borderSize}px 0 white)`);
      filters.push(`drop-shadow(0 -${borderSize}px 0 white)`);
      filters.push(`drop-shadow(0 ${borderSize}px 0 white)`);
      filters.push(`drop-shadow(-${borderSize}px 0 0 white)`);
      filters.push(`drop-shadow(${borderSize}px 0 0 white)`);
    }
    css += `  filter: ${filters.join(' ')};\n`;
    
    // アニメーション適用
    if (animationSettings.bounce.enabled) {
      css += `  animation: speak-bounce ${animationSettings.duration}ms infinite alternate ease-in-out;\n`;
    }
    
    css += '}\n\n';
    
    // 名前非表示
    if (generalSettings.hideNames) {
      css += '[class*="Voice_name__"] {\n  display: none;\n}\n\n';
    }
    
    // 画像設定
    css += 'img {\n  display: none;\n}\n\n';
    
    // カスタムユーザーの画像設定
    css += `img[src*="avatars/${userId}"] {\n`;
    css += `  content: var(--img-stand-url-${userId});\n`;
    css += '  display: block;\n';
    css += '  width: auto;\n';
    css += '  height: auto;\n';
    css += `  max-width: ${generalSettings.maxImageWidth}px;\n`;
    css += `  border-radius: ${generalSettings.borderRadius}px;\n`;
    css += '  border: none;\n';
    css += '}\n\n';
    
    // 他のユーザーを非表示
    if (generalSettings.hideOtherUsers) {
      css += `img:not([src*="avatars/${userId}"]), img:not([src*="avatars/${userId}"]) + [class*="Voice_user__"] {\n`;
      css += '  display: none;\n';
      css += '}\n\n';
    }
    
    // アニメーション定義
    if (animationSettings.bounce.enabled) {
      css += '@keyframes speak-bounce {\n';
      css += '  0% { bottom: 0px; }\n';
      css += `  50% { bottom: ${animationSettings.bounce.distance}px; }\n`;
      css += '  100% { bottom: 0px; }\n';
      css += '}\n\n';
    }
    
    setGeneratedCSS(css);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('CSSをクリップボードにコピーしました！');
    });
  };

  const loadDemo = () => {
    setUserId("320897851515207681");
    setStandImageUrl("/demo.webp");
    setUserName("デモキャラクター");
    setAnimationSettings({
      bounce: { enabled: true, distance: 15 },
      border: { enabled: false, thickness: 10 },
      duration: 666
    });
    setGeneralSettings({
      hideNames: true,
      hideOtherUsers: true,
      transparentBackground: true,
      maxImageWidth: 300,
      borderRadius: 0,
      dimWhenNotSpeaking: true
    });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>Discord Streamkit CSS Generator</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Discord StreamkitをOBSでカスタマイズするためのCSSコードを生成します
      </p>
      
      {/* リセットボタン */}
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <button
          onClick={loadDemo}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 デモデータにリセット
        </button>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          ※ 設定を初期状態に戻します
        </p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* 左側：設定パネル */}
        <div>
          {/* ユーザーID取得方法 */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>📋 ユーザーIDの確認方法</h3>
            <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
              <li>Discordで開発者モードを有効にする (設定 → 詳細設定 → 開発者モード)</li>
              <li>ユーザーを右クリックして「IDをコピー」を選択</li>
              <li>取得したIDを下記のユーザーID欄に入力</li>
            </ol>
          </div>

          {/* ユーザー設定 */}
          <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>👤 ユーザー設定</h3>
            
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                ユーザーID
              </label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="320897851515207681"
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      const selected = userCandidates.find(u => u.id === e.target.value);
                      if (selected) {
                        setUserId(selected.id);
                        setUserName(selected.name);
                      }
                    }
                  }}
                  style={{
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">候補から選択</option>
                  {userCandidates.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                立ち絵画像URL
              </label>
              <input
                type="url"
                value={standImageUrl}
                onChange={(e) => setStandImageUrl(e.target.value)}
                placeholder="https://example.com/character.png"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                表示名（オプション）
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="キャラクター名"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
            </div>
            
            {/* 現在の画像プレビュー */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px'
            }}>
              <img 
                src={standImageUrl} 
                alt={userName || userId}
                style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <div>
                <div style={{ fontWeight: 'bold' }}>{userName || 'ユーザー'}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>ID: {userId}</div>
              </div>
            </div>
          </div>

          {/* アニメーション設定 */}
          <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>🎭 喋ってる時のアニメーション</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                アニメーション速度: {animationSettings.duration}ms
              </label>
              <input
                type="range"
                min="200"
                max="2000"
                step="50"
                value={animationSettings.duration}
                onChange={(e) => setAnimationSettings(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                style={{ width: '100%' }}
              />
            </div>
            
            {/* バウンス設定 */}
            <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={animationSettings.bounce.enabled}
                  onChange={(e) => setAnimationSettings(prev => ({ 
                    ...prev, 
                    bounce: { ...prev.bounce, enabled: e.target.checked }
                  }))}
                />
                <span style={{ fontWeight: 'bold' }}>バウンス（上下に跳ねる）</span>
              </label>
              {animationSettings.bounce.enabled && (
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                    距離: {animationSettings.bounce.distance}px
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={animationSettings.bounce.distance}
                    onChange={(e) => setAnimationSettings(prev => ({ 
                      ...prev, 
                      bounce: { ...prev.bounce, distance: parseInt(e.target.value) }
                    }))}
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </div>
            
            
            {/* 縁取り設定 */}
            <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={animationSettings.border.enabled}
                  onChange={(e) => setAnimationSettings(prev => ({ 
                    ...prev, 
                    border: { ...prev.border, enabled: e.target.checked }
                  }))}
                />
                <span style={{ fontWeight: 'bold' }}>縁取り（白い輪郭）</span>
              </label>
              {animationSettings.border.enabled && (
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                    太さ: {Math.max(1, Math.round(animationSettings.border.thickness / 10))}px
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={animationSettings.border.thickness}
                    onChange={(e) => setAnimationSettings(prev => ({ 
                      ...prev, 
                      border: { ...prev.border, thickness: parseInt(e.target.value) }
                    }))}
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 一般設定 */}
          <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>⚙️ 一般設定</h3>
            
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={generalSettings.hideNames}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, hideNames: e.target.checked }))}
                />
                ユーザー名を非表示
              </label>
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={generalSettings.hideOtherUsers}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, hideOtherUsers: e.target.checked }))}
                />
                登録していないユーザーを非表示
              </label>
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={generalSettings.transparentBackground}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, transparentBackground: e.target.checked }))}
                />
                背景を透明化
              </label>
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                画像最大幅: {generalSettings.maxImageWidth}px
              </label>
              <input
                type="range"
                min="100"
                max="800"
                step="50"
                value={generalSettings.maxImageWidth}
                onChange={(e) => setGeneralSettings(prev => ({ ...prev, maxImageWidth: parseInt(e.target.value) }))}
                style={{ width: '100%' }}
              />
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                角の丸み: {generalSettings.borderRadius}px
              </label>
              <input
                type="range"
                min="0"
                max="50"
                value={generalSettings.borderRadius}
                onChange={(e) => setGeneralSettings(prev => ({ ...prev, borderRadius: parseInt(e.target.value) }))}
                style={{ width: '100%' }}
              />
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={generalSettings.dimWhenNotSpeaking}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, dimWhenNotSpeaking: e.target.checked }))}
                />
                黙ってる時に暗くする
              </label>
            </div>
          </div>

          {/* 自動生成の説明 */}
          <div style={{
            padding: '15px',
            backgroundColor: '#e7f3ff',
            borderRadius: '4px',
            border: '1px solid #b3d9ff'
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

        {/* 右側：プレビュー&CSS */}
        <div>
          {/* タブナビゲーション */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', borderBottom: '2px solid #e9ecef' }}>
              <button
                onClick={() => setActiveTab('preview')}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: activeTab === 'preview' ? '#007bff' : 'transparent',
                  color: activeTab === 'preview' ? 'white' : '#666',
                  border: 'none',
                  borderRadius: '4px 4px 0 0',
                  cursor: 'pointer',
                  marginRight: '8px'
                }}
              >
                👁️ プレビュー
              </button>
              <button
                onClick={() => setActiveTab('css')}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: activeTab === 'css' ? '#007bff' : 'transparent',
                  color: activeTab === 'css' ? 'white' : '#666',
                  border: 'none',
                  borderRadius: '4px 4px 0 0',
                  cursor: 'pointer'
                }}
              >
                📋 CSSコード
              </button>
            </div>
          </div>

          {/* タブコンテンツ */}
          {generatedCSS ? (
            <div>
              {activeTab === 'preview' && (
                <div>
                  <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0' }}>アニメーションプレビュー:</h4>
                      <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                        喋ってる時のエフェクトをシミュレーション表示
                      </p>
                    </div>
                    
                    {/* 状態切り替えボタン */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setIsSpeaking(false)}
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          backgroundColor: !isSpeaking ? '#dc3545' : '#f8f9fa',
                          color: !isSpeaking ? 'white' : '#666',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        🔇 黙ってる時
                      </button>
                      <button
                        onClick={() => setIsSpeaking(true)}
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          backgroundColor: isSpeaking ? '#28a745' : '#f8f9fa',
                          color: isSpeaking ? 'white' : '#666',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        🎤 喋ってる時
                      </button>
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '40px',
                    backgroundColor: '#36393f',
                    borderRadius: '8px',
                    minHeight: '400px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      bottom: '40px',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}>
                      <img 
                        src={standImageUrl}
                        alt={userName || userId}
                        style={{
                          maxWidth: `${Math.min(generalSettings.maxImageWidth / 1.5, 200)}px`,
                          height: 'auto',
                          borderRadius: `${generalSettings.borderRadius}px`,
                          border: 'none',
                          filter: (() => {
                            let filters = [isSpeaking ? 'brightness(100%)' : (generalSettings.dimWhenNotSpeaking ? 'brightness(70%)' : 'brightness(100%)')];
                            if (isSpeaking && animationSettings.border.enabled) {
                              const borderSize = Math.max(1, Math.round(animationSettings.border.thickness / 10));
                              filters.push(`drop-shadow(-${borderSize}px -${borderSize}px 0 white)`);
                              filters.push(`drop-shadow(${borderSize}px -${borderSize}px 0 white)`);
                              filters.push(`drop-shadow(-${borderSize}px ${borderSize}px 0 white)`);
                              filters.push(`drop-shadow(${borderSize}px ${borderSize}px 0 white)`);
                              filters.push(`drop-shadow(0 -${borderSize}px 0 white)`);
                              filters.push(`drop-shadow(0 ${borderSize}px 0 white)`);
                              filters.push(`drop-shadow(-${borderSize}px 0 0 white)`);
                              filters.push(`drop-shadow(${borderSize}px 0 0 white)`);
                            }
                            return filters.join(' ');
                          })(),
                          animation: isSpeaking && animationSettings.bounce.enabled ? `demo-bounce ${animationSettings.duration}ms infinite alternate ease-in-out` : 'none'
                        }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      {!generalSettings.hideNames && (
                        <div style={{
                          color: '#dcddde',
                          fontSize: '16px',
                          marginTop: '15px',
                          textAlign: 'center',
                          fontWeight: 'bold'
                        }}>
                          {userName || 'ユーザー'}
                        </div>
                      )}
                    </div>
                    
                    <div style={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      fontSize: '16px',
                      color: '#72767d',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      padding: '12px 16px',
                      borderRadius: '8px'
                    }}>
                      {isSpeaking ? '🎤 喋ってる時のプレビュー' : '🔇 黙ってる時のプレビュー'}
                    </div>
                  </div>

                  {/* プレビューアニメーション用CSS */}
                  <style>
                    {`
                      @keyframes demo-bounce {
                        0% { transform: translateY(0px); }
                        50% { transform: translateY(-${animationSettings.bounce.distance}px); }
                        100% { transform: translateY(0px); }
                      }
                    `}
                  </style>
                </div>
              )}

              {activeTab === 'css' && (
                <div>
                  <div style={{ marginBottom: '15px' }}>
                    <h4>使用方法:</h4>
                    <ol style={{ fontSize: '14px', color: '#666' }}>
                      <li>OBSでブラウザソースを追加</li>
                      <li>URLにDiscord StreamkitのURLを入力</li>
                      <li>「カスタムCSS」にこのコードをコピー＆ペースト</li>
                      <li>完了！</li>
                    </ol>
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <button
                      onClick={() => copyToClipboard(generatedCSS)}
                      style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      📋 CSSをクリップボードにコピー
                    </button>
                  </div>
                  
                  <textarea
                    value={generatedCSS}
                    readOnly
                    style={{
                      width: '100%',
                      height: '500px',
                      padding: '20px',
                      fontSize: '13px',
                      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      backgroundColor: '#f8f9fa',
                      resize: 'vertical',
                      lineHeight: '1.5'
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div style={{
              padding: '60px',
              textAlign: 'center',
              color: '#666',
              border: '2px dashed #ddd',
              borderRadius: '8px'
            }}>
              <p style={{ fontSize: '18px', marginBottom: '10px' }}>✨ CSS生成準備完了</p>
              <p style={{ fontSize: '14px' }}>
                💡 「CSSコードを生成」ボタンを押すとプレビューとCSSが表示されます
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscordObs;