import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export function Home() {
  useEffect(() => {
    document.title = 'JUPITER SYSTEMS'
  }, [])
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー画像 */}
      <div className="relative h-64 bg-gradient-to-r from-jupiter-600 to-jupiter-400 overflow-hidden">
        <img 
          src="/images/header.jpg" 
          alt="ヘッダー画像"
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center 20%' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
      
      <div className="container-jupiter -mt-24 relative z-10 pb-12">
        {/* PROFILEセクション（全幅） */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* プロフィール画像 */}
            <div className="w-48 h-48 rounded-full bg-white shadow-lg -mt-24 border-4 border-white overflow-hidden">
              <img 
                src="/images/icon.jpg" 
                alt="プロフィール画像"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = `
                    <div class="w-full h-full bg-jupiter-100 flex items-center justify-center text-jupiter-500 text-6xl font-bold">木</div>
                  `;
                }}
              />
            </div>
            
            {/* 基本情報 */}
            <div className="flex-1 text-center md:text-left">
              <p className="text-xl text-gray-600 mb-4">
              木林ユピテル（き-ばやし）
              </p>
              <p className="text-gray-700 leading-relaxed max-w-2xl">
                一般成人済み男性。<br/>
                メインはクトゥルフ神話6版、たまにシノビガミとかソドワとか。<br/>
                立ち絵と部屋作りに狂いがち。<br/>
                戦闘もエモ展開も鬱展開もドンと来い。雑食気質なのでなんでも好き。
              </p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                <span className="px-3 py-1 bg-jupiter-50 text-jupiter-700 rounded-full text-sm">
                  TRPG
                </span>
                <span className="px-3 py-1 bg-jupiter-50 text-jupiter-700 rounded-full text-sm">
                  イラスト
                </span>
                <span className="px-3 py-1 bg-jupiter-50 text-jupiter-700 rounded-full text-sm">
                  Discord-Bot開発
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3カラムレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr_1fr] gap-6">
          {/* 左カラム: RULE BOOK's, SESSION, SCHEDULE */}
          <div className="space-y-6 order-2 lg:order-1">
            <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              <span className="border-b-2 border-gray-900 pb-1">▍RULE BOOK's</span>
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">クトゥルフ神話TRPG</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    基本ルールブック6版
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                  マレウスモンストロルム
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    キーパーコンパニオン
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    2010/2015サプリ
                  </span>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">シノビガミ</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    改訂版
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    斜歯忍群
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    私立御斎学園
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    比良坂機関
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    隠忍の血統
                  </span>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">その他</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    SW2.5 Ⅰ〜Ⅲ
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    マスカレイドスタイル v2.8
                  </span>
                </div>
              </div>
            </div>
          </div>
            
            {/* SESSIONセクション */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                <span className="border-b-2 border-gray-900 pb-1">▍SESSION</span>
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">対応形式</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm">
                      ☑️ テキセ
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm">
                      ☑️ ボイセ
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm">
                      ☑️ 半テキ
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">TOOL's</h3>
                  <div className="flex flex-wrap gap-2">
                    <a href="https://discord.com/" target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors">
                      Discord
                    </a>
                    <a href="https://ccfolia.com" target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors">
                      ココフォリア
                    </a>
                    <a href="https://iachara.com/" target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors">
                      いあきゃら
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            {/* SCHEDULEセクション */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                <span className="border-b-2 border-gray-900 pb-1">▍SCHEDULE</span>
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">平日：21:00〜25:00</p>
                <p className="text-gray-700">土日祝：10:00〜25:00</p>
              </div>
            </div>
          </div>
          
          {/* 中央カラム: PLAY STYLE & WORK PROJECT */}
          <div className="space-y-6 order-1 lg:order-2">
            {/* PLAY STYLEセクション */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                <span className="border-b-2 border-gray-900 pb-1">▍PLAY STYLE</span>
              </h2>
              <div className="space-y-3">
                <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden flex">
                  <div className="bg-jupiter-500 flex items-center justify-center text-white font-semibold" style={{width: '70%'}}>
                    <span>GM/KP 70%</span>
                  </div>
                  <div className="bg-teal-500 flex items-center justify-center text-white font-semibold flex-1">
                    <span>PL 30%</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <div className="space-y-2">
                  <div className="flex items-center h-7">
                    <div className="bg-gray-200 rounded-full h-full relative overflow-hidden" style={{width: '77%'}}>
                      <div className="bg-red-300 h-full rounded-full flex items-center px-3" style={{width: '100%'}}>
                        <span className="text-white text-sm font-semibold">戦闘</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center h-7">
                    <div className="bg-gray-200 rounded-full h-full relative overflow-hidden" style={{width: '100%'}}>
                      <div className="bg-gradient-to-r from-red-400 via-red-500 to-pink-400 h-full rounded-full flex items-center justify-between px-3 shadow-sm" style={{width: '100%'}}>
                        <span className="text-white text-sm font-semibold">推理/考察</span>
                        <span className="text-white text-xs font-semibold">＞大好き＜</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center h-7">
                    <div className="bg-gray-200 rounded-full h-full relative overflow-hidden" style={{width: '77%'}}>
                      <div className="bg-yellow-300 h-full rounded-full flex items-center px-3" style={{width: '60%'}}>
                        <span className="text-gray-700 text-sm font-semibold">恋愛</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center h-7">
                    <div className="bg-gray-200 rounded-full h-full relative overflow-hidden" style={{width: '77%'}}>
                      <div className="bg-yellow-300 h-full rounded-full flex items-center px-3" style={{width: '70%'}}>
                        <span className="text-gray-700 text-sm font-semibold">バディ</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center h-7">
                    <div className="bg-gray-200 rounded-full h-full relative overflow-hidden" style={{width: '77%'}}>
                      <div className="bg-yellow-300 h-full rounded-full flex items-center px-3" style={{width: '70%'}}>
                        <span className="text-gray-700 text-sm font-semibold">タイマン/ソロ</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center h-7">
                    <div className="bg-gray-200 rounded-full h-full relative overflow-hidden" style={{width: '77%'}}>
                      <div className="bg-yellow-300 h-full rounded-full flex items-center px-3" style={{width: '70%'}}>
                        <span className="text-gray-700 text-sm font-semibold">2PL</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center h-7">
                    <div className="bg-gray-200 rounded-full h-full relative overflow-hidden" style={{width: '77%'}}>
                      <div className="bg-red-300 h-full rounded-full flex items-center px-3" style={{width: '100%'}}>
                        <span className="text-white text-sm font-semibold">多人数(4PL〜)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center h-7">
                    <div className="bg-gray-200 rounded-full h-full relative overflow-hidden" style={{width: '77%'}}>
                      <div className="bg-orange-300 h-full rounded-full flex items-center px-3" style={{width: '80%'}}>
                        <span className="text-white text-sm font-semibold">秘匿</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center h-7">
                    <div className="bg-gray-200 rounded-full h-full relative overflow-hidden" style={{width: '77%'}}>
                      <div className="bg-orange-300 h-full rounded-full flex items-center px-3" style={{width: '80%'}}>
                        <span className="text-white text-sm font-semibold">PvP</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center h-7">
                    <div className="bg-gray-200 rounded-full h-full relative overflow-hidden" style={{width: '92%'}}>
                      <div className="bg-gradient-to-r from-red-400 to-red-500 h-full rounded-full flex items-center justify-between px-3 shadow-sm" style={{width: '100%'}}>
                        <span className="text-white text-sm font-semibold">鬱展開/ロスト</span>
                        <span className="text-white text-xs font-semibold">＞かかってこいや＜</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* WORK PROJECTセクション */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                <span className="border-b-2 border-gray-900 pb-1">▍WORK PROJECT</span>
              </h2>
              <div className="space-y-3">
                <Link 
                  to="/pdf2md" 
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-jupiter-600">
                    PDF→Markdown変換ツール
                  </h3>
                  <p className="text-sm text-gray-600">
                    高精度なPDFからMarkdownへの変換ツール
                  </p>
                </Link>
                
                <Link 
                  to="/character-display" 
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-jupiter-600">
                    Character Display
                  </h3>
                  <p className="text-sm text-gray-600">
                    TRPGキャラクターシート生成ツール
                  </p>
                </Link>
                
                <div className="block p-4 bg-gray-50 rounded-lg opacity-50">
                  <h3 className="font-semibold text-gray-500 mb-1">
                    その他のプロジェクト
                  </h3>
                  <p className="text-sm text-gray-400">
                    開発中...
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* 右カラム: LINK & TECH STACK */}
          <div className="space-y-6 order-3 lg:order-3">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                <span className="border-b-2 border-gray-900 pb-1">▍LINK</span>
              </h2>
              <div className="space-y-3">
                <a 
                  href="https://www.notion.so/CoC-6feb7e00714342caaabb0d6ddd9b6782" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900 mb-1">木林卓ハウスルール（CoC）</h3>
                </a>
                
                <a 
                  href="https://www.notion.so/b43ccba05dfe4befa88ddd77df2cd0e3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900 mb-1">所持シナリオ</h3>
                </a>
                
                <a 
                  href="https://www.notion.so/08474429d1ab4a2ca94014fe4c513460"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900 mb-1">通過済 / 通過予定シナリオ</h3>
                </a>
                
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <h3 className="font-semibold text-gray-800 mb-2">SNS & SHOP</h3>
                  <div className="space-y-2">
                    <a 
                      href="https://twitter.com/6m10cm"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <h4 className="font-semibold text-blue-900">Twitter (MAIN)</h4>
                    </a>
                    
                    <a 
                      href="https://twitter.com/6mm10cm_TRPG"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <h4 className="font-semibold text-blue-900">Twitter (TRPG)</h4>
                    </a>
                    
                    <a 
                      href="https://6m10cm.booth.pm/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors"
                    >
                      <h4 className="font-semibold text-pink-900">BOOTH</h4>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            {/* TECH STACK セクション */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                <span className="border-b-2 border-gray-900 pb-1">▍TECH STACK</span>
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Frontend</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                      React
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                      TypeScript
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                      Tailwind CSS
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Backend</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                      Python
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                      FastAPI
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                      Node.js
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Art</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                      CLIP STUDIO PAINT
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                      DaVinci Resolve
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Tools & Others</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                      Docker
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                      Git
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                      Discord.js
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                      Unity
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}