import { Link } from 'react-router-dom'
import { useEffect } from 'react'

export function Home() {
  useEffect(() => {
    document.title = 'JUPITER SYSTEMS'
  }, [])
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container-jupiter py-8">
        {/* ヒーローセクション - Pinterest風シンプル */}
        <section className="text-center py-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to JUPITER SYSTEMS
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            高精度なPDF処理ツールとTRPG支援システムを提供
          </p>
        </section>

        {/* ツールグリッド - Pinterest風カード */}
        <section className="py-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Available Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* PDF to Markdown カード */}
            <Link 
              to="/pdf2md" 
              className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="aspect-video bg-jupiter-50 flex items-center justify-center">
                <svg className="w-16 h-16 text-jupiter-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-jupiter-600 transition-colors">
                  PDF to Markdown
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  PDFファイルを高精度でMarkdown形式に変換します。
                  日本語対応、レイアウト解析機能付き。
                </p>
              </div>
            </Link>

            {/* Character Display カード */}
            <Link 
              to="/character-display" 
              className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="aspect-video bg-jupiter-50 flex items-center justify-center">
                <svg className="w-16 h-16 text-jupiter-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-jupiter-600 transition-colors">
                  Character Display
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  TRPGキャラクターのビジュアル表示ツール。
                  カスタマイズ可能なキャラクターカード生成。
                </p>
              </div>
            </Link>

            {/* Coming Soon カード */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm opacity-60">
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-500 mb-2">
                  More Tools
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  さらに便利なツールを開発中です。
                  ご期待ください。
                </p>
                <span className="inline-block mt-3 text-xs text-gray-400 font-medium uppercase tracking-wider">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* フィーチャーセクション - Pinterest風シンプル */}
        <section className="py-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-jupiter-50 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-jupiter-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">セキュアな処理</h3>
              <p className="text-sm text-gray-600">エンドツーエンド暗号化でデータを保護</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-jupiter-50 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-jupiter-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">高速処理</h3>
              <p className="text-sm text-gray-600">最適化されたアルゴリズムで快適な処理速度</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-jupiter-50 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-jupiter-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">日本語完全対応</h3>
              <p className="text-sm text-gray-600">縦書き・横書き混在のレイアウトも正確に解析</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}