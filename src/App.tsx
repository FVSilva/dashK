import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { TopBar } from './components/layout/TopBar';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-bg-primary">
          <TopBar />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/client/:id" element={<DashboardPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
