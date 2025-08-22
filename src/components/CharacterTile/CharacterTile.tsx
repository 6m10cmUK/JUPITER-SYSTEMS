import type { Character } from '../../types/character.types';

interface CharacterTileProps {
  character: Character;
  onClick: (character: Character) => void;
}

export function CharacterTile({ character, onClick }: CharacterTileProps) {
  return (
    <div 
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer group"
      onClick={() => onClick(character)}
    >
      <div className="aspect-square relative overflow-hidden rounded-lg bg-gray-100">
        <img 
          src={character.iconImage} 
          alt={character.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-semibold text-white mb-1">{character.name}</h3>
          <div className="flex flex-wrap gap-1">
            {character.tags.map((tag, index) => (
              <span 
                key={index}
                className="inline-block px-2 py-0.5 text-xs bg-white/90 text-gray-700 rounded-full backdrop-blur-sm"
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