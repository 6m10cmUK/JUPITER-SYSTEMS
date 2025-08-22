import type { Room } from '../../types/room.types';

interface RoomTileProps {
  room: Room;
  onClick: (room: Room) => void;
}

export function RoomTile({ room, onClick }: RoomTileProps) {
  return (
    <div 
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all group cursor-pointer"
      onClick={() => onClick(room)}
    >
      <div className="aspect-[2/1] relative overflow-hidden rounded-lg bg-gray-100">
        <img 
          src={room.image} 
          alt={room.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 will-change-transform"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-semibold text-white text-lg mb-2">{room.name}</h3>
          <div className="flex flex-wrap gap-1">
            {room.tags.map((tag, index) => (
              <span 
                key={index}
                className="inline-block px-2 py-1 text-xs bg-white/90 text-gray-700 rounded-full backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}