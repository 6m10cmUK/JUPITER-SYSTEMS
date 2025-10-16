import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import { Layout } from './components/Layout/Layout'
import { Home } from './pages/Home'
import { PDF2MD } from './pages/PDF2MD'
import CharacterDisplayGenerator from './pages/CharacterDisplayGenerator'
import DiscordObs from './pages/DiscordObs'

function NotFound() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>404 - Page Not Found</h1>
      <p>申し訳ありませんが、お探しのページは見つかりませんでした。</p>
      <a href="/" style={{ color: '#007bff', textDecoration: 'none' }}>
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
      </Routes>
    </Router>
  )
}

export default App