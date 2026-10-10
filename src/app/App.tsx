import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './styles/App.css'
import { Layout } from './layout/Layout'
import { Home } from '../features/home'
import { PDF2MD } from '../pages/PDF2MD'
import CharacterDisplayGenerator from '../features/character-display'
import DiscordObs from '../features/discord-obs'
import Juno from '../features/juno'

function NotFound() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>404 - Page Not Found</h1>
      <p>申し訳ありませんが、お探しのページは見つかりませんでした。</p>
      <a href="/" className="text-jupiter-500 hover:text-jupiter-600">
        ホームに戻る
      </a>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />} errorElement={<div>エラーが発生しました</div>}>
          <Route index element={<Home />} />
          <Route path="pdf2md" element={<PDF2MD />} />
          <Route path="character-display-generator" element={<CharacterDisplayGenerator />} />
          <Route path="discord-obs" element={<DiscordObs />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="juno" element={<Juno />} />
      </Routes>
    </Router>
  )
}

export default App