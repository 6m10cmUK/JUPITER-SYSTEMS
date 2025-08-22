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
  const [isStatsOpen, setIsStatsOpen] = useState(true);

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
      {/* システム選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          TRPGシステム
        </label>
        <select
          value={characterData.system || ''}
          onChange={(e) => {
            const system = e.target.value;
            let newStats: Array<{key: string, value?: number}> = [];
            
            if (system === 'coc' || system === 'coc7') {
              newStats = [
                { key: 'STR' }, { key: 'CON' }, { key: 'POW' },
                { key: 'DEX' }, { key: 'APP' }, { key: 'SIZ' },
                { key: 'INT' }, { key: 'EDU' }, { key: 'HP' },
                { key: 'MP' }, { key: 'SAN' }, { key: '幸運' }
              ];
            } else if (system === 'dnd') {
              newStats = [
                { key: 'STR' }, { key: 'DEX' }, { key: 'CON' },
                { key: 'INT' }, { key: 'WIS' }, { key: 'CHA' },
                { key: 'HP' }, { key: 'AC' }
              ];
            } else if (system === 'other') {
              newStats = [];
            }
            
            onDataChange({
              ...characterData,
              system: system,
              stats: newStats
            });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-jupiter-primary focus:border-transparent"
        >
          <option value="">選択してください</option>
          <option value="coc">クトゥルフ神話TRPG（6版）</option>
          <option value="coc7">新クトゥルフ神話TRPG（7版）</option>
          <option value="dnd">D&D</option>
          <option value="other">その他</option>
        </select>
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

      {/* TRPG情報セクション */}
      <div className="border-t pt-6 mt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">セッション情報</h3>
        
        {/* ステータス */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              ステータス
            </label>
            <button
              onClick={() => setIsStatsOpen(!isStatsOpen)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                className={`transform transition-transform ${isStatsOpen ? 'rotate-180' : ''}`}
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {isStatsOpen && (
          <div className="grid grid-cols-3 gap-x-4 gap-y-3">
            {(characterData.stats || []).map((stat, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={stat.key}
                  onChange={(e) => {
                    const newStats = [...(characterData.stats || [])];
                    newStats[index] = { ...newStats[index], key: e.target.value };
                    onDataChange({ ...characterData, stats: newStats });
                  }}
                  className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-jupiter-primary"
                  placeholder="名前"
                />
                <span className="text-sm text-gray-500">:</span>
                <input
                  type="number"
                  value={stat.value || ''}
                  onChange={(e) => {
                    const newStats = [...(characterData.stats || [])];
                    newStats[index] = { 
                      ...newStats[index], 
                      value: e.target.value ? parseInt(e.target.value) : undefined 
                    };
                    onDataChange({ ...characterData, stats: newStats });
                  }}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-jupiter-primary"
                  placeholder="値"
                  min="0"
                  max="999"
                />
                <button
                  onClick={() => {
                    const newStats = characterData.stats?.filter((_, i) => i !== index) || [];
                    onDataChange({ ...characterData, stats: newStats });
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6L18 18M6 18L18 6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          )}
          
          {isStatsOpen && (
          <button
            onClick={() => {
              const newStats = [...(characterData.stats || []), { key: '', value: undefined }];
              onDataChange({ ...characterData, stats: newStats });
            }}
            className="mt-4 text-sm text-blue-500 hover:text-blue-600 transition-colors"
          >
            + ステータスを追加
          </button>
          )}
        </div>
        
        {/* 日付 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            セッション日付
          </label>
          <input
            type="date"
            value={characterData.date || ''}
            onChange={(e) => onDataChange({
              ...characterData,
              date: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-jupiter-primary focus:border-transparent"
          />
        </div>

        {/* KP名 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            キーパー名
          </label>
          <input
            type="text"
            value={characterData.keeperName || ''}
            onChange={(e) => onDataChange({
              ...characterData,
              keeperName: e.target.value
            })}
            placeholder="KPの名前を入力"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-jupiter-primary focus:border-transparent"
          />
        </div>

        {/* 同卓者 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            同卓者
          </label>
          <textarea
            value={characterData.players?.join('\n') || ''}
            onChange={(e) => {
              const players = e.target.value.split('\n').filter(p => p.trim());
              onDataChange({
                ...characterData,
                players: players.length > 0 ? players : undefined
              });
            }}
            placeholder="同卓者の名前を改行区切りで入力"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-jupiter-primary focus:border-transparent resize-none"
          />
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