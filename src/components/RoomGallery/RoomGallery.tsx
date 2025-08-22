import { useState } from 'react';
import type { Room } from '../../types/room.types';
import { RoomTile } from '../RoomTile/RoomTile';
import { RoomModal } from '../RoomModal/RoomModal';

interface RoomGalleryProps {
  rooms: Room[];
}

export function RoomGallery({ rooms }: RoomGalleryProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">
          <span className="border-b-2 border-gray-900 pb-1">▍ROOMS</span>
        </h2>
        
        {rooms.length > 0 ? (
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex flex-col gap-6" style={{ width: 'max-content' }}>
              {/* 上段 - 偶数インデックス */}
              <div className="flex gap-6">
                {rooms.filter((_, index) => index % 2 === 0).map((room, index) => (
                  <div className="flex-shrink-0 w-80" key={`${room.name}-top-${index}`}>
                    <RoomTile 
                      room={room}
                      onClick={handleRoomClick}
                    />
                  </div>
                ))}
              </div>
              {/* 下段 - 奇数インデックス（少し右にズラす） */}
              <div className="flex gap-6" style={{ marginLeft: '10rem' }}>
                {rooms.filter((_, index) => index % 2 === 1).map((room, index) => (
                  <div className="flex-shrink-0 w-80" key={`${room.name}-bottom-${index}`}>
                    <RoomTile 
                      room={room}
                      onClick={handleRoomClick}
                    />
                  </div>
                ))}
              </div>
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