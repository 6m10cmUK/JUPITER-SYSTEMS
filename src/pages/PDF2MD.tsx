import { useState, useEffect } from 'react'
import { PDFUploader } from '../components/PDFUploader'
import { PDFViewer } from '../components/PDFViewer'
import { PageNavigator } from '../components/PageNavigator'
import { TextExtractor } from '../components/TextExtractor'
import { LayoutAnalyzer } from '../components/LayoutAnalyzer/LayoutAnalyzer'
import { ServerStatusBanner } from '../components/ServerStatusBanner'
import { usePDF } from '../hooks/usePDF'
import { useServerStatus } from '../hooks/useServerStatus'
import type { LayoutData } from '../types/layout.types'

export function PDF2MD() {
  useEffect(() => {
    document.title = 'JUPITER SYSTEMS / PDF→Markdown'
  }, [])
  
  const [file, setFile] = useState<File | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [rotation] = useState(0)
  const [showPdfPreview, setShowPdfPreview] = useState(true)
  const [layoutData, setLayoutData] = useState<LayoutData | null>(null)
  const [showLayoutOverlay, setShowLayoutOverlay] = useState(false)
  
  const { pdf, numPages, isLoading, error, loadPDF } = usePDF()
  const { status: serverStatus } = useServerStatus({ autoStart: true })

  useEffect(() => {
    if (file) {
      loadPDF(file)
      setCurrentPage(1)
    }
  }, [file, loadPDF])

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // ページ変更時は新しいページのレイアウト解析が必要
    if (layoutData) {
      const hasPageData = layoutData.pages?.some((p) => p.page_number === page)
      if (!hasPageData) {
        setShowLayoutOverlay(false)
      }
    }
  }

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom)
  }

  const handleLayoutAnalyzed = (data: LayoutData) => {
    setLayoutData(data)
    setShowLayoutOverlay(true)
  }

  return (
    <div className="pdf2md-page">
      <ServerStatusBanner status={serverStatus} />
      <main className="app-main">
        {!file ? (
          <div className="upload-container">
            <PDFUploader onFileSelect={handleFileSelect} />
          </div>
        ) : (
          <div className="pdf-container">
            {isLoading ? (
              <div className="loading-container">
                <div className="loading">PDFを読み込み中...</div>
              </div>
            ) : error ? (
              <div className="error-container">
                <div className="error">{error}</div>
                <button onClick={() => setFile(null)} className="reset-button">
                  別のファイルを選択
                </button>
              </div>
            ) : (
              <div className="content-container">
                {showPdfPreview && (
                  <div className="pdf-section">
                    <div className="pdf-section-header">
                      <h3>PDFプレビュー</h3>
                      <button 
                        className="close-preview-button"
                        onClick={() => setShowPdfPreview(false)}
                        title="プレビューを閉じる"
                      >
                        ×
                      </button>
                    </div>
                    <div className="viewer-wrapper">
                      <PDFViewer 
                        pdf={pdf}
                        currentPage={currentPage}
                        zoom={zoom}
                        rotation={rotation}
                        layoutData={layoutData}
                        showLayoutOverlay={showLayoutOverlay}
                        onRegionClick={() => {}}
                      />
                    </div>
                    <PageNavigator 
                      currentPage={currentPage}
                      totalPages={numPages}
                      onPageChange={handlePageChange}
                      zoom={zoom}
                      onZoomChange={handleZoomChange}
                    />
                    <LayoutAnalyzer
                      pdfFile={file}
                      currentPage={currentPage}
                      onLayoutAnalyzed={handleLayoutAnalyzed}
                    />
                    {layoutData && (
                      <div className="overlay-toggle">
                        <label>
                          <input
                            type="checkbox"
                            checked={showLayoutOverlay}
                            onChange={(e) => setShowLayoutOverlay(e.target.checked)}
                          />
                          レイアウトオーバーレイを表示
                        </label>
                      </div>
                    )}
                  </div>
                )}
                {!showPdfPreview && (
                  <div className="preview-toggle">
                    <button 
                      className="show-preview-button"
                      onClick={() => setShowPdfPreview(true)}
                    >
                      PDFプレビューを表示
                    </button>
                  </div>
                )}
                <div className={`extractor-section ${!showPdfPreview ? 'expanded' : ''}`}>
                  <TextExtractor 
                    file={file}
                    numPages={numPages}
                    currentPage={currentPage}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}