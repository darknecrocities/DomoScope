import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';

// When running inside Anna (sub-path host) or file/relative environment, use HashRouter
const isSubpathOrAnna =
  typeof window !== 'undefined' &&
  (window.location.pathname.includes('/anna-apps/') ||
   window.location.protocol === 'file:' ||
   import.meta.env.BASE_URL === './');

const Router = isSubpathOrAnna ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>
);
