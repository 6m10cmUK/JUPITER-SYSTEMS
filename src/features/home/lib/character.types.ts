
export interface Character {
  name: string;
  reading?: string;  // 読み仮名
  iconImage: string;
  fullImages?: string[];  // 複数の立ち絵URL
  tags: string[];
  scenarios: string[];  // 通過シナリオリスト
  characterSheetUrl?: string;
}

export interface CharacterModalProps {
  character: Character | null;
  isOpen: boolean;
  onClose: () => void;
}