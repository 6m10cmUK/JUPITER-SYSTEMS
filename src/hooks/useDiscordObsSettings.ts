import { useState, useEffect } from 'react';
import type { AnimationSettings, GeneralSettings } from '../types/discordObs.types';
import { DEFAULT_ANIMATION_SETTINGS, DEFAULT_GENERAL_SETTINGS } from '../types/discordObs.types';

function generateCSS(
  userId: string,
  standImageUrl: string,
  userName: string,
  animationSettings: AnimationSettings,
  generalSettings: GeneralSettings,
): string {
  let css = ':root {\n';
  css += `  /* ${userName || userId} */\n`;
  css += `  --img-stand-url-${userId}: url("${standImageUrl}");\n`;
  css += '}\n\n/* 基本設定 */\n';

  if (generalSettings.transparentBackground) {
    css += 'body, #root {\n  overflow: hidden !important;\n}\n\n';
  }

  css += '[class*="Voice_voiceStates__"] {\n';
  css += '  display: flex;\n';
  css += '  align-items: flex-end;\n';
  css += '  justify-content: flex-start;\n';
  css += '  padding: 16px;\n';
  css += '  position: fixed;\n';
  css += '  bottom: 0;\n';
  css += '  left: 0;\n';
  css += '  width: 100%;\n';
  css += '  height: 100vh;\n';
  css += '}\n\n';

  css += '[class*="Voice_voiceState__"] {\n';
  css += '  height: auto;\n';
  css += '  margin-bottom: 0px;\n';
  css += '}\n\n';

  if (generalSettings.hideWhenNotSpeaking) {
    css += '[class*="Voice_avatar__"]:not([class*="Voice_avatarSpeaking__"]) {\n';
    css += '  display: none !important;\n';
    css += '}\n\n';
  } else if (generalSettings.dimWhenNotSpeaking) {
    css += '[class*="Voice_avatar__"] {\n';
    css += '  filter: brightness(70%);\n';
    css += '}\n\n';
  }

  css += '[class*="Voice_avatarSpeaking__"] {\n';
  css += '  position: relative;\n';

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

  if (animationSettings.bounce.enabled) {
    css += `  animation: speak-bounce ${animationSettings.duration}ms infinite alternate ease-in-out;\n`;
  }

  css += '}\n\n';

  if (generalSettings.hideNames) {
    css += '[class*="Voice_name__"] {\n  display: none;\n}\n\n';
  }

  css += 'img {\n  display: none;\n}\n\n';

  css += `img[src*="avatars/${userId}"] {\n`;
  css += `  content: var(--img-stand-url-${userId});\n`;
  css += '  display: block;\n';
  css += '  width: auto;\n';
  css += '  height: auto;\n';
  css += `  max-width: ${generalSettings.maxImageWidth}px;\n`;
  css += `  max-height: ${generalSettings.maxImageHeight}px;\n`;
  css += `  border-radius: ${generalSettings.borderRadius}px;\n`;
  css += '  border: none;\n';
  css += '  object-fit: contain;\n';
  css += '}\n\n';

  if (generalSettings.showDefaultImage) {
    css += `/* デフォルト画像の常時表示 */\n`;
    css += '[class*="Voice_voiceStates__"] {\n';
    css += '  position: relative;\n';
    css += '}\n\n';

    css += '[class*="Voice_voiceStates__"]::before {\n';
    css += `  content: var(--img-stand-url-${userId});\n`;
    css += '  display: block;\n';
    css += '  position: fixed;\n';
    css += '  left: 16px;\n';
    css += '  bottom: 16px;\n';
    css += '  width: auto;\n';
    css += '  height: auto;\n';
    css += `  max-width: ${generalSettings.maxImageWidth}px;\n`;
    css += `  max-height: ${generalSettings.maxImageHeight}px;\n`;
    css += `  border-radius: ${generalSettings.borderRadius}px;\n`;
    css += '  border: none;\n';
    css += '  z-index: 1;\n';
    css += '  object-fit: contain;\n';
    css += '  object-position: bottom left;\n';
    if (!generalSettings.hideWhenNotSpeaking && generalSettings.dimWhenNotSpeaking) {
      css += '  filter: brightness(70%);\n';
    }
    css += '}\n\n';

    css += '[class*="Voice_avatarSpeaking__"] ~ [class*="Voice_voiceStates__"]::before {\n';
    css += '  display: none;\n';
    css += '}\n\n';

    css += '[class*="Voice_avatar__"] {\n';
    css += '  position: relative;\n';
    css += '  z-index: 2;\n';
    css += '}\n\n';
  }

  if (generalSettings.hideOtherUsers) {
    css += `img:not([src*="avatars/${userId}"]), img:not([src*="avatars/${userId}"]) + [class*="Voice_user__"] {\n`;
    css += '  display: none;\n';
    css += '}\n\n';
  }

  if (animationSettings.bounce.enabled) {
    css += '@keyframes speak-bounce {\n';
    css += '  0% { bottom: 0px; }\n';
    css += `  50% { bottom: ${animationSettings.bounce.distance}px; }\n`;
    css += '  100% { bottom: 0px; }\n';
    css += '}\n\n';
  }

  return css;
}

export function useDiscordObsSettings() {
  const [userId, setUserId] = useState('320897851515207681');
  const [standImageUrl, setStandImageUrl] = useState('/demo.webp');
  const [userName, setUserName] = useState('デモキャラクター');
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>(DEFAULT_ANIMATION_SETTINGS);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);
  const [generatedCSS, setGeneratedCSS] = useState('');

  useEffect(() => {
    setGeneratedCSS(generateCSS(userId, standImageUrl, userName, animationSettings, generalSettings));
  }, [userId, standImageUrl, userName, animationSettings, generalSettings]);

  const loadDemo = () => {
    setUserId('320897851515207681');
    setStandImageUrl('/demo.webp');
    setUserName('デモキャラクター');
    setAnimationSettings(DEFAULT_ANIMATION_SETTINGS);
    setGeneralSettings(DEFAULT_GENERAL_SETTINGS);
  };

  const copyCSS = () => {
    navigator.clipboard.writeText(generatedCSS).then(() => {
      alert('CSSをクリップボードにコピーしました！');
    });
  };

  return {
    userId, setUserId,
    standImageUrl, setStandImageUrl,
    userName, setUserName,
    animationSettings, setAnimationSettings,
    generalSettings, setGeneralSettings,
    generatedCSS,
    loadDemo,
    copyCSS,
  };
}
