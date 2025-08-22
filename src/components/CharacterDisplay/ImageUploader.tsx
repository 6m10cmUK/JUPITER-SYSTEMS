import React, { useState, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import type { CharacterImage } from '../../types/characterDisplay.tsx';

interface ImageUploaderProps {
  label: string;
  onImageUpload: (image: CharacterImage) => void;
  currentImage?: CharacterImage | null;
  cropAspect?: number;
  recommendedSize?: { width: number; height: number };
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  onImageUpload,
  currentImage,
  cropAspect,
  recommendedSize
}) => {
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 25,
    y: 25,
    width: 50,
    height: 50
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setTempImageUrl(reader.result as string);
        setSelectedFile(file);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = useCallback(() => {
    if (!completedCrop || !tempImageUrl || !selectedFile) return;

    const image = new Image();
    image.src = tempImageUrl;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = completedCrop.width;
      canvas.height = completedCrop.height;

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      );

      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], selectedFile.name, {
            type: selectedFile.type
          });
          const croppedUrl = URL.createObjectURL(blob);
          
          onImageUpload({
            file: croppedFile,
            url: croppedUrl,
            cropData: {
              x: completedCrop.x,
              y: completedCrop.y,
              width: completedCrop.width,
              height: completedCrop.height
            }
          });
          
          setShowCropper(false);
          setTempImageUrl(null);
        }
      });
    };
  }, [completedCrop, tempImageUrl, selectedFile, onImageUpload]);

  const handleCancelCrop = () => {
    setShowCropper(false);
    setTempImageUrl(null);
    setSelectedFile(null);
  };

  return (
    <div className="image-uploader">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      
      {recommendedSize && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          推奨サイズ: {recommendedSize.width} × {recommendedSize.height}px
        </p>
      )}

      {!showCropper && (
        <>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id={`file-input-${label}`}
          />
          <label
            htmlFor={`file-input-${label}`}
            className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            画像を選択
          </label>
          
          {currentImage && (
            <div className="mt-4">
              <img
                src={currentImage.url}
                alt={label}
                className="max-w-xs rounded-lg shadow-md"
              />
            </div>
          )}
        </>
      )}

      {showCropper && tempImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
            <h3 className="text-lg font-semibold mb-4">画像をクリップ</h3>
            
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={cropAspect}
            >
              <img src={tempImageUrl} alt="Crop preview" />
            </ReactCrop>
            
            <div className="mt-4 flex gap-4">
              <button
                onClick={handleCropComplete}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                クリップを適用
              </button>
              <button
                onClick={handleCancelCrop}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;