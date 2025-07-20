const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ExtractedPage {
  page_number: number;
  text: string;
  blocks: Array<{
    bbox: number[];
    text: string;
    font_size: number;
    is_bold: boolean;
  }>;
}

export interface ExtractResponse {
  total_pages: number;
  extracted_pages: ExtractedPage[];
  full_text: string;
}

export class PDFApiService {
  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  static async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/`);
      return response.ok;
    } catch {
      return false;
    }
  }

  static async extractText(
    file: File,
    startPage: number = 1,
    endPage?: number,
    preserveLayout: boolean = true
  ): Promise<ExtractResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const params = new URLSearchParams({
      start_page: startPage.toString(),
      preserve_layout: preserveLayout.toString(),
    });
    
    if (endPage) {
      params.append('end_page', endPage.toString());
    }

    const response = await fetch(`${API_URL}/api/extract-text?${params}`, {
      method: 'POST',
      body: formData,
    });

    return this.handleResponse<ExtractResponse>(response);
  }

  static async analyzeLayout(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/analyze-layout`, {
      method: 'POST',
      body: formData,
    });

    return this.handleResponse(response);
  }
}