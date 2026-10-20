import { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteDragScroll } from '../model/useInfiniteDragScroll';
import type { Room } from '../lib/room.types';
import { RoomTile } from './RoomTile';
import { RoomModal } from './RoomModal';

interface RoomGalleryProps {
  rooms: Room[];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function RoomGallery({ rooms }: RoomGalleryProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rowCount, setRowCount] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 画面サイズに応じて行数を変更
  useEffect(() => {
    const updateRowCount = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setRowCount(3); // モバイル: 3行
      } else if (width < 1024) {
        setRowCount(2); // タブレット: 2行
      } else {
        setRowCount(1); // デスクトップ: 1行
      }
    };

    updateRowCount();
    window.addEventListener('resize', updateRowCount);
    return () => window.removeEventListener('resize', updateRowCount);
  }, []);

  // ルームをランダムに並び替えて3セット用意（無限ループ用）
  const shuffledRooms = useMemo(() => {
    const shuffled = shuffleArray(rooms);
    return [...shuffled, ...shuffled, ...shuffled];
  }, [rooms]);

  useInfiniteDragScroll(scrollRef, rooms, rowCount);

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedRoom(null), 300);
  };

  return (
    <>
    <section className="w-full bg-gray-50 py-12 pb-20">
      <div className="w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 inline-block">
            <span className="border-b-2 border-gray-900 pb-1">ROOMS</span>
          </h2>
        </div>
        
        {rooms.length > 0 ? (
          <div 
            className="w-full overflow-x-auto scrollbar-hide cursor-grab data-[dragging=true]:cursor-grabbing data-[dragging=true]:[&_*]:cursor-grabbing!" 
            ref={scrollRef}>
            <div 
              className={rowCount === 1 ? "flex gap-4 sm:gap-5 lg:gap-6" : "flex flex-col gap-3 sm:gap-4 lg:gap-5"} 
              style={{ width: 'max-content' }}
            >
              {rowCount === 1 ? (
                // デスクトップ: 1行表示
                shuffledRooms.map((room, index) => (
                  <div className="flex-shrink-0 w-96" key={`${room.name}-${index}`}>
                    <RoomTile 
                      room={room}
                      onClick={handleRoomClick}
                    />
                  </div>
                ))
              ) : (
                // モバイル/タブレット: 複数行表示
                Array.from({ length: rowCount }, (_, rowIndex) => (
                  <div 
                    key={`row-${rowIndex}`}
                    className="flex gap-3 sm:gap-4 lg:gap-5" 
                    style={{ 
                      marginLeft: `${rowIndex * (rowCount === 3 ? 4 : 6)}rem` 
                    }}
                  >
                    {shuffledRooms
                      .filter((_, index) => index % rowCount === rowIndex)
                      .map((room, index) => (
                        <div 
                          className="flex-shrink-0 w-80" 
                          key={`${room.name}-row${rowIndex}-${index}`}
                        >
                          <RoomTile 
                            room={room}
                            onClick={handleRoomClick}
                          />
                        </div>
                      ))}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">🏠</div>
            <p className="text-lg">ルームデータがまだありません</p>
            <p className="text-sm mt-2">JSONでルームデータを追加してください</p>
          </div>
        )}
      </div>
    </section>

    <RoomModal 
      room={selectedRoom}
      isOpen={isModalOpen}
      onClose={handleCloseModal}
    />
    </>
  );
}
