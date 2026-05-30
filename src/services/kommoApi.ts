/**
 * kommoApi.ts — calls the backend /api/kommo/sync proxy.
 *
 * Why a proxy? Kommo's API does not send Access-Control-Allow-Origin headers,
 * so browsers (GitHub Pages, etc.) cannot call it directly. The Express server
 * proxies the request server-side, where CORS doesn't apply.
 *
 * Backend URL:
 *   - Dev:        '' (empty) → Vite proxies /api → localhost:3001
 *   - Production: VITE_API_URL env var → e.g. https://dashk.onrender.com
 */

import type { KommoData } from '../types';

// Injected at build time by Vite. Empty string = use relative /api path (dev proxy).
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export async function fetchKommoData(
  subdomain: string,
  token: string,
  savedStageNames: Record<string, string> = {},
): Promise<KommoData> {
  const res = await fetch(`${API_BASE}/api/kommo/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subdomain, token, stageNames: savedStageNames }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    const hint =
      res.status === 401 ? 'Token inválido ou expirado. Verifique o token de longa duração.' :
      res.status === 403 ? 'Sem permissão. Verifique as permissões do token.' :
      res.status === 404 ? 'Conta não encontrada. Verifique o subdomínio.' :
      err.error || `HTTP ${res.status}`;
    throw new Error(hint);
  }

  return res.json() as Promise<KommoData>;
}
