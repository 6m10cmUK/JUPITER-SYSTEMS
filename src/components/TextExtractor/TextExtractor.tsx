import React, { useState, useEffect } from 'react';
import { PDFApiService, ExtractResponse } from '../../services/api';
import styles from './TextExtractor.module.css';

interface TextExtractorProps {
  file: File;
  numPages: number;
  currentPage: number;
}

export const TextExtractor: React.FC<TextExtractorProps> = ({
  file,
  numPages,
  currentPage,
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(numPages);
  const [isServerAwake, setIsServerAwake] = useState(true);

  useEffect(() => {
    setEndPage(numPages);
  }, [numPages]);

  const handleExtract = async () => {
    setIsExtracting(true);
    setError(null);
    setExtractedData(null);

    // サーバーの状態をチェック
    const isHealthy = await PDFApiService.checkHealth();
    if (!isHealthy) {
      setIsServerAwake(false);
    }

    try {
      const data = await PDFApiService.extractText(
        file,
        startPage,
        endPage,
        true
      );
      setExtractedData(data);
      setIsServerAwake(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'テキスト抽出に失敗しました');
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePageRangeChange = (type: 'start' | 'end', value: string) => {
    const page = parseInt(value, 10);
    if (isNaN(page)) return;

    if (type === 'start') {
      setStartPage(Math.max(1, Math.min(page, numPages)));
    } else {
      setEndPage(Math.max(1, Math.min(page, numPages)));
    }
  };

  const handleSetCurrentPage = () => {
    setStartPage(currentPage);
    setEndPage(currentPage);
  };

  return (
    <div className={styles.container}>
      <h2>テキスト抽出</h2>
      
      <div className={styles.controls}>
        <div className={styles.pageRange}>
          <label>
            開始ページ:
            <input
              type="number"
              min="1"
              max={numPages}
              value={startPage}
              onChange={(e) => handlePageRangeChange('start', e.target.value)}
              className={styles.pageInput}
            />
          </label>
          
          <span className={styles.separator}>〜</span>
          
          <label>
            終了ページ:
            <input
              type="number"
              min="1"
              max={numPages}
              value={endPage}
              onChange={(e) => handlePageRangeChange('end', e.target.value)}
              className={styles.pageInput}
            />
          </label>
          
          <button
            onClick={handleSetCurrentPage}
            className={styles.currentPageButton}
            title="現在のページのみ"
          >
            現在のページ
          </button>
        </div>

        <button
          onClick={handleExtract}
          disabled={isExtracting || startPage > endPage}
          className={styles.extractButton}
        >
          {isExtracting ? '抽出中...' : 'テキスト抽出'}
        </button>
      </div>

      {!isServerAwake && (
        <div className={styles.serverStatus}>
          <div className={styles.wakeupMessage}>
            🌙 サーバーが休止状態です。起動中です...（最大1分かかります）
            <div className={styles.spinner}></div>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          エラー: {error}
        </div>
      )}

      {extractedData && (
        <div className={styles.results}>
          <h3>抽出結果</h3>
          <div className={styles.summary}>
            <span>総ページ数: {extractedData.total_pages}</span>
            <span>抽出ページ数: {extractedData.extracted_pages.length}</span>
          </div>
          
          <div className={styles.textPreview}>
            <h4>プレビュー</h4>
            <pre className={styles.previewText}>
              {extractedData.full_text.substring(0, 500)}
              {extractedData.full_text.length > 500 && '...'}
            </pre>
          </div>
          
          <div className={styles.actions}>
            <button className={styles.copyButton}>
              全文をコピー
            </button>
            <button className={styles.downloadButton}>
              テキストファイルとしてダウンロード
            </button>
          </div>
        </div>
      )}
    </div>
  );
};