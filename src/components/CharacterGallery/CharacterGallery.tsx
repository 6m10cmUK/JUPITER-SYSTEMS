import { useState, useMemo, useEffect, useRef } from 'react';
import type { Character } from '../../types/character.types';
import { CharacterTile } from '../CharacterTile/CharacterTile';
import { CharacterModal } from '../CharacterModal/CharacterModal';

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
        setRowCount(4); // モバイル: 4行
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

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || characters.length === 0) return;

    // レイアウト変更時のタイミング調整
    setTimeout(() => {
      const oneSetWidth = scrollContainer.scrollWidth / 3;
      scrollContainer.scrollLeft = oneSetWidth;
    }, 100);

    // マウスホイールでの手動スクロール
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const oneSetWidth = scrollContainer.scrollWidth / 3;
      const scrollAmount = e.deltaY * 0.5 + e.deltaX * 0.5;
      
      let newScrollLeft = scrollContainer.scrollLeft + scrollAmount;
      
      // 無限ループ処理（より厳密な境界チェック）
      if (newScrollLeft >= oneSetWidth * 2.5) {
        newScrollLeft = newScrollLeft - oneSetWidth;
      } else if (newScrollLeft <= oneSetWidth * 0.5) {
        newScrollLeft = newScrollLeft + oneSetWidth;
      }
      
      scrollContainer.scrollLeft = newScrollLeft;
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      scrollContainer.removeEventListener('wheel', handleWheel);
    };
  }, [characters, rowCount]);

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
            <div className="overflow-x-hidden" ref={scrollRef}>
              <div className="flex flex-col gap-2 sm:gap-3 lg:gap-4" style={{ width: 'max-content' }}>
                {Array.from({ length: rowCount }, (_, rowIndex) => (
                  <div 
                    key={`row-${rowIndex}`}
                    className="flex gap-2 sm:gap-3 lg:gap-4" 
                    style={{ 
                      marginLeft: `${rowIndex * (rowCount === 4 ? 3 : rowCount === 3 ? 5 : 7)}rem` 
                    }}
                  >
                    {shuffledCharacters
                      .filter((_, index) => index % rowCount === rowIndex)
                      .map((character, index) => (
                        <div 
                          className="flex-shrink-0 w-32 sm:w-44 lg:w-56" 
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