const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ clients: [] }, null, 2));
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── Clients CRUD ──────────────────────────────────────────────────────────────

app.get('/api/clients', (req, res) => {
  const { clients } = readData();
  res.json(clients);
});

app.post('/api/clients', (req, res) => {
  const data = readData();
  const client = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    ...req.body,
  };
  data.clients.push(client);
  writeData(data);
  res.json(client);
});

app.put('/api/clients/:id', (req, res) => {
  const data = readData();
  const idx = data.clients.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Client not found' });
  data.clients[idx] = { ...data.clients[idx], ...req.body };
  writeData(data);
  res.json(data.clients[idx]);
});

app.delete('/api/clients/:id', (req, res) => {
  const data = readData();
  data.clients = data.clients.filter(c => c.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

// Save custom stage/pipeline names (stageNames: { "p_ID": "name", "s_ID": "name" })
app.put('/api/clients/:id/stage-names', (req, res) => {
  const data = readData();
  const idx = data.clients.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.clients[idx].stageNames = req.body;
  writeData(data);
  res.json({ success: true });
});

// ── Kommo helpers ─────────────────────────────────────────────────────────────

async function kommoGet(subdomain, token, endpoint, params = {}) {
  const url = `https://${subdomain}.kommo.com/api/v4/${endpoint}`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return response.data;
}

async function fetchAllLeads(subdomain, token) {
  const all = [];
  let page = 1;
  while (true) {
    const data = await kommoGet(subdomain, token, 'leads', {
      page,
      limit: 250,
      with: 'loss_reason',
    });
    const leads = data?._embedded?.leads || [];
    all.push(...leads);
    if (leads.length < 250) break;
    page++;
    await new Promise(r => setTimeout(r, 200));
  }
  return all;
}

async function fetchAllUsers(subdomain, token) {
  const data = await kommoGet(subdomain, token, 'users', { limit: 250 });
  return data?._embedded?.users || [];
}

// Kommo system-wide reserved status IDs
const KOMMO_WON_STATUS_ID = 142;
const KOMMO_LOST_STATUS_ID = 143;

function getStatusType(statusId, lead) {
  if (statusId === KOMMO_WON_STATUS_ID) return 142;
  if (statusId === KOMMO_LOST_STATUS_ID) return 143;
  // Heuristic for non-system statuses: use closed_at + loss_reason_id
  if (lead.closed_at) return lead.loss_reason_id !== null ? 143 : 142;
  return 0;
}

// Build synthetic pipelines from lead data when the endpoint is unavailable
function buildSyntheticPipelines(leads) {
  const pipelineMap = new Map();
  // Track active stage sort order (won/lost always go last)
  const stageSortMap = new Map(); // pipelineId -> nextSort

  leads.forEach(lead => {
    const pid = lead.pipeline_id;
    if (!pipelineMap.has(pid)) {
      pipelineMap.set(pid, { id: pid, statuses: new Map() });
      stageSortMap.set(pid, 10);
    }
    const p = pipelineMap.get(pid);
    const sid = lead.status_id;
    if (!p.statuses.has(sid)) {
      const type = getStatusType(sid, lead);
      const activeCount = Array.from(p.statuses.values()).filter(s => s.type === 0).length;
      const sort = type === 142 ? 9000 : type === 143 ? 9999 : (activeCount + 1) * 10;
      p.statuses.set(sid, {
        id: sid,
        name: type === 142 ? 'Ganho' : type === 143 ? 'Perdido' : `Etapa ${activeCount + 1}`,
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

// Decode JWT payload without verification (for extracting api_domain)
function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch { return null; }
}

async function fetchPipelinesWithNames(subdomain, token) {
  // 1. Try standard endpoint
  try {
    const data = await kommoGet(subdomain, token, 'pipelines', { limit: 250 });
    const pipelines = data?._embedded?.pipelines;
    if (pipelines?.length) return pipelines;
  } catch {}

  // 2. Try account endpoint with pipeline embed
  try {
    const data = await kommoGet(subdomain, token, 'account', { with: 'leads_statuses_pipeline' });
    const statuses = data?._embedded?.leads_statuses_pipeline;
    if (statuses?.length) return statuses;
  } catch {}

  // 3. Try fetching individual pipeline by known ID (fast — single request)
  try {
    const jwtPayload = decodeJwtPayload(token);
    const accountId = jwtPayload?.account_id;
    if (accountId) {
      const data = await kommoGet(subdomain, token, `pipelines/${accountId}`, {});
      if (data?.id) return [data];
    }
  } catch {}

  // 4. Try leads/pipelines non-standard endpoint
  try {
    const data = await kommoGet(subdomain, token, 'leads/pipelines', { limit: 250 });
    const pipelines = data?._embedded?.pipelines;
    if (pipelines?.length) return pipelines;
  } catch {}

  // 5. Try account endpoint with pipelines embed
  try {
    const data = await kommoGet(subdomain, token, 'account', { with: 'pipelines' });
    const pipelines = data?._embedded?.pipelines;
    if (pipelines?.length) return pipelines;
  } catch {}

  return null; // all attempts failed — use synthetic
}

async function fetchLossReasons(subdomain, token) {
  try {
    const data = await kommoGet(subdomain, token, 'leads/loss_reasons', { limit: 250 });
    return data?._embedded?.loss_reasons || [];
  } catch { return []; }
}

// Extract loss reason names embedded in leads (via with=loss_reason)
function extractLossReasonsFromLeads(leads) {
  const map = new Map();
  leads.forEach(lead => {
    const embedded = lead._embedded?.loss_reason;
    if (!embedded) return;
    const reasons = Array.isArray(embedded) ? embedded : [embedded];
    reasons.forEach(r => {
      if (r?.id && r?.name && !map.has(r.id)) {
        map.set(r.id, { id: r.id, name: r.name, sort: 0 });
      }
    });
  });
  return Array.from(map.values());
}

// Fetch individual loss reasons by ID (fallback when list endpoint fails)
async function fetchLossReasonsByIds(subdomain, token, ids) {
  const results = await Promise.allSettled(
    ids.map(id => kommoGet(subdomain, token, `leads/loss_reasons/${id}`, {}))
  );
  return results
    .filter(r => r.status === 'fulfilled' && r.value?.id)
    .map(r => ({ id: r.value.id, name: r.value.name, sort: r.value.sort || 0 }));
}

async function fetchCustomFields(subdomain, token, entity) {
  try {
    const data = await kommoGet(subdomain, token, `${entity}/custom_fields`, { limit: 250 });
    return data?._embedded?.custom_fields || [];
  } catch {
    return [];
  }
}

async function fetchAccountInfo(subdomain, token) {
  try {
    return await kommoGet(subdomain, token, 'account', {});
  } catch { return null; }
}

// ── Kommo all-data endpoint ───────────────────────────────────────────────────

app.get('/api/kommo/:clientId/all', async (req, res) => {
  const { clients } = readData();
  const client = clients.find(c => c.id === req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const { subdomain, token } = client;

  try {
    const [leads, users, rawPipelines, leadCustomFields, accountInfo, lossReasons] = await Promise.all([
      fetchAllLeads(subdomain, token),
      fetchAllUsers(subdomain, token),
      fetchPipelinesWithNames(subdomain, token),
      fetchCustomFields(subdomain, token, 'leads'),
      fetchAccountInfo(subdomain, token),
      fetchLossReasons(subdomain, token),
    ]);

    // If pipelines endpoint failed, build synthetic structure from leads
    // Merge with any user-saved stage names from client config
    const savedStageNames = client.stageNames || {};
    let pipelines = rawPipelines !== null ? rawPipelines : buildSyntheticPipelines(leads);

    // Apply user-saved stage names to synthetic pipelines
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

    // Merge: dedicated endpoint → embedded in leads → individual ID fetches
    const embeddedLossReasons = extractLossReasonsFromLeads(leads);
    const mergedLossReasons = [...lossReasons];
    embeddedLossReasons.forEach(r => {
      if (!mergedLossReasons.find(x => x.id === r.id)) mergedLossReasons.push(r);
    });

    // If still missing names, fetch by individual ID
    const knownIds = new Set(mergedLossReasons.map(r => r.id));
    const missingIds = [...new Set(
      leads.filter(l => l.loss_reason_id && !knownIds.has(l.loss_reason_id)).map(l => l.loss_reason_id)
    )].slice(0, 20); // cap at 20 to avoid too many requests
    if (missingIds.length > 0) {
      const fetched = await fetchLossReasonsByIds(subdomain, token, missingIds);
      fetched.forEach(r => { if (!mergedLossReasons.find(x => x.id === r.id)) mergedLossReasons.push(r); });
    }

    res.json({
      leads,
      users,
      pipelines,
      customFields: { leads: leadCustomFields },
      account: accountInfo,
      lossReasons: mergedLossReasons,
      syntheticPipelines: rawPipelines === null,
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    const status = error.response?.status || 500;
    const responseData = error.response?.data;
    const message =
      (typeof responseData === 'object' && responseData !== null
        ? responseData.detail || responseData.title || responseData.message
        : typeof responseData === 'string'
        ? responseData
        : null) ||
      error.message ||
      'Erro ao conectar com a API do Kommo';

    const hint =
      status === 401 ? 'Token inválido ou expirado. Verifique o token de longa duração.' :
      status === 403 ? 'Sem permissão. Verifique as permissões do token.' :
      status === 404 ? 'Conta não encontrada. Verifique o subdomínio.' :
      null;

    console.error('[Kommo Error]', status, message);
    res.status(status).json({ error: hint || message, status });
  }
});

// ── Static (production) ───────────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n  ██████╗  █████╗ ███████╗██╗  ██╗██╗  ██╗`);
  console.log(`  ██╔══██╗██╔══██╗██╔════╝██║  ██║██║ ██╔╝`);
  console.log(`  ██║  ██║███████║███████╗███████║█████╔╝ `);
  console.log(`  ██║  ██║██╔══██║╚════██║██╔══██║██╔═██╗ `);
  console.log(`  ██████╔╝██║  ██║███████║██║  ██║██║  ██╗`);
  console.log(`  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝\n`);
  console.log(`  🚀 Server → http://localhost:${PORT}\n`);
});
