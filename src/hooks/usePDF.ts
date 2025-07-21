import { useState, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

// PDF.js workerの設定
// CDNから読み込む（より確実）
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface UsePDFResult {
  pdf: PDFDocumentProxy | null;
  numPages: number;
  isLoading: boolean;
  error: string | null;
  loadPDF: (file: File) => Promise<void>;
}

export const usePDF = (): UsePDFResult => {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPDF = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      
      const pdfDocument = await loadingTask.promise;
      setPdf(pdfDocument);
      setNumPages(pdfDocument.numPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDFの読み込みに失敗しました');
      setPdf(null);
      setNumPages(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (pdf) {
        pdf.destroy();
      }
    };
  }, [pdf]);

  return {
    pdf,
    numPages,
    isLoading,
    error,
    loadPDF,
  };
};