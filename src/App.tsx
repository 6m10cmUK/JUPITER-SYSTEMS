import { useState, useEffect } from 'react'
import './App.css'
import { PDFUploader } from './components/PDFUploader'
import { PDFViewer } from './components/PDFViewer'
import { PageNavigator } from './components/PageNavigator'
import { usePDF } from './hooks/usePDF'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [rotation] = useState(0)
  
  const { pdf, numPages, isLoading, error, loadPDF } = usePDF()

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
  }

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom)
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>PDF to Markdown Converter</h1>
      </header>
      
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
              <>
                <div className="viewer-wrapper">
                  <PDFViewer 
                    pdf={pdf}
                    currentPage={currentPage}
                    zoom={zoom}
                    rotation={rotation}
                  />
                </div>
                <PageNavigator 
                  currentPage={currentPage}
                  totalPages={numPages}
                  onPageChange={handlePageChange}
                  zoom={zoom}
                  onZoomChange={handleZoomChange}
                />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
