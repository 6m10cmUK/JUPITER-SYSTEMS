import { useEffect } from 'react'

export function Home() {
  useEffect(() => {
    document.title = 'JUPITER SYSTEMS'
  }, [])
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container-jupiter py-8">
        {/* 一時的に空のコンテンツ */}
      </main>
    </div>
  )
}