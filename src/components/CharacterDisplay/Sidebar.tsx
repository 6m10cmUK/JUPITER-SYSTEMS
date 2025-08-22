import React, { useState } from 'react';

interface SidebarProps {
  activeTab: 'theme' | 'settings';
  onTabChange: (tab: 'theme' | 'settings') => void;
  children: {
    theme: React.ReactNode;
    settings: React.ReactNode;
  };
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div 
      className={`
        bg-white dark:bg-gray-800 
        shadow-xl 
        transition-all duration-300 ease-in-out
        relative flex flex-col
        ${isCollapsed ? 'w-16' : 'w-[400px]'}
      `}
    >
      {/* 折りたたみボタン */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-8 z-20 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-all hover:scale-110"
        aria-label={isCollapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
      >
        <svg
          className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      
      {/* サイドバーコンテンツ */}
      <div className={`${isCollapsed ? 'invisible opacity-0' : 'visible opacity-100'} transition-all duration-300 flex flex-col h-full`}>
        {/* タブヘッダー */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onTabChange('theme')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'theme'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              テーマ
            </div>
          </button>
          <button
            onClick={() => onTabChange('settings')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              設定
            </div>
          </button>
        </div>
        
        {/* タブコンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className={activeTab === 'theme' ? 'block' : 'hidden'}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                テーマ選択
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                画像の背景やスタイルを選択できます
              </p>
            </div>
            {children.theme}
          </div>
          
          <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                キャラクター設定
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                立ち絵や表情差分、テキストを設定します
              </p>
            </div>
            {children.settings}
          </div>
        </div>
      </div>
      
      {/* 折りたたみ時のアイコン表示 */}
      {isCollapsed && (
        <div className="flex flex-col items-center justify-center h-full gap-8">
          <button
            onClick={() => {
              setIsCollapsed(false);
              onTabChange('theme');
            }}
            className={`p-3 rounded-lg transition-colors ${
              activeTab === 'theme' 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
            title="テーマ"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </button>
          <button
            onClick={() => {
              setIsCollapsed(false);
              onTabChange('settings');
            }}
            className={`p-3 rounded-lg transition-colors ${
              activeTab === 'settings' 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
            title="設定"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;