import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import type { CharacterImage } from '../../types/characterDisplay.tsx';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageUpload: (image: CharacterImage) => void;
  title: string;
  cropAspect?: number;
  initialCrop?: { x: number; y: number; size: number } | null;
}

// Canvas上で画像をクロップする関数
const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<{ file: File; url: string } | null> => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => {
    image.onload = resolve;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // 回転を考慮したサイズ計算
  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  canvas.width = safeArea;
  canvas.height = safeArea;

  // 透明な背景のままにする（clearRectで初期化）
  ctx.clearRect(0, 0, safeArea, safeArea);

  // 画像を中央に配置して回転
  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);

  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  // クロップサイズに合わせてキャンバスをリサイズ
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // 透明な背景のままにする
  ctx.clearRect(0, 0, pixelCrop.width, pixelCrop.height);

  // クロップ領域を描画
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  );

  // Blob作成
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
    }, 'image/png');
  });
};

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onImageUpload,
  title,
  cropAspect,  // undefinedの場合は自由なアスペクト比
  initialCrop
}) => {
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = reader.result as string;
      setTempImageUrl(imageUrl);
      setSelectedFile(file);
      
      // 初期クロップ位置を設定（前回の位置があれば使用）
      if (initialCrop) {
        // TODO: initialCropのsize,x,yをcropとzoomに変換
        // react-easy-cropは位置とズームで管理するため
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      }
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

  const handleCropComplete = useCallback(async () => {
    if (!tempImageUrl || !croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(
        tempImageUrl,
        croppedAreaPixels,
        0  // 回転なし
      );
      
      if (croppedImage) {
        onImageUpload({
          file: croppedImage.file,
          url: croppedImage.url,
          cropData: {
            x: croppedAreaPixels.x,
            y: croppedAreaPixels.y,
            width: croppedAreaPixels.width,
            height: croppedAreaPixels.height
          }
        });
        handleClose();
      }
    } catch (e) {
      console.error('Error cropping image:', e);
    }
  }, [tempImageUrl, croppedAreaPixels, onImageUpload]);

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
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
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
        maxWidth: tempImageUrl ? '900px' : '600px',
        height: tempImageUrl ? 'auto' : 'auto',
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
              {/* クロッパー */}
              <div style={{
                flex: 1,
                position: 'relative',
                height: '400px',
                background: '#f7f8f9',
                borderRadius: '8px'
              }}>
                <Cropper
                  image={tempImageUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={cropAspect}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  zoomSpeed={0.1}  // マウスホイールの感度を細かく
                  style={{
                    containerStyle: {
                      width: '100%',
                      height: '100%'
                    }
                  }}
                />
              </div>
              
              {/* コントロール */}
              <div style={{
                width: '250px',
                padding: '20px',
                background: '#f7f8f9',
                borderRadius: '8px',
                alignSelf: 'flex-start'
              }}>
                <h4 style={{
                  margin: '0 0 16px',
                  fontSize: '14px',
                  color: '#35383f',
                  fontWeight: '600'
                }}>
                  画像調整
                </h4>
                
                {/* ズームスライダー */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    color: '#70757e',
                    marginBottom: '8px'
                  }}>
                    ズーム
                  </label>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.05}  // より細かいステップに
                    onChange={(e) => setZoom(Number(e.target.value))}
                    style={{
                      width: '100%'
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: '#9499a0',
                    marginTop: '4px'
                  }}>
                    <span>1x</span>
                    <span>{zoom.toFixed(2)}x</span>
                    <span>3x</span>
                  </div>
                </div>
                
                {/* ボタン */}
                <div style={{
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUploadModal;