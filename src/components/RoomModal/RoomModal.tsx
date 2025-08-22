import { useEffect } from 'react';
import type { Room } from '../../types/room.types';

interface RoomModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RoomModal({ room, isOpen, onClose }: RoomModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !room) return null;

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
          className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-auto pointer-events-auto animate-slide-up my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 画像 */}
          <div className="relative bg-gray-100">
            <img 
              src={room.image} 
              alt={room.name}
              className="w-full h-auto"
            />
            {/* 閉じるボタン */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* 情報部分 */}
          <div className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{room.name}</h2>
            
            {/* タグ */}
            <div className="flex flex-wrap gap-2">
              {room.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="inline-block px-3 py-1 bg-jupiter-100 text-jupiter-700 rounded-full text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}