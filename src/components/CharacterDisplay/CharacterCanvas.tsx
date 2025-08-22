import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { CharacterData, Theme } from '../../types/characterDisplay';

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

          // 画質設定を最高に
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

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
        case 'gradient': {
          const borderGradient = ctx.createLinearGradient(0, 0, canvasWidth, 0);
          borderGradient.addColorStop(0, theme.primaryColor);
          borderGradient.addColorStop(0.5, theme.secondaryColor);
          borderGradient.addColorStop(1, theme.primaryColor);
          ctx.strokeStyle = borderGradient;
          ctx.lineWidth = 8;
          ctx.strokeRect(20, 20, canvasWidth - 40, canvasHeight - 40);
          break;
        }
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
        const nameStyle = theme.textStyles.characterName;
        const furiganaStyle = theme.textStyles.characterNameFurigana;
        const namePosition = theme.layout.characterName;
        
        // 位置を計算（パーセンテージまたは絶対値）
        const x = typeof namePosition.x === 'string' && namePosition.x.endsWith('%') 
          ? canvasWidth * (parseFloat(namePosition.x) / 100)
          : Number(namePosition.x);
        const y = typeof namePosition.y === 'string' && namePosition.y.endsWith('%')
          ? canvasHeight * (parseFloat(namePosition.y) / 100)
          : Number(namePosition.y);
        
        ctx.save(); // 現在の状態を保存
        
        // 回転の適用
        if (namePosition.rotation) {
          ctx.translate(x, y);
          ctx.rotate((namePosition.rotation * Math.PI) / 180);
          ctx.translate(-x, -y);
        }
        
        // 文字の拡大縮小を適用
        const scaleX = nameStyle.scaleX || 1.0;
        const scaleY = nameStyle.scaleY || 1.0;
        
        ctx.font = `${nameStyle.fontWeight || ''} ${nameStyle.fontSize}px ${nameStyle.fontFamily}`;
        
        // ふりがなを先に描画（背景より前、本文より前）
        if (characterData.characterNameFurigana && furiganaStyle) {
          ctx.save();
          
          // ふりがなのフォント設定
          ctx.font = `${furiganaStyle.fontWeight || 'normal'} ${furiganaStyle.fontSize}px ${furiganaStyle.fontFamily}`;
          ctx.fillStyle = furiganaStyle.color;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          
          // ふりがなの位置（本文の上）
          const furiganaY = y - 5; // 本文の少し上
          
          if (namePosition.writingMode === 'vertical') {
            // 縦書きの場合、ふりがなも縦書き
            const furiganaChars = characterData.characterNameFurigana.split('');
            const furiganaLetterSpacing = furiganaStyle.letterSpacing || 0;
            
            furiganaChars.forEach((char, index) => {
              const charY = furiganaY + index * (furiganaStyle.fontSize * 1.2 + furiganaLetterSpacing);
              ctx.fillText(char, x + nameStyle.fontSize * scaleX + 10, charY);
            });
          } else {
            // 横書きの場合
            if (furiganaStyle.letterSpacing && furiganaStyle.letterSpacing !== 0) {
              // 文字間隔がある場合
              const letterSpacing = furiganaStyle.letterSpacing;
              const furiganaChars = characterData.characterNameFurigana.split('');
              let currentX = x;
              
              furiganaChars.forEach(char => {
                ctx.fillText(char, currentX, furiganaY);
                currentX += ctx.measureText(char).width + letterSpacing;
              });
            } else {
              // 通常の描画
              ctx.fillText(characterData.characterNameFurigana, x, furiganaY);
            }
          }
          
          ctx.restore();
        }
        
        // 縦書きの場合
        if (namePosition.writingMode === 'vertical') {
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          
          // 背景描画（縦書き用）
          if (nameStyle.backgroundColor) {
            ctx.fillStyle = nameStyle.backgroundColor;
            const letterSpacing = nameStyle.letterSpacing || 0;
            const charHeight = nameStyle.fontSize * scaleY * 1.2 + letterSpacing;
            const totalHeight = charHeight * characterData.characterName.length;
            ctx.fillRect(
              x - 10,
              y - 10,
              nameStyle.fontSize * scaleX + 20,
              totalHeight + 20
            );
          }
          
          // 縦書きテキスト描画
          ctx.fillStyle = nameStyle.color;
          const chars = characterData.characterName.split('');
          const letterSpacing = nameStyle.letterSpacing || 0;
          
          chars.forEach((char, index) => {
            const charY = y + index * (nameStyle.fontSize * 1.2 + letterSpacing);
            ctx.save();
            ctx.translate(x, charY);
            ctx.scale(scaleX, scaleY);
            ctx.fillText(char, 0, 0);
            ctx.restore();
          });
        } else {
          // 横書き
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          
          // 文字間隔がある場合は文字ごとに描画
          if (nameStyle.letterSpacing && nameStyle.letterSpacing !== 0) {
            const letterSpacing = nameStyle.letterSpacing;
            // 背景描画（文字間隔考慮）
            if (nameStyle.backgroundColor) {
              const chars = characterData.characterName.split('');
              let totalWidth = 0;
              chars.forEach(char => {
                totalWidth += ctx.measureText(char).width * scaleX + letterSpacing;
              });
              totalWidth -= letterSpacing; // 最後の文字間隔を除く
              
              ctx.fillStyle = nameStyle.backgroundColor;
              ctx.fillRect(
                x - 20,
                y - 10,
                totalWidth + 40,
                nameStyle.fontSize * scaleY + 20
              );
            }
            
            // 文字ごとに描画
            ctx.fillStyle = nameStyle.color;
            const chars = characterData.characterName.split('');
            let currentX = x;
            
            chars.forEach(char => {
              ctx.save();
              ctx.translate(currentX, y);
              ctx.scale(scaleX, scaleY);
              ctx.fillText(char, 0, 0);
              ctx.restore();
              currentX += ctx.measureText(char).width * scaleX + letterSpacing;
            });
          } else {
            // 通常の描画（文字間隔なし）
            const textWidth = ctx.measureText(characterData.characterName).width * scaleX;
            if (nameStyle.backgroundColor) {
              ctx.fillStyle = nameStyle.backgroundColor;
              ctx.fillRect(
                x - 20,
                y - 10,
                textWidth + 40,
                nameStyle.fontSize * scaleY + 20
              );
            }
            
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scaleX, scaleY);
            
            // ストロークがある場合は先に描画
            if (nameStyle.strokeWidth && nameStyle.strokeWidth > 0) {
              ctx.strokeStyle = nameStyle.strokeColor || nameStyle.color;
              ctx.lineWidth = nameStyle.strokeWidth;
              ctx.lineJoin = 'round';
              ctx.strokeText(characterData.characterName, 0, 0);
            }
            
            // テキストを描画
            ctx.fillStyle = nameStyle.color;
            ctx.fillText(characterData.characterName, 0, 0);
            ctx.restore();
          }
        }
        
        ctx.restore(); // 状態を復元
      }

      // シナリオ名
      if (characterData.scenarioName) {
        const scenarioStyle = theme.textStyles.scenarioName;
        const scenarioPosition = theme.layout.scenarioName;
        
        // 位置を計算（パーセンテージまたは絶対値）
        const x = typeof scenarioPosition.x === 'string' && scenarioPosition.x.endsWith('%')
          ? canvasWidth * (parseFloat(scenarioPosition.x) / 100)
          : Number(scenarioPosition.x);
        const y = typeof scenarioPosition.y === 'string' && scenarioPosition.y.endsWith('%')
          ? canvasHeight * (parseFloat(scenarioPosition.y) / 100)
          : Number(scenarioPosition.y);
        
        ctx.save(); // 現在の状態を保存
        
        // 回転の適用
        if (scenarioPosition.rotation) {
          ctx.translate(x, y);
          ctx.rotate((scenarioPosition.rotation * Math.PI) / 180);
          ctx.translate(-x, -y);
        }
        
        ctx.font = `${scenarioStyle.fontWeight || ''} ${scenarioStyle.fontSize}px ${scenarioStyle.fontFamily}`;
        
        // 縦書きの場合
        if (scenarioPosition.writingMode === 'vertical') {
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillStyle = scenarioStyle.color;
          
          const letterSpacing = scenarioStyle.letterSpacing || 0;
          const scaleX = scenarioStyle.scaleX || 1.0;
          const scaleY = scenarioStyle.scaleY || 1.0;
          
          const chars = characterData.scenarioName.split('');
          chars.forEach((char, index) => {
            const charY = y + index * (scenarioStyle.fontSize * 1.2 + letterSpacing);
            ctx.save();
            ctx.translate(x, charY);
            ctx.scale(scaleX, scaleY);
            ctx.fillText(char, 0, 0);
            ctx.restore();
          });
        } else {
          // 横書き
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillStyle = scenarioStyle.color;
          
          const scaleX = scenarioStyle.scaleX || 1.0;
          const scaleY = scenarioStyle.scaleY || 1.0;
          const letterSpacing = scenarioStyle.letterSpacing || 0;
          
          if (letterSpacing && letterSpacing !== 0) {
            // 文字間隔がある場合は文字ごとに描画
            const chars = characterData.scenarioName.split('');
            let currentX = x;
            
            chars.forEach(char => {
              ctx.save();
              ctx.translate(currentX, y);
              ctx.scale(scaleX, scaleY);
              ctx.fillText(char, 0, 0);
              ctx.restore();
              currentX += ctx.measureText(char).width * scaleX + letterSpacing;
            });
          } else {
            // 通常の描画
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scaleX, scaleY);
            ctx.fillText(characterData.scenarioName, 0, 0);
            ctx.restore();
          }
        }
        
        ctx.restore(); // 状態を復元
      }

    };

    const drawExpressions = (ctx: CanvasRenderingContext2D) => {
      const expressionEntries = Object.entries(characterData.expressions);
      if (expressionEntries.length === 0) return;

      // 表情サムネイルを2列固定で下寄せ配置
      const thumbnailSize = 130;
      const gap = 25;
      const cols = 2;  // 2列固定
      const maxRows = 3;  // 最大3行（6個まで表示）
      
      // 画面左寄りに2列を配置するために開始位置を計算
      const leftMargin = 30;  // 左端からの余白を減らしてもっと左へ
      const startX = leftMargin;
      
      // 必要な行数を計算
      const actualRows = Math.min(Math.ceil(expressionEntries.length / cols), maxRows);
      const rowHeight = thumbnailSize + gap;
      
      // 下寄せのための開始Y座標を計算（画面下部から必要な行数分のスペースを確保）
      const bottomMargin = 50;  // 画面下部からの余白を減らして下に移動
      const startY = canvasHeight - bottomMargin - (actualRows * rowHeight) + gap;
      
      expressionEntries.forEach(([, expression], index) => {
        if (index >= cols * maxRows) return;  // 最大6個まで
        
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        // 通常の上から下への配置（ただし全体は下寄せ）
        const x = startX + col * (thumbnailSize + gap);
        const y = startY + row * rowHeight;

        const img = new Image();
        img.onload = () => {
          // 画質設定を最高に
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // 白い枠を描画
          ctx.fillStyle = 'white';
          ctx.fillRect(x - 2, y - 2, thumbnailSize + 4, thumbnailSize + 4);
          
          // 表情画像を描画（元画像のサイズを考慮）
          ctx.drawImage(img, x, y, thumbnailSize, thumbnailSize);
          
          // 枠線を描画
          ctx.strokeStyle = theme.textStyles.characterName.color;  // テキストと同じ色を使用
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