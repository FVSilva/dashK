import type { Client, KommoData } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const clientsApi = {
  getAll: () => request<Client[]>('/clients'),
  create: (data: Omit<Client, 'id' | 'createdAt'>) =>
    request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Client>) =>
    request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/clients/${id}`, { method: 'DELETE' }),
  saveStageNames: (id: string, stageNames: Record<string, string>) =>
    request<{ success: boolean }>(`/clients/${id}/stage-names`, { method: 'PUT', body: JSON.stringify(stageNames) }),
};

export const kommoApi = {
  fetchAll: (clientId: string) =>
    request<KommoData>(`/kommo/${clientId}/all`),
};
