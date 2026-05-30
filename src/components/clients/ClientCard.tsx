import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, MoreVertical, Pencil, Trash2, Globe, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { clientColor, getInitials, formatRelative } from '../../utils/formatters';
import type { Client } from '../../types';

const IS_STATIC = !import.meta.env.DEV && !import.meta.env.VITE_API_URL;

interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const color = clientColor(client.name);
  const initials = getInitials(client.name);

  return (
    <div
      className={clsx(
        'group relative bg-bg-card border border-border-default rounded-2xl p-5 cursor-pointer',
        'hover:border-brand-red-border hover:shadow-card-hover transition-all duration-300',
        'animate-slide-up'
      )}
      onClick={() => navigate(`/client/${client.id}`)}
    >
      {/* Red left accent line */}
      <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-brand-red opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-red-glow-sm flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {initials}
        </div>

        {!IS_STATIC && (
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 bg-bg-elevated border border-border-subtle rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] py-1 min-w-[140px]">
                  <button
                    onClick={() => { onEdit(client); setMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  <div className="my-1 border-t border-border-default" />
                  <button
                    onClick={() => { onDelete(client); setMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:text-brand-red hover:bg-brand-red-subtle transition-colors"
                  >
                    <Trash2 size={13} /> Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1 mb-4">
        <h3 className="font-semibold text-text-primary text-base leading-tight group-hover:text-white transition-colors">
          {client.name}
        </h3>
        <div className="flex items-center gap-1.5 text-text-muted">
          <Globe size={11} />
          <span className="text-xs font-mono">{client.subdomain}.kommo.com</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-text-muted mb-4">
        <Calendar size={11} />
        <span className="text-xs">{formatRelative(client.createdAt)}</span>
      </div>

      <button
        onClick={e => { e.stopPropagation(); navigate(`/client/${client.id}`); }}
        className="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl bg-bg-elevated border border-border-subtle hover:border-brand-red-border hover:bg-brand-red-subtle text-text-secondary hover:text-brand-red text-sm font-medium transition-all group-hover:border-brand-red-border"
      >
        <BarChart2 size={14} />
        Ver Dashboard
      </button>
    </div>
  );
}
