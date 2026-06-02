/**
 * Cloudflare Worker — Kommo CORS Proxy
 *
 * Accepts:  POST /api/kommo/sync  { subdomain, token, stageNames? }
 * Returns:  KommoData JSON  (same shape as data.json / Express proxy)
 *
 * Deploy once, then set VITE_API_URL = https://<worker>.workers.dev
 * in GitHub Secrets → rebuild the app → done.
 * No per-client configuration ever needed again.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ── Kommo API helper ──────────────────────────────────────────────────────────

async function kommoGet(subdomain, token, endpoint, params = {}) {
  const url = new URL(`https://${subdomain}.kommo.com/api/v4/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 204) return null;

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg  = body.detail || body.title || body.message || `HTTP ${res.status}`;
    const err  = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ── Leads (paginated) ─────────────────────────────────────────────────────────

async function fetchAllLeads(subdomain, token) {
  const all = [];
  let page = 1;
  while (true) {
    const data  = await kommoGet(subdomain, token, 'leads', { page, limit: 250, with: 'loss_reason' });
    const leads = data?._embedded?.leads ?? [];
    all.push(...leads);
    if (leads.length < 250) break;
    page++;
    // small delay between pages to be polite to the API
    await new Promise(r => setTimeout(r, 150));
  }
  return all;
}

// ── Users ─────────────────────────────────────────────────────────────────────

async function fetchAllUsers(subdomain, token) {
  const data = await kommoGet(subdomain, token, 'users', { limit: 250 });
  return data?._embedded?.users ?? [];
}

// ── Pipelines ─────────────────────────────────────────────────────────────────

const WON_ID  = 142;
const LOST_ID = 143;

function statusType(sid, lead) {
  if (sid === WON_ID)  return 142;
  if (sid === LOST_ID) return 143;
  if (lead.closed_at)  return lead.loss_reason_id !== null ? 143 : 142;
  return 0;
}

function buildSyntheticPipelines(leads) {
  const pmap = new Map();
  leads.forEach(lead => {
    const pid = lead.pipeline_id;
    if (!pmap.has(pid)) pmap.set(pid, { id: pid, statuses: new Map() });
    const p   = pmap.get(pid);
    const sid = lead.status_id;
    if (!p.statuses.has(sid)) {
      const type   = statusType(sid, lead);
      const active = [...p.statuses.values()].filter(s => s.type === 0).length;
      const sort   = type === 142 ? 9000 : type === 143 ? 9999 : (active + 1) * 10;
      p.statuses.set(sid, {
        id: sid,
        name:  type === 142 ? 'Ganho' : type === 143 ? 'Perdido' : `Etapa ${active + 1}`,
        sort, color: type === 142 ? '#22c55e' : type === 143 ? '#6b7280' : '#E5173F',
        type, pipeline_id: pid,
      });
    }
  });
  return [...pmap.values()].map((p, i) => ({
    id: p.id, name: `Pipeline ${i + 1}`, sort: (i + 1) * 10,
    is_main: i === 0, is_archive: false,
    _embedded: { statuses: [...p.statuses.values()] },
  }));
}

async function fetchPipelines(subdomain, token) {
  for (const [ep] of [
    ['pipelines'],
    ['account?with=pipelines'],
    ['leads/pipelines'],
  ]) {
    try {
      const data = await kommoGet(subdomain, token, ep, {});
      const val  = data?._embedded?.pipelines;
      if (val?.length) return val;
    } catch {}
  }
  return null;
}

// ── Loss reasons ──────────────────────────────────────────────────────────────

async function fetchLossReasons(subdomain, token) {
  try {
    const d = await kommoGet(subdomain, token, 'leads/loss_reasons', { limit: 250 });
    return d?._embedded?.loss_reasons ?? [];
  } catch { return []; }
}

function extractLossReasonsFromLeads(leads) {
  const map = new Map();
  leads.forEach(l => {
    const embedded = l._embedded?.loss_reason;
    if (!embedded) return;
    const reasons = Array.isArray(embedded) ? embedded : [embedded];
    reasons.forEach(r => { if (r?.id && r?.name && !map.has(r.id)) map.set(r.id, { id: r.id, name: r.name, sort: 0 }); });
  });
  return [...map.values()];
}

async function fetchLossReasonsByIds(subdomain, token, ids) {
  const results = await Promise.allSettled(
    ids.map(id => kommoGet(subdomain, token, `leads/loss_reasons/${id}`, {}))
  );
  return results
    .filter(r => r.status === 'fulfilled' && r.value?.id)
    .map(r => ({ id: r.value.id, name: r.value.name, sort: 0 }));
}

// ── Custom fields + account ───────────────────────────────────────────────────

async function fetchCustomFields(subdomain, token, entity) {
  try {
    const d = await kommoGet(subdomain, token, `${entity}/custom_fields`, { limit: 250 });
    return d?._embedded?.custom_fields ?? [];
  } catch { return []; }
}

async function fetchAccount(subdomain, token) {
  try { return await kommoGet(subdomain, token, 'account', {}); } catch { return null; }
}

// ── Main data fetch ───────────────────────────────────────────────────────────

async function fetchKommoData(subdomain, token) {
  const [leads, users, rawPipelines, leadFields, account, lossReasons] = await Promise.all([
    fetchAllLeads(subdomain, token),
    fetchAllUsers(subdomain, token),
    fetchPipelines(subdomain, token),
    fetchCustomFields(subdomain, token, 'leads'),
    fetchAccount(subdomain, token),
    fetchLossReasons(subdomain, token),
  ]);

  const pipelines = rawPipelines ?? buildSyntheticPipelines(leads);

  const embedded  = extractLossReasonsFromLeads(leads);
  const merged    = [...lossReasons];
  embedded.forEach(r => { if (!merged.find(x => x.id === r.id)) merged.push(r); });

  const knownIds   = new Set(merged.map(r => r.id));
  const missingIds = [...new Set(
    leads.filter(l => l.loss_reason_id && !knownIds.has(l.loss_reason_id)).map(l => l.loss_reason_id)
  )].slice(0, 20);

  if (missingIds.length > 0) {
    const fetched = await fetchLossReasonsByIds(subdomain, token, missingIds);
    fetched.forEach(r => { if (!merged.find(x => x.id === r.id)) merged.push(r); });
  }

  return {
    leads,
    users,
    pipelines,
    customFields: { leads: leadFields },
    account:      account ?? undefined,
    lossReasons:  merged,
    syntheticPipelines: rawPipelines === null,
    lastSync: new Date().toISOString(),
  };
}

// ── Worker entry point ────────────────────────────────────────────────────────

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const { subdomain, token } = body;

    if (!subdomain || !token) {
      return json({ error: 'Missing subdomain or token' }, 400);
    }

    try {
      const data = await fetchKommoData(subdomain, token);
      return json(data);
    } catch (err) {
      const status =
        err.status === 401 ? 401 :
        err.status === 403 ? 403 :
        err.status === 404 ? 404 : 500;
      return json({ error: err.message }, status);
    }
  },
};
