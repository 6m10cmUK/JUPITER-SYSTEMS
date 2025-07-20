export interface PDFState {
  file: File | null;
  numPages: number;
  currentPage: number;
  zoom: number;
  rotation: number;
  isLoading: boolean;
  error: string | null;
}

export interface PDFPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  scale: number;
}

export interface PDFUploadError {
  type: 'size' | 'format' | 'corrupted' | 'unknown';
  message: string;
}