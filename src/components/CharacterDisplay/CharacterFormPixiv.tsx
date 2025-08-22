import React, { useState } from 'react';
import ImageUploadModal from './ImageUploadModal';  // react-easy-crop版（表情差分用）
import ImageUploadModalReactCrop from './ImageUploadModalReactCrop';  // ReactCrop版（キャラクター画像用）
import ExpressionGrid from './ExpressionGrid';
import type { CharacterData, CharacterImage } from '../../types/characterDisplay.tsx';

interface CharacterFormPixivProps {
  characterData: CharacterData;
  onDataChange: (data: CharacterData) => void;
}

const CharacterFormPixiv: React.FC<CharacterFormPixivProps> = ({
  characterData,
  onDataChange
}) => {
  const [showBaseImageModal, setShowBaseImageModal] = useState(false);
  const [showExpressionModal, setShowExpressionModal] = useState(false);
  const [lastExpressionCrop, setLastExpressionCrop] = useState<{ x: number; y: number; zoom: number } | null>(null);
  
  const handleBaseImageUpload = (image: CharacterImage) => {
    onDataChange({
      ...characterData,
      baseImage: image
    });
  };

  const handleExpressionUpload = (image: CharacterImage) => {
    // クロップ情報は別途保存する（ImageUploadModal側で処理）
    
    onDataChange({
      ...characterData,
      expressions: [...characterData.expressions, image]
    });
    setShowExpressionModal(false);
  };

  const handleRemoveExpression = (index: number) => {
    const newExpressions = [...characterData.expressions];
    newExpressions.splice(index, 1);
    onDataChange({
      ...characterData,
      expressions: newExpressions
    });
  };

  const handleAddExpression = () => {
    setShowExpressionModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* キャラクター画像 */}
      <div>
        <label style={{ 
          display: 'block', 
          fontSize: '12px', 
          fontWeight: '600', 
          color: '#70757e', 
          marginBottom: '8px' 
        }}>
          キャラクター画像
        </label>
        
        {!characterData.baseImage ? (
          <button
            onClick={() => setShowBaseImageModal(true)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'white',
              border: '2px dashed #d2d5da',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: '#70757e',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0096fa';
              e.currentTarget.style.color = '#0096fa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#d2d5da';
              e.currentTarget.style.color = '#70757e';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            画像を追加
          </button>
        ) : (
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            background: '#f7f8f9',
            borderRadius: '8px',
            border: '1px solid #e8eaed'
          }}>
            <img
              src={characterData.baseImage.url}
              alt="キャラクター画像"
              style={{
                width: '80px',
                height: '120px',
                objectFit: 'cover',
                objectPosition: 'top',
                borderRadius: '6px',
                border: '1px solid #e8eaed'
              }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ 
                margin: '0 0 4px', 
                fontSize: '12px', 
                color: '#70757e' 
              }}>
                画像がアップロードされています
              </p>
              <p style={{ 
                margin: 0, 
                fontSize: '11px', 
                color: '#9499a0' 
              }}>
                画像をクリックしてプレビュー
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowBaseImageModal(true)}
                style={{
                  padding: '6px 12px',
                  background: 'white',
                  border: '1px solid #d2d5da',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#0096fa',
                  fontWeight: '500'
                }}
              >
                変更
              </button>
              <button
                onClick={() => handleBaseImageUpload(null as any)}
                style={{
                  padding: '6px 12px',
                  background: 'white',
                  border: '1px solid #ffdddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#ff4444',
                  fontWeight: '500'
                }}
              >
                削除
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 表情差分 */}
      <ExpressionGrid
        expressions={characterData.expressions}
        onRemove={handleRemoveExpression}
        onAdd={handleAddExpression}
      />

      {/* キャラクター名 */}
      <div>
        <label style={{ 
          display: 'block', 
          fontSize: '12px', 
          fontWeight: '600', 
          color: '#70757e', 
          marginBottom: '8px' 
        }}>
          キャラクター名
        </label>
        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
          <input
            type="text"
            value={characterData.characterName}
            onChange={(e) => onDataChange({ ...characterData, characterName: e.target.value })}
            style={{
              width: '200px',
              padding: '8px 12px',
              border: '1px solid #d2d5da',
              borderRadius: '8px',
              fontSize: '14px',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            placeholder="キャラクターの名前"
          />
          <input
            type="text"
            value={characterData.characterNameFurigana || ''}
            onChange={(e) => onDataChange({ ...characterData, characterNameFurigana: e.target.value })}
            style={{
              width: '200px',
              padding: '8px 12px',
              border: '1px solid #d2d5da',
              borderRadius: '8px',
              fontSize: '12px',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            placeholder="ふりがな（オプション）"
          />
        </div>
      </div>

      {/* シナリオ名 */}
      <div>
        <label style={{ 
          display: 'block', 
          fontSize: '12px', 
          fontWeight: '600', 
          color: '#70757e', 
          marginBottom: '8px' 
        }}>
          シナリオ名
        </label>
        <input
          type="text"
          value={characterData.scenarioName}
          onChange={(e) => onDataChange({ ...characterData, scenarioName: e.target.value })}
          style={{
            width: '200px',
            padding: '8px 12px',
            border: '1px solid #d2d5da',
            borderRadius: '8px',
            fontSize: '14px',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          placeholder="シナリオの名前"
        />
      </div>

      {/* モーダル */}
      <ImageUploadModalReactCrop
        isOpen={showBaseImageModal}
        onClose={() => setShowBaseImageModal(false)}
        onImageUpload={(image) => {
          handleBaseImageUpload(image);
          setShowBaseImageModal(false);
        }}
        title="キャラクター画像を追加"
      />
      
      <ImageUploadModal
        isOpen={showExpressionModal}
        onClose={() => setShowExpressionModal(false)}
        onImageUpload={handleExpressionUpload}
        title="表情差分を追加"
        cropAspect={1}  // 1:1固定
        initialCrop={lastExpressionCrop}  // 前回の座標を渡す
        onCropChange={(crop) => setLastExpressionCrop(crop)}  // クロップ情報を保存
      />
    </div>
  );
};

export default CharacterFormPixiv;