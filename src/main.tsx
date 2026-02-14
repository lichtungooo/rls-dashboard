import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
// import App from './App'  // Original mit react-leaflet (funktioniert nicht mit React 19)
// import App from './AppSimple'  // Test-Version mit react-grid-layout
// import App from './AppModular'  // Modulares Dashboard im Real-Life-Stack Stil
import App from './AppClean'  // Clean: Separate floating controls, kein Balken

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
