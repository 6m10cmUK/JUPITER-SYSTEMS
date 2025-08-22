import { useEffect, useState } from 'react';
import type { CharacterModalProps } from '../../types/character.types';

export function CharacterModal({ character, isOpen, onClose }: CharacterModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      setSelectedImageIndex(0); // モーダルを開くたびにリセット
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !character) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
        onClick={onClose}
      />
      
      {/* モーダル本体 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none overflow-y-auto">
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col pointer-events-auto animate-slide-up my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden rounded-2xl">
            {/* 左側：立ち絵 */}
            <div className="md:w-1/2 bg-gray-50 p-8 flex flex-col items-center justify-center overflow-y-auto rounded-t-2xl md:rounded-tr-none md:rounded-l-2xl">
              {character.fullImages && character.fullImages.length > 0 ? (
                <>
                  <div className="flex-1 flex items-center justify-center mb-4">
                    <img 
                      src={character.fullImages[selectedImageIndex]} 
                      alt={`${character.name} - 立ち絵${selectedImageIndex + 1}`}
                      className="max-w-full max-h-[40vh] md:max-h-[50vh] object-contain"
                    />
                  </div>
                  {/* 画像サムネイル切り替え */}
                  {character.fullImages.length > 1 && (
                    <div className="flex gap-2 flex-wrap justify-center">
                      {character.fullImages.map((imageUrl, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`w-16 h-20 rounded-lg overflow-hidden transition-all ${
                            index === selectedImageIndex
                              ? 'ring-2 ring-jupiter-500 ring-offset-2'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img 
                            src={imageUrl}
                            alt={`立ち絵${index + 1}`}
                            className="w-full h-full object-cover object-top"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-64 h-96 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                  立ち絵画像
                </div>
              )}
            </div>
            
            {/* 右側：詳細情報 */}
            <div className="md:w-1/2 p-8 overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-3xl font-bold text-gray-900">{character.name}</h2>
                <button 
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              
              {/* タグ */}
              <div className="flex flex-wrap gap-2 mb-6">
                {character.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="inline-block px-3 py-1 bg-jupiter-100 text-jupiter-700 rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              {/* 通過シナリオ */}
              {character.scenarios && character.scenarios.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">通過シナリオ</h3>
                  <ul className="space-y-1">
                    {character.scenarios.map((scenario, index) => (
                      <li key={index} className="text-gray-600 flex items-start">
                        <span className="text-jupiter-500 mr-2">▸</span>
                        <span>{scenario}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* キャラシートリンク */}
              {character.characterSheetUrl && (
                <a 
                  href={character.characterSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-jupiter-500 text-white rounded-full font-medium hover:bg-jupiter-600 transition-colors"
                >
                  {(() => {
                    try {
                      const url = new URL(character.characterSheetUrl);
                      return url.hostname.replace('www.', '');
                    } catch {
                      return 'キャラクターシート';
                    }
                  })()}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}