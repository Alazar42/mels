import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import App from './App';

// Remove all traces of Webview (Inspect element, F12, DevTools shortcuts, default context menus)
if (typeof window !== 'undefined') {
  // Disable right-click context menu
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable DevTools shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U)
  window.addEventListener('keydown', (e) => {
    if (
      e.key === 'F12' ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
      ((e.ctrlKey || e.metaKey) && ['U', 'u'].includes(e.key))
    ) {
      e.preventDefault();
      return false;
    }
  });
}

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
