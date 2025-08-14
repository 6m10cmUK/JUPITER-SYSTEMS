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

interface Theme {
  id: string;
  name: string;
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  borderStyle: 'none' | 'solid' | 'gradient' | 'ornate';
  fontFamily: string;
  decorations?: {
    topLeft?: string;
    topRight?: string;
    bottomLeft?: string;
    bottomRight?: string;
  };
}

export type { CharacterImage, CropData, CharacterData, Theme };