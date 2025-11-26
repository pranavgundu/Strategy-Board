import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Analytics
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

// PWA
import { registerSW } from 'virtual:pwa-register';

inject();
injectSpeedInsights();

registerSW({
  immediate: true,
  onOfflineReady() {
    console.log('PWA: Offline mode is now available!');
  },
  onNeedRefresh() {
    console.log('PWA: New content available, please refresh.');
  },
  onRegisterError(error) {
    console.error('PWA: Service worker registration failed:', error);
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
