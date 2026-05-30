/**
 * api.ts — client storage (localStorage) + Kommo data fetching (direct browser calls)
 * No Express backend needed — works entirely in the browser for GitHub Pages.
 */

import type { Client, KommoData } from '../types';
import { fetchKommoData } from './kommoApi';

const STORAGE_KEY = 'dashk_clients';

// ── localStorage helpers ──────────────────────────────────────────────────────

function readClients(): Client[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Client[];
  } catch { return []; }
}

function writeClients(clients: Client[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

// ── Clients CRUD ──────────────────────────────────────────────────────────────

export const clientsApi = {
  getAll: (): Promise<Client[]> =>
    Promise.resolve(readClients()),

  create: (data: Omit<Client, 'id' | 'createdAt'>): Promise<Client> => {
    const clients = readClients();
    const client: Client = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    clients.push(client);
    writeClients(clients);
    return Promise.resolve(client);
  },

  update: (id: string, data: Partial<Client>): Promise<Client> => {
    const clients = readClients();
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return Promise.reject(new Error('Cliente não encontrado'));
    clients[idx] = { ...clients[idx], ...data };
    writeClients(clients);
    return Promise.resolve(clients[idx]);
  },

  delete: (id: string): Promise<{ success: boolean }> => {
    writeClients(readClients().filter(c => c.id !== id));
    return Promise.resolve({ success: true });
  },

  saveStageNames: (id: string, stageNames: Record<string, string>): Promise<{ success: boolean }> => {
    const clients = readClients();
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return Promise.reject(new Error('Cliente não encontrado'));
    clients[idx] = { ...clients[idx], stageNames };
    writeClients(clients);
    return Promise.resolve({ success: true });
  },
};

// ── Kommo data ────────────────────────────────────────────────────────────────

export const kommoApi = {
  fetchAll: (clientId: string): Promise<KommoData> => {
    const clients = readClients();
    const client  = clients.find(c => c.id === clientId);
    if (!client) return Promise.reject(new Error('Cliente não encontrado'));
    return fetchKommoData(client.subdomain, client.token, client.stageNames ?? {});
  },
};
