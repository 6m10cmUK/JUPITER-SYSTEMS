import React from 'react';
import type { AnimationSettings, GeneralSettings } from '../../types/discordObs.types';

interface Props {
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

export const PreviewPanel: React.FC<Props> = ({
  standImageUrl, userName, userId, animationSettings, generalSettings,
  isSpeaking, isInChat, setIsSpeaking, setIsInChat,
}) => {
  const getImageFilter = () => {
    const filters = [isSpeaking ? 'brightness(100%)' : (generalSettings.dimWhenNotSpeaking ? 'brightness(70%)' : 'brightness(100%)')];
    if (isSpeaking && animationSettings.border.enabled) {
      const s = Math.max(1, Math.round(animationSettings.border.thickness / 10));
      filters.push(
        `drop-shadow(-${s}px -${s}px 0 white)`,
        `drop-shadow(${s}px -${s}px 0 white)`,
        `drop-shadow(-${s}px ${s}px 0 white)`,
        `drop-shadow(${s}px ${s}px 0 white)`,
        `drop-shadow(0 -${s}px 0 white)`,
        `drop-shadow(0 ${s}px 0 white)`,
        `drop-shadow(-${s}px 0 0 white)`,
        `drop-shadow(${s}px 0 0 white)`,
      );
    }
    return filters.join(' ');
  };

  const previewLabel = !isInChat
    ? '💤 チャット非表示時のプレビュー'
    : (isSpeaking ? '🎤 喋ってる時のプレビュー' : '🔇 黙ってる時のプレビュー');

  const stateButtons = [
    { label: '💤 チャット非表示時', active: !isInChat, onClick: () => { setIsInChat(false); setIsSpeaking(false); } },
    { label: '🔇 黙ってる時', active: isInChat && !isSpeaking, onClick: () => { setIsInChat(true); setIsSpeaking(false); } },
    { label: '🎤 喋ってる時', active: isInChat && isSpeaking, onClick: () => { setIsInChat(true); setIsSpeaking(true); } },
  ];

  const imgStyle = {
    maxWidth: `${Math.min(generalSettings.maxImageWidth / 2, 400)}px`,
    maxHeight: `${Math.min(generalSettings.maxImageHeight / 2, 300)}px`,
    height: 'auto' as const,
    borderRadius: `${generalSettings.borderRadius}px`,
    border: 'none',
    objectFit: 'contain' as const,
  };

  return (
    <div>
      <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: '0 0 5px 0' }}>アニメーションプレビュー:</h4>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>喋ってる時のエフェクトをシミュレーション表示</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {stateButtons.map(({ label, active, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              style={{
                padding: '8px 16px', fontSize: '14px',
                backgroundColor: active
                  ? (label.startsWith('🎤') ? '#28a745' : label.startsWith('🔇') ? '#dc3545' : '#6c757d')
                  : '#f8f9fa',
                color: active ? 'white' : '#666',
                border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        padding: '40px', backgroundColor: '#36393f', borderRadius: '8px',
        minHeight: '400px', position: 'relative', overflow: 'hidden',
      }}>
        {!isInChat && generalSettings.showDefaultImage && (
          <div style={{
            position: 'absolute', left: '40px', bottom: '40px',
            display: generalSettings.hideWhenNotSpeaking ? 'none' : 'flex',
            flexDirection: 'column', alignItems: 'flex-start', zIndex: 1,
          }}>
            <img
              src={standImageUrl}
              alt={`${userName || userId} (デフォルト)`}
              style={{
                ...imgStyle,
                filter: generalSettings.dimWhenNotSpeaking ? 'brightness(70%)' : 'brightness(100%)',
                opacity: 0.8,
              }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            {!generalSettings.hideNames && (
              <div style={{ color: '#dcddde', fontSize: '16px', marginTop: '15px', textAlign: 'center', fontWeight: 'bold', opacity: 0.8 }}>
                {userName || 'ユーザー'} (非表示時)
              </div>
            )}
          </div>
        )}

        {isInChat && (
          <div style={{
            position: 'absolute', left: '40px', bottom: '40px',
            display: (!isSpeaking && generalSettings.hideWhenNotSpeaking) ? 'none' : 'flex',
            flexDirection: 'column', alignItems: 'flex-start', zIndex: 2,
          }}>
            <img
              src={standImageUrl}
              alt={userName || userId}
              style={{
                ...imgStyle,
                filter: getImageFilter(),
                animation: isSpeaking && animationSettings.bounce.enabled
                  ? `demo-bounce ${animationSettings.duration}ms infinite alternate ease-in-out`
                  : 'none',
              }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            {!generalSettings.hideNames && (
              <div style={{ color: '#dcddde', fontSize: '16px', marginTop: '15px', textAlign: 'center', fontWeight: 'bold' }}>
                {userName || 'ユーザー'}
              </div>
            )}
          </div>
        )}

        <div style={{
          position: 'absolute', top: '20px', right: '20px',
          fontSize: '16px', color: '#72767d',
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: '12px 16px', borderRadius: '8px',
        }}>
          {previewLabel}
        </div>
      </div>

      <style>{`
        @keyframes demo-bounce {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-${animationSettings.bounce.distance}px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
};
