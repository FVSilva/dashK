#!/usr/bin/env node
/**
 * scripts/sync.js
 * Fetches all Kommo data and writes it to public/data.json.
 * Run by GitHub Actions on a schedule — no CORS restriction on the server.
 *
 * Required env vars:
 *   KOMMO_SUBDOMAIN  — e.g. "mycompany"
 *   KOMMO_TOKEN      — long-lived Kommo API JWT token
 */

const fs   = require('fs');
const path = require('path');

const subdomain = process.env.KOMMO_SUBDOMAIN;
const token     = process.env.KOMMO_TOKEN;

if (!subdomain || !token) {
  console.error('❌  KOMMO_SUBDOMAIN and KOMMO_TOKEN must be set');
  process.exit(1);
}

// ── HTTP helper (native fetch, Node 18+) ─────────────────────────────────────

async function kommoGet(endpoint, params = {}) {
  const url = new URL(`https://${subdomain}.kommo.com/api/v4/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg  = body.detail || body.title || body.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

// ── Leads (paginated) ─────────────────────────────────────────────────────────

async function fetchAllLeads() {
  const all = [];
  let page = 1;
  while (true) {
    const data  = await kommoGet('leads', { page, limit: 250, with: 'loss_reason' });
    const leads = data?._embedded?.leads ?? [];
    all.push(...leads);
    if (leads.length < 250) break;
    page++;
    await new Promise(r => setTimeout(r, 200));
  }
  return all;
}

// ── Users ─────────────────────────────────────────────────────────────────────

async function fetchAllUsers() {
  const data = await kommoGet('users', { limit: 250 });
  return data?._embedded?.users ?? [];
}

// ── Pipelines (multiple fallback strategies) ──────────────────────────────────

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

async function fetchPipelines() {
  for (const [ep, key] of [
    ['pipelines', '_embedded.pipelines'],
    ['account?with=pipelines', '_embedded.pipelines'],
    ['leads/pipelines', '_embedded.pipelines'],
  ]) {
    try {
      const data = await kommoGet(ep, {});
      const val  = key.split('.').reduce((o, k) => o?.[k], data);
      if (val?.length) return val;
    } catch {}
  }
  return null;
}

// ── Loss reasons ──────────────────────────────────────────────────────────────

async function fetchLossReasons() {
  try {
    const d = await kommoGet('leads/loss_reasons', { limit: 250 });
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

async function fetchLossReasonsByIds(ids) {
  const results = await Promise.allSettled(ids.map(id => kommoGet(`leads/loss_reasons/${id}`, {})));
  return results.filter(r => r.status === 'fulfilled' && r.value?.id)
    .map(r => ({ id: r.value.id, name: r.value.name, sort: 0 }));
}

// ── Custom fields + account ───────────────────────────────────────────────────

async function fetchCustomFields(entity) {
  try {
    const d = await kommoGet(`${entity}/custom_fields`, { limit: 250 });
    return d?._embedded?.custom_fields ?? [];
  } catch { return []; }
}

async function fetchAccount() {
  try { return await kommoGet('account', {}); } catch { return null; }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🔄  Syncing Kommo data for "${subdomain}"...`);

  const [leads, users, rawPipelines, leadFields, account, lossReasons] = await Promise.all([
    fetchAllLeads(),
    fetchAllUsers(),
    fetchPipelines(),
    fetchCustomFields('leads'),
    fetchAccount(),
    fetchLossReasons(),
  ]);

  const pipelines = rawPipelines ?? buildSyntheticPipelines(leads);

  const embedded = extractLossReasonsFromLeads(leads);
  const merged   = [...lossReasons];
  embedded.forEach(r => { if (!merged.find(x => x.id === r.id)) merged.push(r); });

  const knownIds   = new Set(merged.map(r => r.id));
  const missingIds = [...new Set(
    leads.filter(l => l.loss_reason_id && !knownIds.has(l.loss_reason_id)).map(l => l.loss_reason_id)
  )].slice(0, 20);
  if (missingIds.length > 0) {
    const fetched = await fetchLossReasonsByIds(missingIds);
    fetched.forEach(r => { if (!merged.find(x => x.id === r.id)) merged.push(r); });
  }

  const result = {
    leads,
    users,
    pipelines,
    customFields: { leads: leadFields },
    account: account ?? undefined,
    lossReasons: merged,
    syntheticPipelines: rawPipelines === null,
    lastSync: new Date().toISOString(),
  };

  // Write to public/data.json keyed by subdomain
  const outDir  = path.join(__dirname, '..', 'public');
  const outFile = path.join(outDir, 'data.json');

  fs.mkdirSync(outDir, { recursive: true });

  // Merge with existing data (preserve other subdomains if any)
  let existing = {};
  if (fs.existsSync(outFile)) {
    try { existing = JSON.parse(fs.readFileSync(outFile, 'utf-8')); } catch {}
  }
  existing[subdomain] = result;

  fs.writeFileSync(outFile, JSON.stringify(existing, null, 2));
  console.log(`✅  Saved ${leads.length} leads → public/data.json`);
}

main().catch(err => {
  console.error('❌  Sync failed:', err.message);
  process.exit(1);
});
