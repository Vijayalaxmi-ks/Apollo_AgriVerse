import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { FarmProvider } from './context/FarmContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FarmProvider>
      <App />
    </FarmProvider>
  </StrictMode>,
)
