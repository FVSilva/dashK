import { useState } from 'react';
import { Plus, Search, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ClientCard } from '../components/clients/ClientCard';
import { ClientModal } from '../components/clients/ClientModal';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import type { Client } from '../types';
import { Skeleton } from '../components/ui/Skeleton';

// True when deployed to GitHub Pages (no backend, clients come from data.json)
const IS_STATIC = !import.meta.env.DEV && !import.meta.env.VITE_API_URL;

export function HomePage() {
  const { clients, loadingClients, deleteClient, refreshClients } = useApp();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.subdomain.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete() {
    if (!deletingClient) return;
    setDeleting(true);
    try {
      await deleteClient(deletingClient.id);
      setDeletingClient(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Clientes</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {clients.length} {clients.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={13} />}
            onClick={refreshClients}
            loading={loadingClients}
          >
            Atualizar
          </Button>
          {!IS_STATIC && (
            <Button
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => { setEditingClient(null); setModalOpen(true); }}
            >
              Novo Cliente
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou subdomínio..."
          className="w-full max-w-sm bg-bg-card border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/30 transition-all"
        />
      </div>

      {/* Content */}
      {loadingClients ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-bg-card border border-border-default rounded-2xl p-5 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="w-12 h-12 rounded-xl" />
              </div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          {search ? (
            <>
              <Search size={40} className="text-text-muted mb-4" />
              <p className="text-text-primary font-medium">Nenhum resultado</p>
              <p className="text-text-muted text-sm mt-1">Tente outro termo de busca</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-brand-red-subtle border border-brand-red-border flex items-center justify-center mb-4">
                <Users size={28} className="text-brand-red" />
              </div>
              <p className="text-text-primary font-semibold text-lg mb-1">
                {IS_STATIC ? 'Nenhum dado disponível' : 'Nenhum cliente ainda'}
              </p>
              <p className="text-text-muted text-sm mb-6 max-w-xs">
                {IS_STATIC
                  ? 'Execute o workflow "Sync Kommo Data" no GitHub Actions para carregar os dados.'
                  : 'Adicione seu primeiro cliente para começar a visualizar o analytics do Kommo'}
              </p>
              {!IS_STATIC && (
                <Button
                  variant="primary"
                  icon={<Plus size={14} />}
                  onClick={() => setModalOpen(true)}
                >
                  Adicionar Cliente
                </Button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              onEdit={c => { setEditingClient(c); setModalOpen(true); }}
              onDelete={setDeletingClient}
            />
          ))}
        </div>
      )}

      <ClientModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingClient(null); }}
        editing={editingClient}
      />

      <Modal
        open={!!deletingClient}
        onClose={() => setDeletingClient(null)}
        title="Excluir cliente"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-950/30 border border-red-800/40">
            <AlertCircle size={16} className="text-brand-red mt-0.5 flex-shrink-0" />
            <p className="text-sm text-text-secondary">
              Tem certeza que deseja excluir{' '}
              <span className="text-text-primary font-medium">{deletingClient?.name}</span>?
              Esta ação não pode ser desfeita.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setDeletingClient(null)}>
              Cancelar
            </Button>
            <Button variant="danger" className="flex-1" loading={deleting} onClick={handleDelete}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
