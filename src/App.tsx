import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import { Layout } from './components/Layout/Layout'
import { Home } from './pages/Home'
import { PDF2MD } from './pages/PDF2MD'
import CharacterDisplay from './pages/CharacterDisplay'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="pdf2md" element={<PDF2MD />} />
          <Route path="character-display" element={<CharacterDisplay />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App