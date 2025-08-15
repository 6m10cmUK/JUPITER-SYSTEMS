interface CharacterImage {
  file: File;
  url: string;
  cropData?: CropData;
}

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CharacterData {
  baseImage: CharacterImage | null;
  expressions: CharacterImage[];  // 表情差分の配列
  characterName: string;
  scenarioName: string;
}

interface Position {
  x: number | string;  // ピクセル値または％
  y: number | string;
  width?: number | string;
  height?: number | string;
}

interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight?: string;
  color: string;
  shadow?: string;
  backgroundColor?: string;
}

interface Theme {
  id: string;
  name: string;
  description: string;  // テーマ詳細
  
  // 画像サイズ
  canvasSize: {
    width: number;
    height: number;
  };
  
  // 背景
  backgroundImage?: string;  // 背景画像URL
  backgroundColor: string;   // 背景色（画像がない場合のフォールバック）
  
  // レイアウト設定
  layout: {
    characterImage: Position & {
      maxWidth: string | number;
      maxHeight: string | number;
      objectFit?: 'cover' | 'contain' | 'fill';
    };
    expressions: Position & {
      thumbnailSize: number;
      gap: number;
      columns?: number;
    };
    characterName: Position;
    scenarioName: Position;
  };
  
  // テキストスタイル
  textStyles: {
    characterName: TextStyle;
    scenarioName: TextStyle;
    expressionLabel?: TextStyle;
  };
  
  // 装飾
  decorations?: {
    border?: {
      style: 'none' | 'solid' | 'gradient' | 'ornate';
      width: number;
      color: string;
      radius?: number;
    };
    overlay?: string;  // オーバーレイ画像URL
    elements?: Array<{
      type: 'image' | 'text';
      content: string;
      position: Position;
      style?: any;
    }>;
  };
}

export type { CharacterImage, CropData, CharacterData, Theme, Position, TextStyle };