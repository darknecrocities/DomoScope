import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import './index.css';
import App, { isIframeOrAnna } from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const Router = isIframeOrAnna ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="DomoScope Application Error">
      <Router>
        <App />
      </Router>
    </ErrorBoundary>
  </StrictMode>
);
