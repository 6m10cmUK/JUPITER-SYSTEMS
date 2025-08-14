import React, { useState } from 'react';

const CharacterDisplayTest: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex h-screen">
        {/* サイドバー */}
        <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-blue-500 text-white transition-all duration-300 overflow-hidden`}>
          <div className="p-4">
            <h2 className="text-xl font-bold">サイドバー</h2>
            <p>ここにメニューが入ります</p>
          </div>
        </div>
        
        {/* 開閉ボタン */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="bg-red-500 text-white p-2 h-12"
        >
          {isSidebarOpen ? '閉じる' : '開く'}
        </button>
        
        {/* メインコンテンツ */}
        <div className="flex-1 bg-white p-8">
          <h1 className="text-2xl font-bold">メインコンテンツ</h1>
          <p>ここにプレビューが表示されます</p>
        </div>
      </div>
    </div>
  );
};

export default CharacterDisplayTest;