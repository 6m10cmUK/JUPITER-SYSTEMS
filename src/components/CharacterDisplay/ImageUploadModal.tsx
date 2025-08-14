import React, { useState, useCallback, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import type { CharacterImage } from '../../types/characterDisplay.tsx';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageUpload: (image: CharacterImage) => void;
  title: string;
  cropAspect?: number;
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onImageUpload,
  title,
  cropAspect
}) => {
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 25,
    y: 25,
    width: 50,
    height: 50
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setTempImageUrl(reader.result as string);
      setSelectedFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
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
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleFileSelect(files[0]);
    }
  };

  const handleCropComplete = useCallback(() => {
    if (!completedCrop || !tempImageUrl || !selectedFile) return;

    // 表示されている画像要素を取得
    const displayedImage = document.querySelector('img[alt="Crop preview"]') as HTMLImageElement;
    if (!displayedImage) return;

    const image = new Image();
    image.src = tempImageUrl;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 表示サイズと実際のサイズの比率を計算
      const scaleX = image.naturalWidth / displayedImage.width;
      const scaleY = image.naturalHeight / displayedImage.height;

      // 実際のピクセルサイズでキャンバスを設定
      const pixelCrop = {
        x: completedCrop.x * scaleX,
        y: completedCrop.y * scaleY,
        width: completedCrop.width * scaleX,
        height: completedCrop.height * scaleY
      };

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      // クロップ領域を描画
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
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
              x: pixelCrop.x,
              y: pixelCrop.y,
              width: pixelCrop.width,
              height: pixelCrop.height
            }
          });
          
          handleClose();
        }
      });
    };
  }, [completedCrop, tempImageUrl, selectedFile, onImageUpload]);

  const handleDirectUpload = () => {
    if (!tempImageUrl || !selectedFile) return;
    
    onImageUpload({
      file: selectedFile,
      url: tempImageUrl
    });
    
    handleClose();
  };

  const handleClose = () => {
    setTempImageUrl(null);
    setSelectedFile(null);
    setCrop({
      unit: '%',
      x: 25,
      y: 25,
      width: 50,
      height: 50
    });
    setCompletedCrop(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '900px',
        maxHeight: '95vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* ヘッダー */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e8eaed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '18px', 
            fontWeight: '600',
            color: '#1f2126'
          }}>
            {title}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#70757e" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px'
        }}>
          {!tempImageUrl ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? '#0096fa' : '#d2d5da'}`,
                borderRadius: '12px',
                padding: '60px 40px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isDragging ? '#f0f8ff' : '#f7f8f9'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                style={{ display: 'none' }}
              />
              
              <svg 
                width="64" 
                height="64" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke={isDragging ? '#0096fa' : '#9499a0'}
                strokeWidth="1.5"
                style={{ margin: '0 auto 20px' }}
              >
                <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              
              <p style={{ 
                margin: '0 0 8px', 
                fontSize: '16px', 
                color: '#35383f', 
                fontWeight: '600' 
              }}>
                ドラッグ＆ドロップまたはクリックして画像を選択
              </p>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: '#9499a0' 
              }}>
                JPG、PNG、GIF形式に対応
              </p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              gap: '24px',
              height: '100%',
              maxHeight: 'calc(95vh - 200px)'
            }}>
              <div style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden'
              }}>
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  style={{
                    maxHeight: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <img 
                    src={tempImageUrl} 
                    alt="Crop preview" 
                    style={{ 
                      maxWidth: '100%',
                      maxHeight: 'calc(80vh - 250px)',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }} 
                  />
                </ReactCrop>
              </div>
              
              <div style={{
                width: '200px',
                padding: '20px',
                background: '#f7f8f9',
                borderRadius: '8px',
                alignSelf: 'flex-start'
              }}>
                <h4 style={{
                  margin: '0 0 12px',
                  fontSize: '14px',
                  color: '#35383f',
                  fontWeight: '600'
                }}>
                  クリップ設定
                </h4>
                <p style={{
                  margin: '0 0 16px',
                  fontSize: '12px',
                  color: '#70757e',
                  lineHeight: '1.5'
                }}>
                  画像をドラッグして範囲を調整できます
                </p>
                
                {/* ボタンを右側に配置 */}
                <div style={{
                  marginTop: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <button
                    onClick={handleCropComplete}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#0096fa',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    クリップして使用
                  </button>
                  <button
                    onClick={handleDirectUpload}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'white',
                      color: '#0096fa',
                      border: '1px solid #0096fa',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    クリップなしで使用
                  </button>
                  <button
                    onClick={handleClose}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'white',
                      color: '#70757e',
                      border: '1px solid #d2d5da',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUploadModal;