import { useState, useEffect } from 'react'
import './App.css'
import { PDFUploader } from './components/PDFUploader'
import { PDFViewer } from './components/PDFViewer'
import { PageNavigator } from './components/PageNavigator'
import { TextExtractor } from './components/TextExtractor'
import { Footer } from './components/Footer'
import { Auth } from './components/Auth'
import { usePDF } from './hooks/usePDF'
import { PDFApiService } from './services/api'
import type { User } from 'firebase/auth'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [rotation] = useState(0)
  const [user, setUser] = useState<User | null>(null)
  
  const { pdf, numPages, isLoading, error, loadPDF } = usePDF()

  // ページ読み込み時にサーバーを起動させる
  useEffect(() => {
    const wakeUpServer = async () => {
      try {
        console.log('サーバーにping送信中...')
        await PDFApiService.checkHealth()
        console.log('サーバーが起動しました')
      } catch (error) {
        console.log('サーバーへの接続を試行中...', error)
      }
    }
    
    wakeUpServer()
  }, [])

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
        <div className="header-content">
          <h1>PDF to Markdown Converter</h1>
          <div className="header-actions">
            {file && (
              <button 
                onClick={() => setFile(null)} 
                className="new-file-button"
              >
                他のファイルを読み込む
              </button>
            )}
            <Auth onAuthChange={setUser} />
          </div>
        </div>
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
              <div className="content-container">
                <div className="pdf-section">
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
                </div>
                <div className="extractor-section">
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
      <Footer />
    </div>
  )
}

export default App
