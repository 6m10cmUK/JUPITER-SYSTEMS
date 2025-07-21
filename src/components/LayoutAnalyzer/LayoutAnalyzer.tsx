import React, { useState } from 'react';
import { analyzeLayout } from '../../services/api';
import styles from './LayoutAnalyzer.module.css';

interface LayoutAnalyzerProps {
  pdfFile: File | null;
  currentPage: number;
  onLayoutAnalyzed: (layoutData: any) => void;
}

export const LayoutAnalyzer: React.FC<LayoutAnalyzerProps> = ({
  pdfFile,
  currentPage,
  onLayoutAnalyzed
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [layoutData, setLayoutData] = useState<any>(null);
  const [selectedRegion] = useState<any>(null);

  const handleAnalyzeLayout = async () => {
    if (!pdfFile) return;

    setIsAnalyzing(true);
    try {
      const data = await analyzeLayout(pdfFile, currentPage, currentPage);
      setLayoutData(data);
      onLayoutAnalyzed(data);
    } catch (error) {
      console.error('レイアウト解析エラー:', error);
      alert('レイアウト解析に失敗しました');
    } finally {
      setIsAnalyzing(false);
    }
  };


  const currentPageLayout = layoutData?.pages?.find(
    (p: any) => p.page_number === currentPage
  );

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <button
          onClick={handleAnalyzeLayout}
          disabled={!pdfFile || isAnalyzing}
          className={styles.analyzeButton}
        >
          {isAnalyzing ? '解析中...' : 'レイアウト解析'}
        </button>
        
        {layoutData && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={styles.detailsButton}
          >
            {showDetails ? '詳細を隠す' : '詳細を表示'}
          </button>
        )}
      </div>

      {showDetails && currentPageLayout && (
        <div className={styles.details}>
          <h3>ページ {currentPage} のレイアウト</h3>
          
          <div className={styles.section}>
            <h4>ヘッダー領域</h4>
            <div className={styles.regionInfo}>
              <span>検出: {currentPageLayout.regions.header.detected ? '有り' : '無し'}</span>
              {currentPageLayout.regions.header.detected && (
                <>
                  <span>高さ: {Math.round((currentPageLayout.regions.header.height / currentPageLayout.height) * 100)}%</span>
                  <div className={styles.textPreview}>
                    {currentPageLayout.regions.header.text}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <h4>フッター領域</h4>
            <div className={styles.regionInfo}>
              <span>検出: {currentPageLayout.regions.footer.detected ? '有り' : '無し'}</span>
              {currentPageLayout.regions.footer.detected && (
                <>
                  <span>高さ: {Math.round((currentPageLayout.regions.footer.height / currentPageLayout.height) * 100)}%</span>
                  <div className={styles.textPreview}>
                    {currentPageLayout.regions.footer.text}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <h4>縦の余白領域</h4>
            {currentPageLayout.regions.vertical_gaps?.length > 0 ? (
              currentPageLayout.regions.vertical_gaps.map((gap: any, index: number) => (
                <div key={index} className={styles.gapInfo}>
                  <h5>余白 {index + 1}</h5>
                  <span>位置: X={Math.round(gap.x)}px</span>
                  <span>幅: {Math.round(gap.width)}px</span>
                  <span>高さ: {Math.round(gap.height)}px</span>
                </div>
              ))
            ) : (
              <p className={styles.noGaps}>縦の余白領域は検出されませんでした</p>
            )}
          </div>

          {currentPageLayout.regions.columns && currentPageLayout.regions.columns.length > 0 && (
            <div className={styles.section}>
              <h4>カラム領域</h4>
              {currentPageLayout.regions.columns.map((column: any) => (
                <div key={column.column_number} className={styles.columnInfo}>
                  <h5>カラム {column.column_number}</h5>
                  <span>ブロック数: {column.block_count}</span>
                  <span>幅: {Math.round(column.width)}px</span>
                  <span>位置: X={Math.round(column.x)}px</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedRegion && (
        <div className={styles.regionDetails}>
          <h4>{selectedRegion.type}の詳細</h4>
          <pre>{JSON.stringify(selectedRegion, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};