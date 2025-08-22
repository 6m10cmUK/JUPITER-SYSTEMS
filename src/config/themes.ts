import type { Theme } from '../types/characterDisplay.tsx';

// Viteのglob importを使って動的にテーマを読み込む
const themeModules = import.meta.glob('./themes/*/theme.json', { eager: true });

// テーマの画像パスを解決する関数
const resolveThemePaths = (theme: Theme, themeName: string): Theme => {
  const resolved = { ...theme };
  const basePath = `/src/config/themes/${themeName}`;
  
  // 背景画像のパス解決
  if (resolved.backgroundImage && resolved.backgroundImage.startsWith('./')) {
    resolved.backgroundImage = basePath + resolved.backgroundImage.substring(1);
  }
  
  // オーバーレイ画像のパス解決
  if (resolved.decorations?.overlay && resolved.decorations.overlay.startsWith('./')) {
    resolved.decorations.overlay = basePath + resolved.decorations.overlay.substring(1);
  }
  
  return resolved;
};

// 動的に読み込んだテーマを処理
export const themes: Theme[] = Object.entries(themeModules).map(([path, module]) => {
  // パスからテーマ名を抽出 (./themes/modern/theme.json -> modern)
  const themeName = path.split('/')[2];
  const themeData = (module as any).default || module;
  
  return resolveThemePaths(themeData as Theme, themeName);
});

// デフォルトテーマ（最初のテーマまたはmodernテーマ）
export const defaultTheme = themes.find(t => t.id === 'modern') || themes[0];

// テーマIDからテーマを取得
export const getThemeById = (id: string): Theme | undefined => {
  return themes.find(theme => theme.id === id);
};

// 開発時のデバッグ用
if (import.meta.env.DEV) {
  console.log('Loaded themes:', themes.map(t => ({ id: t.id, name: t.name })));
}