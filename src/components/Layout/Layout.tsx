import { Outlet, Link, useLocation } from 'react-router-dom'
import { Auth } from '../Auth'
import { Footer } from '../Footer'
import { useState, useMemo } from 'react'
import type { User } from 'firebase/auth'

export function Layout() {
  const [, setUser] = useState<User | null>(null)
  const location = useLocation()
  
  const pageTitle = useMemo(() => {
    const path = location.pathname
    if (path === '/pdf2md') return 'JUPITER SYSTEMS / PDF→Markdown'
    if (path === '/character-display') return 'JUPITER SYSTEMS / Character Display'
    return 'JUPITER SYSTEMS'
  }, [location.pathname])
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex justify-between items-center">
            <Link to="/" className="no-underline">
              <h1 className="text-jupiter-500 text-2xl font-bold">{pageTitle}</h1>
            </Link>
            <div className="flex items-center">
              <Auth onAuthChange={setUser} />
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex-1 w-full">
        <Outlet />
      </div>
      
      <Footer />
    </div>
  )
}