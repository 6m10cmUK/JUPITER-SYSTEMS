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
      <div className="aspect-square relative overflow-hidden rounded-t-lg bg-gray-100">
        <img 
          src={character.iconImage} 
          alt={character.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2">{character.name}</h3>
        <div className="flex flex-wrap gap-1">
          {character.tags.map((tag, index) => (
            <span 
              key={index}
              className="inline-block px-2 py-1 text-xs bg-jupiter-100 text-jupiter-700 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}