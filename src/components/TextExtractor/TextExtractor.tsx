import React, { useState, useEffect } from 'react';
import { PDFApiService, type ExtractResponse } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
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
  const { user } = useAuth();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(numPages);
  const [isServerAwake, setIsServerAwake] = useState(true);
  const [showLayoutInfo, setShowLayoutInfo] = useState(false);

  useEffect(() => {
    setEndPage(numPages);
  }, [numPages]);

  const handleExtract = async () => {
    setIsExtracting(true);
    setError(null);
    setExtractedData(null);

    // ログインチェック
    if (!user) {
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
      // 暗号化は絶対要件 - ユーザーの暗号化キーを取得
      console.log('暗号化キーを取得中...');
      const encryptionKey = await EncryptionKeyService.getUserKey(user.uid);
      console.log('暗号化キー取得完了');

      // 暗号化APIを使用してテキストを抽出（成形オプション有効）
      console.log('暗号化APIでテキスト抽出中...');
      const encryptedResponse = await PDFApiService.extractTextEncrypted(
        file,
        encryptionKey,
        startPage,
        endPage,
        true,
        true  // apply_formatting を有効化
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

  const handleCopyToClipboard = async () => {
    if (!extractedData) return;
    
    try {
      await navigator.clipboard.writeText(extractedData.full_text);
      alert('テキストをクリップボードにコピーしました');
    } catch (err) {
      console.error('コピーに失敗しました:', err);
      alert('コピーに失敗しました');
    }
  };

  const handleDownloadAsText = () => {
    if (!extractedData) return;
    
    // ファイル名を生成（PDFファイル名から拡張子を除いて.txtを追加）
    const baseFileName = file.name.replace(/\.pdf$/i, '');
    const fileName = `${baseFileName}_extracted.txt`;
    
    // Blob作成
    const blob = new Blob([extractedData.full_text], { type: 'text/plain;charset=utf-8' });
    
    // ダウンロードリンクを作成
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
    // クリックしてダウンロード
    document.body.appendChild(link);
    link.click();
    
    // クリーンアップ
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <div className={styles.controlPanel}>
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
          <>
            <div className={styles.summary}>
              <h3>抽出情報</h3>
              <div className={styles.summaryDetails}>
                <span>総ページ数: {extractedData.total_pages}</span>
                <span>抽出ページ数: {extractedData.extracted_pages.length}</span>
              </div>
            </div>
            
            <div className={styles.layoutSection}>
              <button 
                className={styles.toggleButton}
                onClick={() => setShowLayoutInfo(!showLayoutInfo)}
              >
                レイアウト解析情報 {showLayoutInfo ? '▼' : '▶'}
              </button>
              {showLayoutInfo && (
                <div className={styles.layoutInfo}>
                  {extractedData.extracted_pages.map((page) => (
                    <div key={page.page_number} className={styles.pageLayout}>
                      <div className={styles.pageLayoutHeader}>
                        ページ {page.page_number}
                      </div>
                      <div className={styles.layoutDetails}>
                        <div className={styles.layoutItem}>
                          <span className={styles.layoutLabel}>カラム数:</span>
                          <span className={styles.layoutValue}>{page.column_count || 1}</span>
                        </div>
                        {page.has_header && (
                          <div className={styles.layoutItem}>
                            <span className={styles.layoutLabel}>ヘッダー:</span>
                            <span className={styles.layoutValue}>{page.header_text || '検出済み'}</span>
                          </div>
                        )}
                        {page.has_footer && (
                          <div className={styles.layoutItem}>
                            <span className={styles.layoutLabel}>フッター:</span>
                            <span className={styles.layoutValue}>{page.footer_text || '検出済み'}</span>
                          </div>
                        )}
                        {!page.has_header && !page.has_footer && (
                          <div className={styles.layoutItem}>
                            <span className={styles.layoutNote}>ヘッダー/フッターなし</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className={styles.actions}>
              <button 
                className={styles.copyButton}
                onClick={handleCopyToClipboard}
              >
                全文をコピー
              </button>
              <button 
                className={styles.downloadButton}
                onClick={handleDownloadAsText}
              >
                テキストファイルとしてダウンロード
              </button>
            </div>
          </>
        )}
      </div>

      {extractedData && (
        <div className={styles.results}>
          <div className={styles.textPreview}>
            <h3>抽出結果プレビュー</h3>
            <pre className={styles.previewText}>
              {extractedData.full_text}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};