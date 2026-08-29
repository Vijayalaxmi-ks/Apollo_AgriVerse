import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { FarmProvider } from './context/FarmContext';
import { SettingsProvider } from './context/SettingsContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <FarmProvider>
        <App />
      </FarmProvider>
    </SettingsProvider>
  </StrictMode>,
);
