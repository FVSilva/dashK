/**
 * api.ts
 *
 * Production (GitHub Pages):
 *   - Clients are AUTO-DISCOVERED from /data.json (synced by GitHub Actions).
 *     Anyone who opens the URL sees the dashboard — no setup needed.
 *   - Stage name overrides are stored in localStorage per subdomain.
 *
 * Development / backend (VITE_API_URL set):
 *   - Clients are stored in localStorage (manual Add Client flow).
 *   - Data is fetched via the Express proxy.
 */

import type { Client, KommoData } from '../types';
import { fetchKommoData } from './kommoApi';

const STORAGE_KEY       = 'dashk_clients';
const STAGE_KEY_PREFIX  = 'dashk_stages_';

// True when running on GitHub Pages (static build, no backend URL configured)
const IS_STATIC = !import.meta.env.DEV && !import.meta.env.VITE_API_URL;

// ── localStorage helpers ──────────────────────────────────────────────────────

function readClients(): Client[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Client[]; }
  catch { return []; }
}

function writeClients(clients: Client[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

function readStageNames(id: string): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STAGE_KEY_PREFIX + id) ?? '{}'); }
  catch { return {}; }
}

// ── Auto-discover clients from data.json (production) ────────────────────────

async function discoverClients(): Promise<Client[]> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data.json?t=${Date.now()}`);
    if (!res.ok) return [];
    const data = await res.json() as Record<string, KommoData>;
    // Each key in data.json is a subdomain → becomes a "client"
    return Object.entries(data).map(([subdomain, kd]) => ({
      id: subdomain,                               // subdomain IS the ID in static mode
      name: kd.account?.name ?? subdomain,
      subdomain,
      token: '',                                   // not needed for reading static data
      createdAt: kd.lastSync ?? new Date().toISOString(),
    }));
  } catch { return []; }
}

// ── Clients CRUD ──────────────────────────────────────────────────────────────

export const clientsApi = {
  /** In production: auto-discover from data.json. In dev: read localStorage. */
  getAll: (): Promise<Client[]> =>
    IS_STATIC ? discoverClients() : Promise.resolve(readClients()),

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

  /** Saves stage name overrides in localStorage (works in both modes). */
  saveStageNames: (id: string, stageNames: Record<string, string>): Promise<{ success: boolean }> => {
    localStorage.setItem(STAGE_KEY_PREFIX + id, JSON.stringify(stageNames));
    return Promise.resolve({ success: true });
  },
};

// ── Kommo data ────────────────────────────────────────────────────────────────

export const kommoApi = {
  fetchAll: (clientId: string): Promise<KommoData> => {
    const stageNames = readStageNames(clientId);

    if (IS_STATIC) {
      // clientId = subdomain in static mode
      return fetchKommoData(clientId, '', stageNames);
    }

    // Dev / backend mode: look up client in localStorage
    const client = readClients().find(c => c.id === clientId);
    if (!client) return Promise.reject(new Error('Cliente não encontrado'));
    return fetchKommoData(
      client.subdomain,
      client.token,
      { ...stageNames, ...(client.stageNames ?? {}) },
    );
  },
};
