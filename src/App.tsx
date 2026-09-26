import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/Landing';
import { WorkspacePage } from './pages/Workspace';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/repository/:owner/:repo" element={<WorkspacePage />} />
      <Route path="/repository/:owner/:repo/:tab" element={<WorkspacePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
