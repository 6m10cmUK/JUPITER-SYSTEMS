import { useState } from 'react';
import type { Character } from '../../types/character.types';
import { CharacterTile } from '../CharacterTile/CharacterTile';
import { CharacterModal } from '../CharacterModal/CharacterModal';

interface CharacterGalleryProps {
  characters: Character[];
}

export function CharacterGallery({ characters }: CharacterGalleryProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            <span className="border-b-2 border-gray-900 pb-1">▍CHARACTERS</span>
          </h2>
          
          {characters.length > 0 ? (
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex flex-col gap-4" style={{ width: 'max-content' }}>
                {/* 上段 - 偶数インデックス */}
                <div className="flex gap-4">
                  {characters.filter((_, index) => index % 2 === 0).map((character, index) => (
                    <div className="flex-shrink-0 w-48" key={`${character.name}-top-${index}`}>
                      <CharacterTile 
                        character={character}
                        onClick={handleCharacterClick}
                      />
                    </div>
                  ))}
                </div>
                {/* 下段 - 奇数インデックス（少し右にズラす） */}
                <div className="flex gap-4" style={{ marginLeft: '6rem' }}>
                  {characters.filter((_, index) => index % 2 === 1).map((character, index) => (
                    <div className="flex-shrink-0 w-48" key={`${character.name}-bottom-${index}`}>
                      <CharacterTile 
                        character={character}
                        onClick={handleCharacterClick}
                      />
                    </div>
                  ))}
                </div>
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