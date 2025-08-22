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
  characterNameFurigana?: string;  // ふりがな（オプション）
  scenarioName: string;
}

interface Position {
  x: number | string;  // ピクセル値または％
  y: number | string;
  width?: number | string;
  height?: number | string;
  rotation?: number;  // 回転角度（度）
  writingMode?: 'horizontal' | 'vertical';  // 縦書き/横書き
}

interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight?: string;
  color: string;
  shadow?: string;
  backgroundColor?: string;
  letterSpacing?: number;  // 文字間隔（px）
  scaleX?: number;  // 水平方向の拡大率（1.0が標準）
  scaleY?: number;  // 垂直方向の拡大率（1.0が標準）
  strokeWidth?: number;  // 文字の輪郭線の太さ
  strokeColor?: string;  // 文字の輪郭線の色
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
    characterNameFurigana?: TextStyle;  // ふりがなのスタイル
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