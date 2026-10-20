import { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteDragScroll } from '../model/useInfiniteDragScroll';
import type { Character } from '../lib/character.types';
import { CharacterTile } from './CharacterTile';
import { CharacterModal } from './CharacterModal';

interface CharacterGalleryProps {
  characters: Character[];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function CharacterGallery({ characters }: CharacterGalleryProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rowCount, setRowCount] = useState(2);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 画面サイズに応じて行数を変更
  useEffect(() => {
    const updateRowCount = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setRowCount(3); // モバイル: 3行
      } else if (width < 1024) {
        setRowCount(3); // タブレット: 3行
      } else {
        setRowCount(2); // デスクトップ: 2行
      }
    };

    updateRowCount();
    window.addEventListener('resize', updateRowCount);
    return () => window.removeEventListener('resize', updateRowCount);
  }, []);

  // キャラクターをランダムに並び替えて3セット用意（無限ループ用）
  const shuffledCharacters = useMemo(() => {
    const shuffled = shuffleArray(characters);
    return [...shuffled, ...shuffled, ...shuffled];
  }, [characters]);

  useInfiniteDragScroll(scrollRef, characters, rowCount);

  const handleCharacterClick = (character: Character) => {
    setSelectedCharacter(character);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // モーダルのアニメーション後にキャラクターをクリア
    setTimeout(() => setSelectedCharacter(null), 300);
  };

  return (
    <>
      <section className="w-full bg-gray-50 py-12">
        <div className="w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 inline-block">
              <span className="border-b-2 border-gray-900 pb-1">CHARACTERS</span>
            </h2>
          </div>
          
          {characters.length > 0 ? (
            <div 
              className="w-full overflow-x-auto scrollbar-hide cursor-grab data-[dragging=true]:cursor-grabbing data-[dragging=true]:[&_*]:cursor-grabbing!" 
              ref={scrollRef}>
              <div className="flex flex-col gap-2 sm:gap-3 lg:gap-4" style={{ width: 'max-content' }}>
                {Array.from({ length: rowCount }, (_, rowIndex) => (
                  <div 
                    key={`row-${rowIndex}`}
                    className="flex gap-2 sm:gap-3 lg:gap-4" 
                    style={{ 
                      marginLeft: `${rowIndex * (rowCount === 3 ? 5 : 7)}rem` 
                    }}
                  >
                    {shuffledCharacters
                      .filter((_, index) => index % rowCount === rowIndex)
                      .map((character, index) => (
                        <div 
                          className="flex-shrink-0 w-56" 
                          key={`${character.name}-row${rowIndex}-${index}`}
                        >
                          <CharacterTile 
                            character={character}
                            onClick={handleCharacterClick}
                          />
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🎭</div>
              <p className="text-lg">キャラクターデータがまだありません</p>
              <p className="text-sm mt-2">JSONでキャラクターデータを追加してください</p>
            </div>
          )}
        </div>
      </section>

      <CharacterModal 
        character={selectedCharacter}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}
