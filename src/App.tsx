import { Routes, Route, Navigate, useInRouterContext, HashRouter, BrowserRouter } from 'react-router-dom';
import { LandingPage } from './pages/Landing';
import { WorkspacePage } from './pages/Workspace';
import { SetupPage } from './pages/Setup';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Enforce HashRouter when running inside an iframe, Anna subpath host, or file/relative environment
export const isIframeOrAnna =
  typeof window !== 'undefined' &&
  (window.self !== window.top ||
   window.location.pathname.includes('/anna-apps/') ||
   window.location.protocol === 'file:' ||
   import.meta.env.BASE_URL === './');

export function AppRoutes() {
  return (
    <ErrorBoundary fallbackTitle="Application Error">
      <Routes>
        <Route
          path="/"
          element={
            <ErrorBoundary fallbackTitle="Landing Page Error">
              <LandingPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/setup"
          element={
            <ErrorBoundary fallbackTitle="Setup Page Error">
              <SetupPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/repository/:owner/:repo"
          element={
            <ErrorBoundary fallbackTitle="Workspace AST & Visualizer Error">
              <WorkspacePage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/repository/:owner/:repo/:tab"
          element={
            <ErrorBoundary fallbackTitle="Workspace AST & Visualizer Error">
              <WorkspacePage />
            </ErrorBoundary>
          }
        />
        {/*
          In iframe / subpath hosting, navigating to '/' via <Navigate to="/" replace />
          causes the outer browser or iframe to redirect to the domain root (404).
          Under Anna/iframe environments, render LandingPage directly to stay within subpath.
        */}
        <Route
          path="*"
          element={
            isIframeOrAnna ? (
              <ErrorBoundary fallbackTitle="Landing Page Error">
                <LandingPage />
              </ErrorBoundary>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}

export function App() {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <AppRoutes />;
  }

  const Router = isIframeOrAnna ? HashRouter : BrowserRouter;
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
