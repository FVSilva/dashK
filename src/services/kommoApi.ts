/**
 * kommoApi.ts — direct browser calls to Kommo API v4
 * Replaces the Express proxy in server/index.js for the GitHub Pages build.
 */

import type { KommoData, Lead, User, Pipeline, CustomField, LossReason } from '../types';

const KOMMO_WON_STATUS_ID  = 142;
const KOMMO_LOST_STATUS_ID = 143;

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function kommoGet<T = unknown>(
  subdomain: string,
  token: string,
  endpoint: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const url = new URL(`https://${subdomain}.kommo.com/api/v4/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const message =
      (body.detail as string) ||
      (body.title  as string) ||
      (body.message as string) ||
      `HTTP ${res.status}`;

    const hint =
      res.status === 401 ? 'Token inválido ou expirado. Verifique o token de longa duração.' :
      res.status === 403 ? 'Sem permissão. Verifique as permissões do token.' :
      res.status === 404 ? 'Conta não encontrada. Verifique o subdomínio.' :
      message;

    const err = new Error(hint) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  return res.json() as Promise<T>;
}

// ── Leads (paginated) ─────────────────────────────────────────────────────────

async function fetchAllLeads(subdomain: string, token: string): Promise<Lead[]> {
  const all: Lead[] = [];
  let page = 1;

  while (true) {
    const data = await kommoGet<{ _embedded?: { leads?: Lead[] } }>(
      subdomain, token, 'leads', { page, limit: 250, with: 'loss_reason' }
    );
    const leads = data._embedded?.leads ?? [];
    all.push(...leads);
    if (leads.length < 250) break;
    page++;
    await new Promise(r => setTimeout(r, 200));
  }

  return all;
}

// ── Users ─────────────────────────────────────────────────────────────────────

async function fetchAllUsers(subdomain: string, token: string): Promise<User[]> {
  const data = await kommoGet<{ _embedded?: { users?: User[] } }>(
    subdomain, token, 'users', { limit: 250 }
  );
  return data._embedded?.users ?? [];
}

// ── Synthetic pipeline builder (fallback when /pipelines is unavailable) ──────

function getStatusType(statusId: number, lead: Lead): number {
  if (statusId === KOMMO_WON_STATUS_ID)  return 142;
  if (statusId === KOMMO_LOST_STATUS_ID) return 143;
  if (lead.closed_at) return lead.loss_reason_id !== null ? 143 : 142;
  return 0;
}

function buildSyntheticPipelines(leads: Lead[]): Pipeline[] {
  const pipelineMap = new Map<number, {
    id: number;
    statuses: Map<number, { id: number; name: string; sort: number; color: string; type: number; pipeline_id: number }>;
  }>();

  leads.forEach(lead => {
    const pid = lead.pipeline_id;
    if (!pipelineMap.has(pid)) pipelineMap.set(pid, { id: pid, statuses: new Map() });

    const p = pipelineMap.get(pid)!;
    const sid = lead.status_id;
    if (!p.statuses.has(sid)) {
      const type       = getStatusType(sid, lead);
      const active     = Array.from(p.statuses.values()).filter(s => s.type === 0).length;
      const sort       = type === 142 ? 9000 : type === 143 ? 9999 : (active + 1) * 10;
      p.statuses.set(sid, {
        id: sid,
        name:  type === 142 ? 'Ganho' : type === 143 ? 'Perdido' : `Etapa ${active + 1}`,
        sort,
        color: type === 142 ? '#22c55e' : type === 143 ? '#6b7280' : '#E5173F',
        type,
        pipeline_id: pid,
      });
    }
  });

  return Array.from(pipelineMap.values()).map((p, i) => ({
    id: p.id,
    name: `Pipeline ${i + 1}`,
    sort: (i + 1) * 10,
    is_main: i === 0,
    is_archive: false,
    _embedded: { statuses: Array.from(p.statuses.values()) },
  }));
}

// ── JWT decode (browser-safe, no verification) ────────────────────────────────

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch { return null; }
}

// ── Pipelines (multiple fallback strategies) ──────────────────────────────────

async function fetchPipelinesWithNames(subdomain: string, token: string): Promise<Pipeline[] | null> {
  // 1. Standard endpoint
  try {
    const data = await kommoGet<{ _embedded?: { pipelines?: Pipeline[] } }>(
      subdomain, token, 'pipelines', { limit: 250 }
    );
    if (data._embedded?.pipelines?.length) return data._embedded.pipelines;
  } catch { /* try next */ }

  // 2. Account endpoint with pipeline embed
  try {
    const data = await kommoGet<{ _embedded?: { leads_statuses_pipeline?: Pipeline[] } }>(
      subdomain, token, 'account', { with: 'leads_statuses_pipeline' }
    );
    if (data._embedded?.leads_statuses_pipeline?.length) return data._embedded.leads_statuses_pipeline;
  } catch { /* try next */ }

  // 3. Individual pipeline by account_id from JWT
  try {
    const jwt = decodeJwtPayload(token);
    if (jwt?.account_id) {
      const data = await kommoGet<Pipeline>(subdomain, token, `pipelines/${jwt.account_id}`, {});
      if (data?.id) return [data];
    }
  } catch { /* try next */ }

  // 4. Non-standard leads/pipelines endpoint
  try {
    const data = await kommoGet<{ _embedded?: { pipelines?: Pipeline[] } }>(
      subdomain, token, 'leads/pipelines', { limit: 250 }
    );
    if (data._embedded?.pipelines?.length) return data._embedded.pipelines;
  } catch { /* try next */ }

  // 5. Account with pipelines embed
  try {
    const data = await kommoGet<{ _embedded?: { pipelines?: Pipeline[] } }>(
      subdomain, token, 'account', { with: 'pipelines' }
    );
    if (data._embedded?.pipelines?.length) return data._embedded.pipelines;
  } catch { /* try next */ }

  return null; // all attempts failed — caller builds synthetic
}

// ── Loss reasons ──────────────────────────────────────────────────────────────

async function fetchLossReasons(subdomain: string, token: string): Promise<LossReason[]> {
  try {
    const data = await kommoGet<{ _embedded?: { loss_reasons?: LossReason[] } }>(
      subdomain, token, 'leads/loss_reasons', { limit: 250 }
    );
    return data._embedded?.loss_reasons ?? [];
  } catch { return []; }
}

function extractLossReasonsFromLeads(leads: Lead[]): LossReason[] {
  const map = new Map<number, LossReason>();
  leads.forEach(lead => {
    const embedded = (lead as Lead & { _embedded?: { loss_reason?: LossReason | LossReason[] } })
      ._embedded?.loss_reason;
    if (!embedded) return;
    const reasons = Array.isArray(embedded) ? embedded : [embedded];
    reasons.forEach(r => {
      if (r?.id && r?.name && !map.has(r.id)) map.set(r.id, { id: r.id, name: r.name, sort: 0 });
    });
  });
  return Array.from(map.values());
}

async function fetchLossReasonsByIds(subdomain: string, token: string, ids: number[]): Promise<LossReason[]> {
  const results = await Promise.allSettled(
    ids.map(id => kommoGet<LossReason>(subdomain, token, `leads/loss_reasons/${id}`, {}))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<LossReason> => r.status === 'fulfilled' && !!r.value?.id)
    .map(r => ({ id: r.value.id, name: r.value.name, sort: 0 }));
}

// ── Custom fields ─────────────────────────────────────────────────────────────

async function fetchCustomFields(subdomain: string, token: string, entity: string): Promise<CustomField[]> {
  try {
    const data = await kommoGet<{ _embedded?: { custom_fields?: CustomField[] } }>(
      subdomain, token, `${entity}/custom_fields`, { limit: 250 }
    );
    return data._embedded?.custom_fields ?? [];
  } catch { return []; }
}

// ── Account info ──────────────────────────────────────────────────────────────

async function fetchAccountInfo(
  subdomain: string,
  token: string,
): Promise<{ name: string; currency: string; currency_symbol: string } | null> {
  try {
    return await kommoGet<{ name: string; currency: string; currency_symbol: string }>(
      subdomain, token, 'account', {}
    );
  } catch { return null; }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function fetchKommoData(
  subdomain: string,
  token: string,
  savedStageNames: Record<string, string> = {},
): Promise<KommoData> {
  const [leads, users, rawPipelines, leadCustomFields, accountInfo, lossReasons] = await Promise.all([
    fetchAllLeads(subdomain, token),
    fetchAllUsers(subdomain, token),
    fetchPipelinesWithNames(subdomain, token),
    fetchCustomFields(subdomain, token, 'leads'),
    fetchAccountInfo(subdomain, token),
    fetchLossReasons(subdomain, token),
  ]);

  // Pipelines: real data or synthetic fallback
  let pipelines = rawPipelines !== null ? rawPipelines : buildSyntheticPipelines(leads);

  // Apply saved custom names to synthetic pipelines
  if (rawPipelines === null && Object.keys(savedStageNames).length > 0) {
    pipelines = pipelines.map(p => ({
      ...p,
      name: savedStageNames[`p_${p.id}`] || p.name,
      _embedded: {
        statuses: p._embedded.statuses.map(s => ({
          ...s,
          name: savedStageNames[`s_${s.id}`] || s.name,
        })),
      },
    }));
  }

  // Merge loss reasons from all sources
  const embeddedReasons = extractLossReasonsFromLeads(leads);
  const merged = [...lossReasons];
  embeddedReasons.forEach(r => { if (!merged.find(x => x.id === r.id)) merged.push(r); });

  // Fetch any still-missing loss reason names individually
  const knownIds   = new Set(merged.map(r => r.id));
  const missingIds = [...new Set(
    leads
      .filter(l => l.loss_reason_id && !knownIds.has(l.loss_reason_id))
      .map(l => l.loss_reason_id!)
  )].slice(0, 20);

  if (missingIds.length > 0) {
    const fetched = await fetchLossReasonsByIds(subdomain, token, missingIds);
    fetched.forEach(r => { if (!merged.find(x => x.id === r.id)) merged.push(r); });
  }

  return {
    leads,
    users,
    pipelines,
    customFields: { leads: leadCustomFields },
    account: accountInfo ?? undefined,
    lossReasons: merged,
    syntheticPipelines: rawPipelines === null,
    lastSync: new Date().toISOString(),
  };
}
