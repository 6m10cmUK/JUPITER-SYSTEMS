import React from 'react';
import ImageUploader from './ImageUploader';
import type { CharacterData, CharacterImage } from '../../types/characterDisplay.tsx';

interface CharacterFormProps {
  characterData: CharacterData;
  onDataChange: (data: CharacterData) => void;
}

const CharacterForm: React.FC<CharacterFormProps> = ({
  characterData,
  onDataChange
}) => {
  const handleBaseImageUpload = (image: CharacterImage) => {
    onDataChange({
      ...characterData,
      baseImage: image
    });
  };

  const handleExpressionUpload = (expression: string, image: CharacterImage) => {
    onDataChange({
      ...characterData,
      expressions: {
        ...characterData.expressions,
        [expression]: image
      }
    });
  };

  const handleAddExpression = () => {
    const expressionName = prompt('表情名を入力してください（例：笑顔、怒り、悲しみ）');
    if (expressionName && !characterData.expressions[expressionName]) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          handleExpressionUpload(expressionName, { file, url });
        }
      };
      input.click();
    }
  };

  const handleRemoveExpression = (expression: string) => {
    const newExpressions = { ...characterData.expressions };
    delete newExpressions[expression];
    onDataChange({
      ...characterData,
      expressions: newExpressions,
      currentExpression: expression === characterData.currentExpression ? '' : characterData.currentExpression
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
        キャラクター設定
      </h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            キャラクター名
          </label>
          <input
            type="text"
            value={characterData.characterName}
            onChange={(e) => onDataChange({ ...characterData, characterName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="キャラクターの名前"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            シナリオ名
          </label>
          <input
            type="text"
            value={characterData.scenarioName}
            onChange={(e) => onDataChange({ ...characterData, scenarioName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="シナリオの名前"
          />
        </div>

        <div>
          <ImageUploader
            label="基本立ち絵"
            onImageUpload={handleBaseImageUpload}
            currentImage={characterData.baseImage}
            recommendedSize={{ width: 800, height: 1200 }}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              表情差分
            </h3>
            <button
              onClick={handleAddExpression}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              表情を追加
            </button>
          </div>
          
          <div className="space-y-4">
            {Object.entries(characterData.expressions).map(([expression, image]) => (
              <div key={expression} className="flex items-center gap-4 p-3 border rounded-lg">
                <img
                  src={image.url}
                  alt={expression}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="font-medium">{expression}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onDataChange({ ...characterData, currentExpression: expression })}
                    className={`px-3 py-1 rounded text-sm ${
                      characterData.currentExpression === expression
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {characterData.currentExpression === expression ? '使用中' : '使用'}
                  </button>
                  <button
                    onClick={() => handleRemoveExpression(expression)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterForm;