import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/instrument-sans/wght.css'
import '@fontsource/instrument-serif/latin-400.css'
import '@fontsource/instrument-serif/latin-400-italic.css'
import './stylesheets/system.css'
import './stylesheets/ambient.css'
import App from './App.tsx'
import { CustomCursor } from './components/ambient/CustomCursor'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <CustomCursor />
  </StrictMode>,
)
