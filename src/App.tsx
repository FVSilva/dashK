import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { TopBar } from './components/layout/TopBar';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';

// HashRouter works on any static host (GitHub Pages, etc.) — no server-side
// routing needed. URLs look like: https://fvsilva.github.io/dashK/#/client/123
export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <div className="min-h-screen bg-bg-primary">
          <TopBar />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/client/:id" element={<DashboardPage />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </AppProvider>
  );
}
