import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import './index.css'
import 'prosemirror-view/style/prosemirror.css'
import App from './App.tsx'
import { convex } from './convex'

// StrictMode を無効化（P2P WebRTC の useEffect が2回起動してpeerIdが重複するため）
createRoot(document.getElementById('root')!).render(
  <ConvexAuthProvider client={convex}>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </ConvexAuthProvider>,
)
