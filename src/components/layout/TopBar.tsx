import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, BarChart3 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function TopBar() {
  const location = useLocation();
  const { clients } = useApp();
  const pathParts = location.pathname.split('/').filter(Boolean);
  const isClientPage = pathParts[0] === 'client' && pathParts[1];
  const client = isClientPage ? clients.find(c => c.id === pathParts[1]) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-bg-primary/90 backdrop-blur-md">
      <div className="flex items-center justify-between h-14 px-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-brand-red flex items-center justify-center shadow-red-glow-sm group-hover:shadow-red-glow transition-all">
              <BarChart3 size={14} className="text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-text-primary">
              Dash<span className="text-brand-red">K</span>
            </span>
          </Link>

          {client && (
            <>
              <ChevronRight size={14} className="text-text-muted" />
              <nav className="flex items-center gap-1.5">
                <Link to="/" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Clientes
                </Link>
                <ChevronRight size={12} className="text-text-muted" />
                <span className="text-sm text-text-primary font-medium">{client.name}</span>
              </nav>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-elevated border border-border-default">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse-red" />
            <span className="text-xs text-text-secondary font-mono">Kommo Analytics</span>
          </div>
        </div>
      </div>
    </header>
  );
}
