import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { CharacterData, Theme } from '../../types/characterDisplay.tsx';

interface CharacterCanvasProps {
  characterData: CharacterData;
  theme: Theme;
}

const CharacterCanvas = forwardRef<HTMLCanvasElement, CharacterCanvasProps>(
  ({ characterData, theme }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // A4サイズ縦向き（210mm × 297mm）を96dpiで計算
    const canvasWidth = 794;  // 210mm at 96dpi
    const canvasHeight = 1123; // 297mm at 96dpi

    useImperativeHandle(ref, () => canvasRef.current!);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
        // キャンバスをクリア
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // 背景を描画
        drawBackground(ctx);

        // 枠を描画
        drawBorder(ctx);

        // テキストを描画（手前）
        drawTexts(ctx);

        // 表情差分を描画
        if (Object.keys(characterData.expressions).length > 0) {
          drawExpressions(ctx);
        }
      };

      // キャラクター画像がある場合は、画像を先に描画してから他の要素を描画
      if (characterData.baseImage) {
        const img = new Image();
        img.onload = () => {
          // キャンバスをクリア
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);

          // 背景を描画
          drawBackground(ctx);

          // 枠を描画
          drawBorder(ctx);

          // キャラクター画像を描画（後ろ）
          drawCharacterImageSync(ctx, img);

          // テキストを描画（手前）
          drawTexts(ctx);

          // 表情差分を描画
          if (Object.keys(characterData.expressions).length > 0) {
            drawExpressions(ctx);
          }
        };
        img.src = characterData.baseImage.url;
      } else {
        draw();
      }

    }, [characterData, theme]);

    const drawBackground = (ctx: CanvasRenderingContext2D) => {
      // グラデーション背景
      const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
      gradient.addColorStop(0, theme.backgroundColor);
      gradient.addColorStop(1, theme.secondaryColor || theme.backgroundColor);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    };

    const drawBorder = (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = theme.primaryColor;
      ctx.lineWidth = 4;

      switch (theme.borderStyle) {
        case 'solid':
          ctx.strokeRect(20, 20, canvasWidth - 40, canvasHeight - 40);
          break;
        case 'ornate':
          // 装飾的な枠
          ctx.lineWidth = 6;
          ctx.strokeRect(30, 30, canvasWidth - 60, canvasHeight - 60);
          ctx.lineWidth = 2;
          ctx.strokeRect(40, 40, canvasWidth - 80, canvasHeight - 80);
          break;
        case 'gradient':
          const borderGradient = ctx.createLinearGradient(0, 0, canvasWidth, 0);
          borderGradient.addColorStop(0, theme.primaryColor);
          borderGradient.addColorStop(0.5, theme.secondaryColor);
          borderGradient.addColorStop(1, theme.primaryColor);
          ctx.strokeStyle = borderGradient;
          ctx.lineWidth = 8;
          ctx.strokeRect(20, 20, canvasWidth - 40, canvasHeight - 40);
          break;
      }
    };

    const drawCharacterImageSync = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
      // キャラクター画像を上部中央に配置
      const maxHeight = canvasHeight * 0.9;
      const maxWidth = canvasWidth * 0.9;
      
      let drawWidth = img.width;
      let drawHeight = img.height;
      
      // アスペクト比を保持しながらリサイズ
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
      drawWidth = img.width * scale;
      drawHeight = img.height * scale;
      
      const x = canvasWidth * 0.65 - drawWidth / 2; // 右から35%の位置を中心に
      const y = 80; // 上部に配置
      
      // 影を追加
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 10;
      ctx.shadowOffsetY = 10;
      
      ctx.drawImage(img, x, y, drawWidth, drawHeight);
      
      // 影をリセット
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    };

    const drawTexts = (ctx: CanvasRenderingContext2D) => {
      // キャラクター名
      if (characterData.characterName) {
        ctx.font = `bold 72px ${theme.fontFamily}`;
        ctx.fillStyle = theme.textColor;
        ctx.textAlign = 'left';
        
        // テキストの背景（半透明）
        const textWidth = ctx.measureText(characterData.characterName).width;
        ctx.fillStyle = `${theme.backgroundColor}E6`;
        ctx.fillRect(
          canvasWidth * 0.1 - 20,
          canvasHeight / 2 - 50,
          textWidth + 40,
          80
        );
        
        // テキスト本体
        ctx.fillStyle = theme.textColor;
        ctx.fillText(characterData.characterName, canvasWidth * 0.1, canvasHeight / 2);
      }

      // シナリオ名
      if (characterData.scenarioName) {
        ctx.font = `24px ${theme.fontFamily}`;
        ctx.fillStyle = theme.textColor;
        ctx.textAlign = 'center';
        ctx.fillText(characterData.scenarioName, canvasWidth / 2, canvasHeight - 80);
      }

    };

    const drawExpressions = (ctx: CanvasRenderingContext2D) => {
      const expressions = Object.values(characterData.expressions);
      if (expressions.length === 0) return;

      // 表情差分セクションのタイトル
      ctx.font = `bold 24px ${theme.fontFamily}`;
      ctx.fillStyle = theme.textColor;
      ctx.textAlign = 'left';
      ctx.fillText('表情差分', 60, canvasHeight * 0.62);

      // 表情サムネイルをグリッド表示
      const thumbnailSize = 100;
      const gap = 20;
      const cols = Math.floor((canvasWidth - 120) / (thumbnailSize + gap));
      const startX = 60;
      const startY = canvasHeight * 0.65;

      expressions.forEach((expression, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = startX + col * (thumbnailSize + gap);
        const y = startY + row * (thumbnailSize + gap);

        const img = new Image();
        img.onload = () => {
          // 白い枠を描画
          ctx.fillStyle = 'white';
          ctx.fillRect(x - 2, y - 2, thumbnailSize + 4, thumbnailSize + 4);
          
          // 表情画像を描画
          ctx.drawImage(img, x, y, thumbnailSize, thumbnailSize);
          
          // 枠線を描画
          ctx.strokeStyle = theme.primaryColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, thumbnailSize, thumbnailSize);
        };
        img.src = expression.url;
      });
    };

    return (
      <div style={{ width: '100%' }}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
        />
      </div>
    );
  }
);

CharacterCanvas.displayName = 'CharacterCanvas';

export default CharacterCanvas;