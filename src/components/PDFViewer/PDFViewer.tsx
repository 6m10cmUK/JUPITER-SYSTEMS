import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import styles from './PDFViewer.module.css';

interface PDFViewerProps {
  pdf: PDFDocumentProxy | null;
  currentPage: number;
  zoom: number;
  rotation: number;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdf,
  currentPage,
  zoom,
  rotation,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    const renderPage = async () => {
      setIsRendering(true);
      setPageError(null);

      try {
        const page: PDFPageProxy = await pdf.getPage(currentPage);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // ビューポートの設定
        const scale = zoom / 100;
        const viewport = page.getViewport({ scale, rotation });

        // Canvasのサイズ設定
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // レンダリング
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'ページの表示に失敗しました');
      } finally {
        setIsRendering(false);
      }
    };

    renderPage();
  }, [pdf, currentPage, zoom, rotation]);

  if (!pdf) {
    return (
      <div className={styles.container}>
        <div className={styles.placeholder}>
          PDFファイルを選択してください
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.canvasWrapper}>
        <canvas 
          ref={canvasRef}
          className={styles.canvas}
        />
        {isRendering && (
          <div className={styles.loading}>
            読み込み中...
          </div>
        )}
        {pageError && (
          <div className={styles.error}>
            {pageError}
          </div>
        )}
      </div>
    </div>
  );
};