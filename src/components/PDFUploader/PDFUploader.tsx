import React, { useState, useRef, useEffect, type DragEvent } from 'react';
import { AuthService } from '../../services/auth';
import type { User } from 'firebase/auth';
import styles from './PDFUploader.module.css';

interface PDFUploaderProps {
  onFileSelect: (file: File) => void;
  maxSize?: number; // in MB
}

export const PDFUploader: React.FC<PDFUploaderProps> = ({ 
  onFileSelect, 
  maxSize = 50 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const validateFile = (file: File): boolean => {
    setError(null);

    if (file.type !== 'application/pdf') {
      setError('PDFファイルのみアップロード可能です');
      return false;
    }

    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`ファイルサイズは${maxSize}MB以下にしてください`);
      return false;
    }

    return true;
  };

  const handleFile = (file: File) => {
    // ログインチェック
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      setError('この機能を使用するにはログインが必要です');
      return;
    }
    
    if (validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.container}>
      <div
        className={`${styles.uploadArea} ${isDragging ? styles.dragging : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileInput}
          className={styles.fileInput}
        />
        
        <div className={styles.uploadContent}>
          <svg 
            className={styles.uploadIcon} 
            width="64" 
            height="64" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor"
          >
            <path d="M12 2v10m0 0l-3-3m3 3l3-3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 22h6a2 2 0 002-2V7.5L14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          
          <p className={styles.uploadText}>
            {user ? (
              <>
                PDFファイルをドラッグ&ドロップ
                <br />
                または
                <br />
                <span className={styles.clickText}>クリックして選択</span>
              </>
            ) : (
              <>
                この機能を使用するには
                <br />
                ログインが必要です
              </>
            )}
          </p>
          
          <p className={styles.sizeLimit}>
            最大ファイルサイズ: {maxSize}MB
          </p>
        </div>
      </div>
      
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
    </div>
  );
};