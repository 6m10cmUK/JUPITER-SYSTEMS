import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { LayoutOverlay } from '../LayoutOverlay/LayoutOverlay';
import styles from './PDFViewer.module.css';

interface PDFViewerProps {
  pdf: PDFDocumentProxy | null;
  currentPage: number;
  zoom: number;
  rotation: number;
  layoutData?: any;
  showLayoutOverlay?: boolean;
  onRegionClick?: (regionType: string, region: any) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdf,
  currentPage,
  zoom,
  rotation,
  layoutData,
  showLayoutOverlay = false,
  onRegionClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const renderTaskRef = useRef<any>(null);
  const pageRef = useRef<PDFPageProxy | null>(null);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    isUnmountedRef.current = false;

    if (!pdf || !canvasRef.current) return;

    let cancelled = false;
    const renderPage = async () => {
      // 既存のレンダリングタスクをキャンセル
      if (renderTaskRef.current) {
        try {
          await renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        } catch (e) {
          console.log('Previous render cancelled');
        }
      }

      // 前のページをクリーンアップ
      if (pageRef.current) {
        try {
          pageRef.current.cleanup();
          pageRef.current = null;
        } catch (e) {
          console.log('Page cleanup error:', e);
        }
      }

      if (cancelled || isUnmountedRef.current) return;

      setIsRendering(true);
      setPageError(null);

      try {
        const page: PDFPageProxy = await pdf.getPage(currentPage);
        if (cancelled || isUnmountedRef.current) {
          page.cleanup();
          return;
        }
        
        pageRef.current = page;
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // ビューポートの設定
        const scale = zoom / 100;
        const viewport = page.getViewport({ scale, rotation });

        // 新しいcanvasを作成して既存のcanvasと置き換える
        const newCanvas = document.createElement('canvas');
        newCanvas.width = viewport.width;
        newCanvas.height = viewport.height;
        newCanvas.className = canvas.className;
        
        const newContext = newCanvas.getContext('2d');
        if (!newContext) return;

        // レンダリング
        const renderContext = {
          canvasContext: newContext,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        
        await renderTask.promise;

        // レンダリング完了後、古いcanvasを新しいものと置き換える
        if (!cancelled && !isUnmountedRef.current && canvas.parentNode) {
          canvas.parentNode.replaceChild(newCanvas, canvas);
          canvasRef.current = newCanvas;
        }
      } catch (error: any) {
        // キャンセルエラーは無視
        if (error.name !== 'RenderingCancelledException' && !cancelled && !isUnmountedRef.current) {
          console.error('PDF rendering error:', error);
          setPageError(error instanceof Error ? error.message : 'ページの表示に失敗しました');
        }
      } finally {
        if (!cancelled && !isUnmountedRef.current) {
          setIsRendering(false);
        }
        renderTaskRef.current = null;
      }
    };

    // レンダリングを少し遅延させて、連続した変更をバッチ処理
    const timeoutId = setTimeout(() => {
      if (!cancelled && !isUnmountedRef.current) {
        renderPage();
      }
    }, 50);

    // クリーンアップ
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel().catch(() => {});
      }
      if (pageRef.current) {
        pageRef.current.cleanup();
      }
    };
  }, [pdf, currentPage, zoom, rotation]);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  if (!pdf) {
    return (
      <div className={styles.container}>
        <div className={styles.placeholder}>
          PDFファイルを選択してください
        </div>
      </div>
    );
  }

  const currentPageLayout = layoutData?.pages?.find(
    (p: any) => p.page_number === currentPage
  );

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
        {currentPageLayout && (
          <LayoutOverlay
            pageLayout={currentPageLayout}
            scale={zoom / 100}
            showOverlay={showLayoutOverlay}
            onRegionClick={onRegionClick}
          />
        )}
      </div>
    </div>
  );
};