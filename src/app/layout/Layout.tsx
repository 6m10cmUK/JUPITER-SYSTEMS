import { Outlet, Link, useLocation } from 'react-router-dom'
import { ToolsMenu } from './ToolsMenu'
import { Footer } from '../../shared/ui/Footer'
import { useMemo, useRef } from 'react'
import { APP_HEADER_H_VAR } from '../../shared/lib/cssVars'
import { useHeightVar } from '../../shared/lib/useHeightVar'

export function Layout() {
  const location = useLocation()
  const headerRef = useRef<HTMLElement>(null)
  useHeightVar(headerRef, APP_HEADER_H_VAR)
  
  const pageTitle = useMemo(() => {
    const path = location.pathname
    if (path === '/pdf2md') return 'JUPITER SYSTEMS / Scenario PDF Reader'
    if (path === '/character-display-generator') return 'JUPITER SYSTEMS / Character Display'
    return 'JUPITER SYSTEMS'
  }, [location.pathname])
  
  return (
    <div className="min-h-screen flex flex-col">
      <header ref={headerRef} className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex justify-between items-center gap-3">
            <Link to="/" className="no-underline min-w-0">
              <h1 className="text-jupiter-500 text-lg sm:text-2xl font-bold truncate">{pageTitle}</h1>
            </Link>
            <div className="flex items-center gap-3 shrink-0">
              <ToolsMenu />
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