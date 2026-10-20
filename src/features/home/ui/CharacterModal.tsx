import { useEffect, useRef, useState } from 'react';
import type { CharacterModalProps } from '../lib/character.types';
import { useDragScroll } from '../model/useDragScroll';

export function CharacterModal({ character, isOpen, onClose }: CharacterModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const thumbsRef = useRef<HTMLDivElement>(null);
  useDragScroll(thumbsRef, [isOpen, character]);
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

  // 立ち絵サムネのはみ出し状態（左右に隠れた分があるか）
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    if (!isOpen || !character) return;
    const el = thumbsRef.current;
    if (!el) {
      setEdges({ left: false, right: false });
      return;
    }

    const update = () => {
      const left = el.scrollLeft > 1;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
      setEdges((prev) =>
        prev.left === left && prev.right === right ? prev : { left, right }
      );
    };

    el.addEventListener('scroll', update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);
    // 画像読み込み後のずれ対策として初回計算を1回遅らせる
    const frame = requestAnimationFrame(update);

    return () => {
      el.removeEventListener('scroll', update);
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [isOpen, character]);

  if (!isOpen || !character) return null;

  const fadeLeft = edges.left ? 'transparent 0, black 32px' : 'black 0';
  const fadeRight = edges.right ? 'black calc(100% - 32px), transparent 100%' : 'black 100%';
  const thumbMask =
    edges.left || edges.right
      ? `linear-gradient(to right, ${fadeLeft}, ${fadeRight})`
      : undefined;
  const thumbMaskStyle = thumbMask
    ? { maskImage: thumbMask, WebkitMaskImage: thumbMask }
    : undefined;

  const scrollThumbs = (direction: -1 | 1) => {
    const el = thumbsRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  };

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
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden rounded-2xl">
            {/* 左側：立ち絵 */}
            <div className="md:w-1/2 bg-gray-50 p-5 md:p-8 flex flex-col items-center justify-center shrink-0 md:shrink md:overflow-y-auto rounded-t-2xl md:rounded-tr-none md:rounded-l-2xl">
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
                    <div className="relative w-full">
                      <div
                        ref={thumbsRef}
                        className="w-full overflow-x-auto cursor-grab data-[dragging=true]:cursor-grabbing data-[dragging=true]:[&_*]:cursor-grabbing!"
                        style={thumbMaskStyle}
                      >
                        <div className="flex gap-2 w-max mx-auto px-1 py-2">
                          {character.fullImages.map((imageUrl, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedImageIndex(index)}
                              className={`shrink-0 w-16 h-20 rounded-lg overflow-hidden transition-all ${
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
                      </div>
                      {edges.left && (
                        <button
                          type="button"
                          onClick={() => scrollThumbs(-1)}
                          aria-label="前の立ち絵"
                          className="absolute top-1/2 -translate-y-1/2 left-0 w-8 h-8 rounded-full bg-white/90 shadow-md text-gray-700 hover:bg-white flex items-center justify-center z-10"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                      )}
                      {edges.right && (
                        <button
                          type="button"
                          onClick={() => scrollThumbs(1)}
                          aria-label="次の立ち絵"
                          className="absolute top-1/2 -translate-y-1/2 right-0 w-8 h-8 rounded-full bg-white/90 shadow-md text-gray-700 hover:bg-white flex items-center justify-center z-10"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
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
            <div className="md:w-1/2 p-5 md:p-8 md:overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  {character.reading && (
                    <p className="text-sm text-gray-500 mb-1">{character.reading}</p>
                  )}
                  <h2 className="text-3xl font-bold text-gray-900">{character.name}</h2>
                </div>
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