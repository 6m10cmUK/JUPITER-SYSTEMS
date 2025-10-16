import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export function ToolsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tools = [
    {
      path: '/pdf2md',
      name: 'PDF→Markdown',
      description: 'PDFをMarkdown形式に変換'
    },
    {
      path: '/character-display-generator',
      name: 'Character Display Generator',
      description: 'TRPGキャラクターシート生成'
    },
    {
      path: '/discord-obs',
      name: 'Discord Streamkit CSS Generator',
      description: 'Discord StreamkitをOBS用にカスタマイズ'
    }
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm border border-gray-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        Tools
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-fade-in">
          <div className="py-2">
            {tools.map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <div className="font-medium text-gray-900">{tool.name}</div>
                <div className="text-sm text-gray-500 mt-1">{tool.description}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}