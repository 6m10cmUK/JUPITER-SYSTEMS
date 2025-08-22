import { Outlet, Link, useLocation } from 'react-router-dom'
import { Auth } from '../Auth'
import { Footer } from '../Footer'
import { useState, useMemo } from 'react'
import type { User } from 'firebase/auth'

export function Layout() {
  const [, setUser] = useState<User | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  
  const pageTitle = useMemo(() => {
    const path = location.pathname
    if (path === '/profile') return 'JUPITER SYSTEMS / Profile'
    if (path === '/pdf2md') return 'JUPITER SYSTEMS / PDF→Markdown'
    if (path === '/character-display') return 'JUPITER SYSTEMS / Character Display'
    return 'JUPITER SYSTEMS'
  }, [location.pathname])
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button 
                className="flex flex-col justify-between w-8 h-6 group"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="メニューを開く"
              >
                <span className="w-full h-0.5 bg-gray-700 rounded-full transition-all"></span>
                <span className="w-full h-0.5 bg-gray-700 rounded-full transition-all"></span>
                <span className="w-full h-0.5 bg-gray-700 rounded-full transition-all"></span>
              </button>
              <Link to="/" className="no-underline">
                <h1 className="text-jupiter-500 text-2xl font-bold">{pageTitle}</h1>
              </Link>
            </div>
            <div className="flex items-center">
              <Auth onAuthChange={setUser} />
            </div>
          </div>
        </div>
      </header>
      
      {/* サイドメニュー */}
      <div className={`fixed top-0 left-0 h-screen w-80 bg-white shadow-2xl transform transition-transform duration-300 z-[100] ${
        isMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-semibold m-0 text-gray-900">Menu</h2>
          <button 
            className="text-gray-700 text-3xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            onClick={() => setIsMenuOpen(false)}
            aria-label="メニューを閉じる"
          >
            ×
          </button>
        </div>
        <nav className="p-4">
          <Link 
            to="/" 
            className={`block px-6 py-3 rounded-lg mb-2 font-medium transition-all ${
              location.pathname === '/' 
                ? 'bg-jupiter-500 text-white' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            Home
          </Link>
          <Link 
            to="/profile" 
            className={`block px-6 py-3 rounded-lg mb-2 font-medium transition-all ${
              location.pathname === '/profile' 
                ? 'bg-jupiter-500 text-white' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            Profile
          </Link>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-4 ml-4">Tools</h3>
            <Link 
              to="/pdf2md" 
              className={`block px-6 py-3 rounded-lg mb-2 font-medium transition-all ${
                location.pathname === '/pdf2md' 
                  ? 'bg-jupiter-500 text-white' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              PDF→Markdown
            </Link>
            <Link 
              to="/character-display" 
              className={`block px-6 py-3 rounded-lg mb-2 font-medium transition-all ${
                location.pathname === '/character-display' 
                  ? 'bg-jupiter-500 text-white' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Character Display
            </Link>
          </div>
        </nav>
      </div>
      
      {/* オーバーレイ */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[99] animate-fade-in"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
      
      <div className="flex-1 w-full">
        <Outlet />
      </div>
      
      <Footer />
    </div>
  )
}