import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for offline caching of travel documents & Quran in production builds
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  try {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('Nouvelle version EVA Voyages disponible');
      },
      onOfflineReady() {
        console.log('Application EVA Voyages prête pour consultation hors-ligne');
      },
    });
  } catch (err) {
    console.warn('PWA SW registration skipped:', err);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
