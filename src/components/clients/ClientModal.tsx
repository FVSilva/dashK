import { useState, useEffect } from 'react';
import { KeyRound, Globe, User2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';
import type { Client } from '../../types';

interface ClientModalProps {
  open: boolean;
  onClose: () => void;
  editing?: Client | null;
}

interface FormState {
  name: string;
  subdomain: string;
  token: string;
}

function Field({
  label, icon, error, ...props
}: {
  label: string; icon: React.ReactNode; error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{icon}</div>
        <input
          className="w-full bg-bg-elevated border border-border-subtle rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/30 transition-all"
          {...props}
        />
      </div>
      {error && <p className="text-xs text-brand-red">{error}</p>}
    </div>
  );
}

export function ClientModal({ open, onClose, editing }: ClientModalProps) {
  const { addClient, updateClient } = useApp();
  const [form, setForm] = useState<FormState>({ name: '', subdomain: '', token: '' });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({ name: editing.name, subdomain: editing.subdomain, token: editing.token });
    } else {
      setForm({ name: '', subdomain: '', token: '' });
    }
    setErrors({});
  }, [editing, open]);

  function validate(): boolean {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = 'Nome é obrigatório';
    if (!form.subdomain.trim()) e.subdomain = 'Subdomínio é obrigatório';
    else if (form.subdomain.includes('.')) e.subdomain = 'Apenas o subdomínio, sem ".kommo.com"';
    if (!form.token.trim()) e.token = 'Token é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (editing) {
        await updateClient(editing.id, form);
      } else {
        await addClient(form);
      }
      onClose();
    } catch (err) {
      setErrors({ token: err instanceof Error ? err.message : 'Erro ao salvar' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar Cliente' : 'Novo Cliente'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Nome do Cliente"
          icon={<User2 size={14} />}
          placeholder="Ex: Empresa XYZ"
          value={form.name}
          error={errors.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <Field
          label="Subdomínio Kommo"
          icon={<Globe size={14} />}
          placeholder="Ex: minhaempresa"
          value={form.subdomain}
          error={errors.subdomain}
          onChange={e => setForm(f => ({ ...f, subdomain: e.target.value.toLowerCase().trim() }))}
        />
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Token de Longa Duração
          </label>
          <div className="relative">
            <div className="absolute left-3 top-3 text-text-muted">
              <KeyRound size={14} />
            </div>
            <textarea
              rows={3}
              placeholder="Cole aqui o access token..."
              value={form.token}
              onChange={e => setForm(f => ({ ...f, token: e.target.value.trim() }))}
              className="w-full bg-bg-elevated border border-border-subtle rounded-lg pl-9 pr-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/30 transition-all font-mono resize-none"
            />
          </div>
          {errors.token && <p className="text-xs text-brand-red">{errors.token}</p>}
        </div>

        <div className="p-3 rounded-lg bg-brand-red-subtle border border-brand-red-border">
          <p className="text-xs text-text-secondary leading-relaxed">
            <span className="text-brand-red font-medium">Dica:</span> No Kommo, vá em{' '}
            <span className="text-text-primary font-mono">Configurações → Integrações → API</span>{' '}
            para gerar seu token de longa duração.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="flex-1">
            {editing ? 'Salvar Alterações' : 'Adicionar Cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
