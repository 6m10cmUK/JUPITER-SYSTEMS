import React, { useState, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import type { CharacterImage } from '../../types/characterDisplay.tsx';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageUpload: (image: CharacterImage) => void;
  title: string;
}

const ImageUploadModalReactCrop: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onImageUpload,
  title
}) => {
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = reader.result as string;
      setTempImageUrl(imageUrl);
      setSelectedFile(file);
      setCrop(undefined);
      setCompletedCrop(null);
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

  const getCroppedImg = async (): Promise<{ file: File; url: string } | null> => {
    if (!imgRef.current || !completedCrop) {
      return null;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // 実際のピクセルサイズでCanvasを作成
    const pixelWidth = Math.floor(completedCrop.width * scaleX);
    const pixelHeight = Math.floor(completedCrop.height * scaleY);
    
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;

    // 透明な背景を維持
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 高画質化のための設定
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      pixelWidth,
      pixelHeight,
      0,
      0,
      pixelWidth,
      pixelHeight
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const file = new File([blob], 'cropped-image.png', {
          type: 'image/png',
        });
        const url = URL.createObjectURL(blob);
        resolve({ file, url });
      }, 'image/png', 1.0);  // 最高品質で出力
    });
  };

  const handleCropComplete = async () => {
    if (!tempImageUrl || !completedCrop) return;

    const croppedImage = await getCroppedImg();
    if (croppedImage) {
      onImageUpload({
        file: croppedImage.file,
        url: croppedImage.url,
        cropData: {
          x: completedCrop.x,
          y: completedCrop.y,
          width: completedCrop.width,
          height: completedCrop.height
        }
      });
      handleClose();
    }
  };

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
    setCrop(undefined);
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
        maxWidth: tempImageUrl ? '1000px' : '600px',
        height: tempImageUrl ? '85vh' : 'auto',
        maxHeight: '85vh',
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
              height: '100%'
            }}>
              {/* ReactCrop - 左側 */}
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f7f8f9',
                borderRadius: '8px',
                padding: '20px',
                overflow: 'auto'
              }}>
                <ReactCrop
                  crop={crop}
                  onChange={c => setCrop(c)}
                  onComplete={c => setCompletedCrop(c)}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%'
                  }}
                >
                  <img
                    ref={imgRef}
                    src={tempImageUrl}
                    alt="アップロード画像"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 'calc(85vh - 160px)',
                      objectFit: 'contain'
                    }}
                    onLoad={(_e) => {
                      // 画像読み込み時に画像全体を選択
                      setCrop({
                        unit: '%',
                        width: 100,
                        height: 100,
                        x: 0,
                        y: 0
                      });
                    }}
                  />
                </ReactCrop>
              </div>
              
              {/* ボタン - 右側 */}
              <div style={{
                width: '250px',
                padding: '20px',
                background: '#f7f8f9',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <h4 style={{
                  margin: '0 0 16px',
                  fontSize: '14px',
                  color: '#35383f',
                  fontWeight: '600'
                }}>
                  画像調整
                </h4>
                
                <button
                  onClick={handleCropComplete}
                  disabled={!completedCrop}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: completedCrop ? '#0096fa' : '#d2d5da',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: completedCrop ? 'pointer' : 'not-allowed'
                  }}
                >
                  クロップして使用
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
                  クロップなしで使用
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUploadModalReactCrop;