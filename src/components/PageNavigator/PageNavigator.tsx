import React, { useState, useEffect } from 'react';
import styles from './PageNavigator.module.css';

interface PageNavigatorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export const PageNavigator: React.FC<PageNavigatorProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  zoom,
  onZoomChange,
}) => {
  const [inputValue, setInputValue] = useState(currentPage.toString());

  useEffect(() => {
    setInputValue(currentPage.toString());
  }, [currentPage]);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(inputValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      setInputValue(currentPage.toString());
    }
  };

  const handleZoomIn = () => {
    if (zoom < 400) {
      onZoomChange(Math.min(zoom + 25, 400));
    }
  };

  const handleZoomOut = () => {
    if (zoom > 25) {
      onZoomChange(Math.max(zoom - 25, 25));
    }
  };

  const handleZoomReset = () => {
    onZoomChange(100);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  return (
    <div className={styles.container}>
      <div className={styles.pageControls}>
        <button
          className={styles.button}
          onClick={handlePrevious}
          disabled={currentPage <= 1}
          aria-label="前のページ"
        >
          ← 前へ
        </button>

        <form onSubmit={handleInputSubmit} className={styles.pageInput}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            className={styles.input}
            aria-label="ページ番号"
          />
          <span className={styles.separator}>/</span>
          <span className={styles.totalPages}>{totalPages}</span>
        </form>

        <button
          className={styles.button}
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          aria-label="次のページ"
        >
          次へ →
        </button>
      </div>

      <div className={styles.zoomControls}>
        <button
          className={styles.zoomButton}
          onClick={handleZoomOut}
          disabled={zoom <= 25}
          aria-label="縮小"
        >
          −
        </button>
        
        <button
          className={styles.zoomReset}
          onClick={handleZoomReset}
          aria-label="ズームリセット"
        >
          {zoom}%
        </button>
        
        <button
          className={styles.zoomButton}
          onClick={handleZoomIn}
          disabled={zoom >= 400}
          aria-label="拡大"
        >
          +
        </button>
      </div>
    </div>
  );
};