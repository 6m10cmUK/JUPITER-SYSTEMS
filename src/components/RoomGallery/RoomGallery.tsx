import { useState, useMemo, useEffect, useRef } from 'react';
import type { Room } from '../../types/room.types';
import { RoomTile } from '../RoomTile/RoomTile';
import { RoomModal } from '../RoomModal/RoomModal';

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

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || rooms.length === 0) return;

    // レイアウト変更時のタイミング調整
    setTimeout(() => {
      const oneSetWidth = scrollContainer.scrollWidth / 3;
      scrollContainer.scrollLeft = oneSetWidth;
    }, 100);

    // 無限ループ処理のチェック
    const checkInfiniteLoop = () => {
      const oneSetWidth = scrollContainer.scrollWidth / 3;
      
      if (scrollContainer.scrollLeft >= oneSetWidth * 2.5) {
        scrollContainer.scrollLeft = scrollContainer.scrollLeft - oneSetWidth;
      } else if (scrollContainer.scrollLeft <= oneSetWidth * 0.5) {
        scrollContainer.scrollLeft = scrollContainer.scrollLeft + oneSetWidth;
      }
    };

    // マウスホイールでの手動スクロール
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const scrollAmount = e.deltaY * 0.5 + e.deltaX * 0.5;
      scrollContainer.scrollLeft += scrollAmount;
      checkInfiniteLoop();
    };

    // タッチデバイス用のスクロール処理
    let startX = 0;
    let scrollLeft = 0;
    let isDown = false;

    const handleTouchStart = (e: TouchEvent) => {
      isDown = true;
      startX = e.touches[0].pageX - scrollContainer.offsetLeft;
      scrollLeft = scrollContainer.scrollLeft;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.touches[0].pageX - scrollContainer.offsetLeft;
      const walk = (x - startX) * 1.5;
      scrollContainer.scrollLeft = scrollLeft - walk;
      checkInfiniteLoop();
    };

    const handleTouchEnd = () => {
      isDown = false;
    };

    // スクロール終了時のチェック
    const handleScroll = () => {
      checkInfiniteLoop();
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    scrollContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    scrollContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollContainer.addEventListener('touchend', handleTouchEnd);
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('wheel', handleWheel);
      scrollContainer.removeEventListener('touchstart', handleTouchStart);
      scrollContainer.removeEventListener('touchmove', handleTouchMove);
      scrollContainer.removeEventListener('touchend', handleTouchEnd);
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [rooms, rowCount]);

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
            className="overflow-x-auto md:overflow-x-hidden touch-pan-x" 
            ref={scrollRef}
            style={{ WebkitOverflowScrolling: 'touch' }}>
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