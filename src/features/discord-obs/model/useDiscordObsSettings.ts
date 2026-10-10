import { useState, useEffect } from 'react';
import type { AnimationSettings, GeneralSettings } from '../lib/discordObs.types';
import { DEFAULT_ANIMATION_SETTINGS, DEFAULT_GENERAL_SETTINGS } from '../lib/discordObs.types';
import { generateCSS } from '../lib/generateCss';

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
