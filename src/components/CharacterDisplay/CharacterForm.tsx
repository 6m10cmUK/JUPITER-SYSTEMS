import React, { useState } from 'react';
import type { CharacterData, CharacterImage } from '../../types/characterDisplay';
import ImageUploadModal from './ImageUploadModal';
import ExpressionGrid from './ExpressionGrid';

interface CharacterFormProps {
  characterData: CharacterData;
  onDataChange: (data: CharacterData) => void;
}

const CharacterForm: React.FC<CharacterFormProps> = ({
  characterData,
  onDataChange
}) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalMode, setModalMode] = useState<'base' | 'expression'>('base');
  const [editingExpressionKey, setEditingExpressionKey] = useState<string>('');
  const [lastExpressionCrop, setLastExpressionCrop] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const handleImageUpload = (imageData: CharacterImage) => {
    if (modalMode === 'base') {
      onDataChange({
        ...characterData,
        baseImage: imageData
      });
    } else {
      const newExpressions = { ...characterData.expressions };
      const key = editingExpressionKey || `exp_${Date.now()}`;
      newExpressions[key] = imageData;
      onDataChange({
        ...characterData,
        expressions: newExpressions
      });
    }
    setShowImageModal(false);
  };

  const handleRemoveExpression = (key: string) => {
    const newExpressions = { ...characterData.expressions };
    delete newExpressions[key];
    onDataChange({
      ...characterData,
      expressions: newExpressions
    });
  };

  const handleAddExpression = () => {
    setModalMode('expression');
    setEditingExpressionKey('');
    setShowImageModal(true);
  };

  return (
    <div className="space-y-6">
      {/* キャラクター名 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          キャラクター名
        </label>
        <input
          type="text"
          value={characterData.characterName}
          onChange={(e) => onDataChange({
            ...characterData,
            characterName: e.target.value
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-jupiter-primary focus:border-transparent"
        />
      </div>

      {/* ふりがな */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ふりがな（オプション）
        </label>
        <input
          type="text"
          value={characterData.characterNameFurigana || ''}
          onChange={(e) => onDataChange({
            ...characterData,
            characterNameFurigana: e.target.value
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-jupiter-primary focus:border-transparent"
        />
      </div>

      {/* シナリオ名 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          シナリオ名
        </label>
        <input
          type="text"
          value={characterData.scenarioName}
          onChange={(e) => onDataChange({
            ...characterData,
            scenarioName: e.target.value
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-jupiter-primary focus:border-transparent"
        />
      </div>

      {/* ベース画像 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          キャラクター画像
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-jupiter-primary transition-colors">
          {characterData.baseImage ? (
            <div className="relative">
              <img
                src={characterData.baseImage.url}
                alt="Character"
                className="max-w-full h-48 mx-auto object-contain rounded"
              />
              <button
                onClick={() => {
                  setModalMode('base');
                  setShowImageModal(true);
                }}
                className="mt-3 text-sm text-jupiter-primary hover:text-jupiter-secondary"
              >
                画像を変更
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setModalMode('base');
                setShowImageModal(true);
              }}
              className="px-6 py-3 border-2 border-blue-500 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all font-semibold"
            >
              画像を選択
            </button>
          )}
        </div>
      </div>

      {/* 表情差分 */}
      <div>
        <ExpressionGrid
          expressions={characterData.expressions}
          onRemove={handleRemoveExpression}
          onAdd={handleAddExpression}
        />
      </div>

      {/* 画像アップロードモーダル */}
      {showImageModal && (
        <ImageUploadModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          onImageUpload={handleImageUpload}
          initialImage={modalMode === 'base' ? characterData.baseImage : null}
          mode={modalMode}
          lastExpressionCrop={modalMode === 'expression' ? lastExpressionCrop : null}
          onCropPositionSave={(position) => {
            if (modalMode === 'expression') {
              setLastExpressionCrop(position);
            }
          }}
        />
      )}
    </div>
  );
};

export default CharacterForm;