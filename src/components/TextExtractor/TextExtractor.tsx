import React, { useState, useEffect } from 'react';
import { PDFApiService, type ExtractResponse } from '../../services/api';
import { AuthService } from '../../services/auth';
import { EncryptionKeyService } from '../../services/encryptionKey';
import { EncryptionService } from '../../services/encryption';
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
  const [showColumnInfo, setShowColumnInfo] = useState(false);

  useEffect(() => {
    setEndPage(numPages);
  }, [numPages]);

  const handleExtract = async () => {
    setIsExtracting(true);
    setError(null);
    setExtractedData(null);

    // ログインチェック
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      setError('ログインが必要です');
      setIsExtracting(false);
      return;
    }

    // サーバーの状態をチェック
    const isHealthy = await PDFApiService.checkHealth();
    if (!isHealthy) {
      setIsServerAwake(false);
    }

    try {
      // ユーザーの暗号化キーを取得
      console.log('暗号化キーを取得中...');
      const encryptionKey = await EncryptionKeyService.getUserKey(currentUser);
      console.log('暗号化キー取得完了');

      // 暗号化APIを使用してテキストを抽出
      console.log('暗号化APIでテキスト抽出中...');
      const encryptedResponse = await PDFApiService.extractTextEncrypted(
        file,
        encryptionKey,
        startPage,
        endPage,
        true
      );
      
      // 復号化
      console.log('レスポンスを復号化中...');
      const decryptedJson = await EncryptionService.decrypt(
        encryptedResponse.encrypted_data,
        encryptedResponse.iv,
        encryptionKey
      );
      
      // JSONをパース
      const data: ExtractResponse = JSON.parse(decryptedJson);
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
          
          <div className={styles.columnSection}>
            <button 
              className={styles.toggleButton}
              onClick={() => setShowColumnInfo(!showColumnInfo)}
            >
              カラム情報 {showColumnInfo ? '▼' : '▶'}
            </button>
            {showColumnInfo && (
              <div className={styles.pageInfo}>
                {extractedData.extracted_pages.map((page) => (
                  <div key={page.page_number} className={styles.pageColumn}>
                    ページ {page.page_number}: {page.column_count || 1}カラム
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className={styles.textPreview}>
            <h4>プレビュー</h4>
            <pre className={styles.previewText}>
              {extractedData.full_text}
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