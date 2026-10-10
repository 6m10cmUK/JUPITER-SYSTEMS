import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { CharacterData, Theme } from '../lib/characterDisplay';
import { CANVAS_HEIGHT, CANVAS_WIDTH, drawCharacterSheet } from '../lib/drawCharacterSheet';

interface CharacterCanvasProps {
  characterData: CharacterData;
  theme: Theme;
}

const CharacterCanvas = forwardRef<HTMLCanvasElement, CharacterCanvasProps>(
  ({ characterData, theme }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(ref, () => canvasRef.current!);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // キャラクター画像がある場合は、画像を先に描画してから他の要素を描画
      if (characterData.baseImage) {
        const img = new Image();
        img.onload = () => drawCharacterSheet(ctx, characterData, theme, img);
        img.src = characterData.baseImage.url;
      } else {
        drawCharacterSheet(ctx, characterData, theme, null);
      }

    }, [characterData, theme]);

    return (
      <div style={{ width: '100%' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ 
            width: '100%', 
            height: 'auto', 
            border: '2px solid #333333',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        />
      </div>
    );
  }
);

CharacterCanvas.displayName = 'CharacterCanvas';

export default CharacterCanvas;