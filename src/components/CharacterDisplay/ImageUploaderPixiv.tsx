import React, { useState, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import type { CharacterImage } from '../../types/characterDisplay.tsx';

interface ImageUploaderPixivProps {
  label: string;
  onImageUpload: (image: CharacterImage) => void;
  currentImage?: CharacterImage | null;
  cropAspect?: number;
  recommendedSize?: { width: number; height: number };
}

const ImageUploaderPixiv: React.FC<ImageUploaderPixivProps> = ({
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

  const handleDirectUpload = () => {
    if (!tempImageUrl || !selectedFile) return;
    
    onImageUpload({
      file: selectedFile,
      url: tempImageUrl
    });
    
    setShowCropper(false);
    setTempImageUrl(null);
  };

  return (
    <div>
      <label style={{ 
        display: 'block', 
        fontSize: '12px', 
        fontWeight: '600', 
        color: '#70757e', 
        marginBottom: '8px' 
      }}>
        {label}
      </label>
      
      {recommendedSize && (
        <p style={{ 
          fontSize: '11px', 
          color: '#9499a0', 
          margin: '0 0 8px 0' 
        }}>
          推奨サイズ: {recommendedSize.width} × {recommendedSize.height}px
        </p>
      )}

      {!showCropper && (
        <div>
          {!currentImage ? (
            <label
              htmlFor={`file-input-${label}`}
              style={{
                display: 'block',
                width: '100%',
                padding: '32px',
                border: '2px dashed #d2d5da',
                borderRadius: '8px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: '#f7f8f9'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0096fa';
                e.currentTarget.style.background = '#f0f8ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d2d5da';
                e.currentTarget.style.background = '#f7f8f9';
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id={`file-input-${label}`}
              />
              <svg 
                width="48" 
                height="48" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#9499a0" 
                strokeWidth="1.5"
                style={{ margin: '0 auto 12px' }}
              >
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#35383f', fontWeight: '500' }}>
                クリックして画像を選択
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#9499a0' }}>
                またはドラッグ＆ドロップ
              </p>
            </label>
          ) : (
            <div style={{ position: 'relative' }}>
              <img
                src={currentImage.url}
                alt={label}
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  border: '1px solid #e8eaed'
                }}
              />
              <button
                onClick={() => {
                  onImageUpload(null as any);
                }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid #e8eaed',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#70757e',
                  fontWeight: '500'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" />
                </svg>
                削除
              </button>
              <label
                htmlFor={`file-input-${label}`}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '70px',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid #e8eaed',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#0096fa',
                  fontWeight: '500'
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id={`file-input-${label}`}
                />
                変更
              </label>
            </div>
          )}
        </div>
      )}

      {showCropper && tempImageUrl && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ 
              margin: '0 0 16px', 
              fontSize: '18px', 
              fontWeight: '600',
              color: '#1f2126'
            }}>
              画像をクリップ
            </h3>
            
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={cropAspect}
            >
              <img src={tempImageUrl} alt="Crop preview" style={{ maxWidth: '100%' }} />
            </ReactCrop>
            
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginTop: '20px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleCancelCrop}
                style={{
                  padding: '8px 20px',
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
              <button
                onClick={handleDirectUpload}
                style={{
                  padding: '8px 20px',
                  background: 'white',
                  color: '#0096fa',
                  border: '1px solid #0096fa',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                そのまま使用
              </button>
              <button
                onClick={handleCropComplete}
                style={{
                  padding: '8px 20px',
                  background: '#0096fa',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                クリップを適用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploaderPixiv;