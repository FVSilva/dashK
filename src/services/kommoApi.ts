/**
 * kommoApi.ts
 *
 * Dev mode  → Vite proxies /api → Express on localhost:3001 (real-time)
 * Production (GitHub Pages) → reads /dashK/data.json (synced by GitHub Actions)
 * Production with VITE_API_URL set → uses backend proxy (optional Render fallback)
 */

import type { KommoData } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

// ── Backend proxy (dev + optional Render) ─────────────────────────────────────

async function fetchViaProxy(
  subdomain: string,
  token: string,
  stageNames: Record<string, string>,
): Promise<KommoData> {
  const res = await fetch(`${API_BASE}/api/kommo/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subdomain, token, stageNames }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    const hint =
      res.status === 401 ? 'Token inválido ou expirado.' :
      res.status === 403 ? 'Sem permissão. Verifique as permissões do token.' :
      res.status === 404 ? 'Conta não encontrada. Verifique o subdomínio.' :
      err.error ?? `HTTP ${res.status}`;
    throw new Error(hint);
  }
  return res.json();
}

// ── Static data.json (GitHub Pages) ──────────────────────────────────────────

async function fetchStatic(subdomain: string): Promise<KommoData> {
  const url = `${import.meta.env.BASE_URL}data.json`;
  const res = await fetch(`${url}?t=${Date.now()}`); // bust browser cache
  if (!res.ok) {
    throw new Error(
      'Dados ainda não sincronizados. Vá em Actions → "Sync Kommo Data" → Run workflow.'
    );
  }
  const all = await res.json() as Record<string, KommoData>;
  const data = all[subdomain];
  if (!data) {
    throw new Error(
      `Sem dados para "${subdomain}". Execute o workflow de sincronização no GitHub Actions.`
    );
  }
  return data;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchKommoData(
  subdomain: string,
  token: string,
  stageNames: Record<string, string> = {},
): Promise<KommoData> {
  // Local dev → Vite proxies /api → Express (real-time, no CORS)
  if (import.meta.env.DEV) {
    return fetchViaProxy(subdomain, token, stageNames);
  }
  // Production with explicit backend URL (e.g. Render)
  if (API_BASE) {
    return fetchViaProxy(subdomain, token, stageNames);
  }
  // Production on GitHub Pages → static data.json (synced by GitHub Actions)
  return fetchStatic(subdomain);
}
