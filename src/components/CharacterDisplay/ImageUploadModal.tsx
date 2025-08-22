import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Cropper, type CropperRef } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import type { CharacterImage } from '../../types/characterDisplay';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageUpload: (image: CharacterImage) => void;
  initialImage?: CharacterImage | null;
  mode?: 'base' | 'expression';
  lastExpressionCrop?: {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
  onCropPositionSave?: (position: {
    left: number;
    top: number;
    width: number;
    height: number;
  }) => void;
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onImageUpload,
  initialImage,
  mode = 'base',
  lastExpressionCrop,
  onCropPositionSave
}) => {
  const [imageSrc, setImageSrc] = useState<string>(initialImage?.url || '');
  const [imageFile, setImageFile] = useState<File | null>(initialImage?.file || null);
  const cropperRef = useRef<CropperRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // 画像が読み込まれたらクロップ範囲を設定
  useEffect(() => {
    if (!imageSrc) return;
    
    
    const timer = setTimeout(() => {
      if (cropperRef.current) {
        const cropper = cropperRef.current;
        const state = cropper.getState();
        if (state && state.imageSize && state.imageSize.width > 0) {
          if (mode === 'expression') {
            // 表情差分の場合は記憶した位置か、正方形で中央に配置
            if (lastExpressionCrop) {
              cropper.setCoordinates(lastExpressionCrop);
            } else {
              const size = Math.min(state.imageSize.width, state.imageSize.height);
              const left = (state.imageSize.width - size) / 2;
              const top = (state.imageSize.height - size) / 2;
              cropper.setCoordinates({
                left: left,
                top: top,
                width: size,
                height: size
              });
            }
          } else {
            // ベース画像の場合は画像全体
            cropper.setCoordinates({
              left: 0,
              top: 0,
              width: state.imageSize.width,
              height: state.imageSize.height
            });
          }
        }
      }
    }, 10);
    
    return () => clearTimeout(timer);
  }, [imageSrc, mode, lastExpressionCrop]);

  // モードに応じた設定を取得
  const getCropperSettings = () => {
    if (mode === 'base') {
      return {
        aspectRatio: undefined,
        minWidth: 200,
        minHeight: 200,
        className: "h-[600px] bg-gray-100"
      };
    } else {
      // 表情差分は正方形固定（顔だけだから）
      return {
        aspectRatio: 1,
        minWidth: 100,
        minHeight: 100,
        className: "h-[600px] bg-gray-100"
      };
    }
  };

  const settings = getCropperSettings();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setImageFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const handleCrop = useCallback(() => {
    if (cropperRef.current && imageFile) {
      const cropper = cropperRef.current;
      const canvas = cropper.getCanvas();
      
      if (canvas) {
        // 表情差分モードの場合は位置を記憶
        if (mode === 'expression') {
          const coordinates = cropper.getCoordinates();
          if (coordinates) {
            const cropPosition = {
              left: coordinates.left,
              top: coordinates.top,
              width: coordinates.width,
              height: coordinates.height
            };
            if (onCropPositionSave) {
              onCropPositionSave(cropPosition);
            }
          }
        }
        
        canvas.toBlob((blob) => {
          if (blob) {
            const croppedFile = new File([blob], imageFile.name.replace(/\.[^.]+$/, '.png'), {
              type: 'image/png',
              lastModified: Date.now()
            });
            
            const url = URL.createObjectURL(blob);
            
            // クロップデータも保存（後で再編集できるように）
            const coordinates = cropper.getCoordinates();
            const cropData = coordinates ? {
              x: Math.round(coordinates.left),
              y: Math.round(coordinates.top),
              width: Math.round(coordinates.width),
              height: Math.round(coordinates.height)
            } : undefined;
            
            onImageUpload({
              file: croppedFile,
              url,
              cropData
            });
            onClose();
          }
        }, 'image/png');
      }
    }
  }, [imageFile, onImageUpload, onClose, mode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* モーダル本体 */}
      <div className="relative bg-white rounded-lg shadow-xl w-[900px] h-[750px] mx-4 overflow-hidden">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {mode === 'base' ? 'キャラクター画像' : '表情差分'}のアップロード
          </h3>
        </div>

        {/* コンテンツ */}
        <div className="p-6 h-[calc(100%-73px)]">
          {!imageSrc ? (
            // ファイル選択エリア
            <div 
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer h-full flex flex-col items-center justify-center ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-500'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                {isDragging 
                  ? 'ここにドロップして画像をアップロード' 
                  : 'クリックして画像を選択、またはドラッグ&ドロップ'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            // クロッパーとボタンを横並びに
            <div className="flex gap-3 h-full">
              <div className="flex-1 bg-gray-100 rounded-lg p-4 h-full">
                <Cropper
                  ref={cropperRef}
                  src={imageSrc}
                  className="h-full"
                  aspectRatio={settings.aspectRatio as any}
                  style={{
                    background: '#f3f4f6',
                    height: '100%'
                  }}
                  onReady={() => {
                    if (cropperRef.current) {
                      if (mode === 'expression' && lastExpressionCrop) {
                        cropperRef.current.setCoordinates(lastExpressionCrop);
                      } else if (mode === 'base') {
                        const state = cropperRef.current.getState();
                        if (state && state.imageSize) {
                          cropperRef.current.setCoordinates({
                            left: 0,
                            top: 0,
                            width: state.imageSize.width,
                            height: state.imageSize.height
                          });
                        }
                      }
                    }
                  }}
                />
              </div>
              
              {/* 右側にボタン（上寄せ、狭い幅） */}
              <div className="flex flex-col pt-4 gap-3">
                <button
                  onClick={handleCrop}
                  className="px-6 py-3 border-2 border-blue-500 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all duration-200 font-semibold shadow-lg transform hover:scale-105"
                >
                  適用
                </button>
                <button
                  onClick={() => {
                    setImageSrc('');
                    setImageFile(null);
                    fileInputRef.current?.click();
                  }}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                >
                  画像を変更
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ImageUploadModal;