import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { TopBar } from './components/layout/TopBar';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';

const STORAGE_KEY = 'dashk_clients';

/**
 * On first load, check for ?setup=<base64-client-json> in the URL.
 * If found, import the client into localStorage and clean the URL.
 * This allows a one-click setup link to be generated for any environment.
 */
function useAutoSetup() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('setup');
    if (!encoded) return;

    try {
      // URLSearchParams decodes '+' as space (application/x-www-form-urlencoded).
      // Restore '+' so base64 decoding works correctly.
      const fixed = encoded.replace(/ /g, '+');
      const client = JSON.parse(atob(fixed));
      if (!client?.id || !client?.subdomain || !client?.token) return;

      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as { id: string }[];
      if (!existing.find(c => c.id === client.id)) {
        existing.push(client);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      }
    } catch { /* invalid payload — ignore */ }

    // Remove the ?setup=... from the URL without reloading
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname + window.location.hash,
    );
    // Reload so AppContext picks up the new client
    window.location.reload();
  }, []);
}

// HashRouter works on any static host (GitHub Pages, etc.) — no server-side
// routing needed. URLs look like: https://fvsilva.github.io/dashK/#/client/123
export default function App() {
  useAutoSetup();

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
