import type {
  Lead, Pipeline, User, CustomField, CustomFieldValue,
  KPIData, StageMetric, UserMetric, StageTimeMetric, LeadTrendPoint, Insight,
  LossReason, LossReasonStat, CumulativeTrendPoint,
} from '../types';

function buildStatusSets(pipelines: Pipeline[]) {
  const wonIds = new Set<number>();
  const lostIds = new Set<number>();
  pipelines.forEach(p =>
    p._embedded.statuses.forEach(s => {
      if (s.type === 142) wonIds.add(s.id);
      if (s.type === 143) lostIds.add(s.id);
    })
  );
  return { wonIds, lostIds };
}

// Fallback classification when status types aren't available from API
function classifyLead(lead: Lead, wonIds: Set<number>, lostIds: Set<number>) {
  if (wonIds.has(lead.status_id)) return 'won';
  if (lostIds.has(lead.status_id)) return 'lost';
  // Fallback: use closed_at + loss_reason_id heuristic
  if (lead.closed_at) return lead.loss_reason_id !== null ? 'lost' : 'won';
  return 'active';
}

export function computeKPIs(leads: Lead[], pipelines: Pipeline[]): KPIData {
  const { wonIds, lostIds } = buildStatusSets(pipelines);

  const wonLeads = leads.filter(l => classifyLead(l, wonIds, lostIds) === 'won');
  const lostLeads = leads.filter(l => classifyLead(l, wonIds, lostIds) === 'lost');
  const activeLeads = leads.filter(l => classifyLead(l, wonIds, lostIds) === 'active');

  const totalRevenue = wonLeads.reduce((s, l) => s + (l.price || 0), 0);
  const closedCount = wonLeads.length + lostLeads.length;
  const conversionRate = closedCount > 0 ? (wonLeads.length / closedCount) * 100 : 0;

  const wonWithClose = wonLeads.filter(l => l.closed_at && l.created_at);
  const avgDaysToClose =
    wonWithClose.length > 0
      ? wonWithClose.reduce((s, l) => s + (l.closed_at! - l.created_at) / 86400, 0) /
        wonWithClose.length
      : 0;

  return {
    totalLeads: leads.length,
    activeLeads: activeLeads.length,
    wonLeads: wonLeads.length,
    lostLeads: lostLeads.length,
    conversionRate,
    totalRevenue,
    averageDealValue: wonLeads.length > 0 ? totalRevenue / wonLeads.length : 0,
    avgDaysToClose,
  };
}

export function computeStageMetrics(
  leads: Lead[],
  pipeline: Pipeline
): StageMetric[] {
  const statuses = [...pipeline._embedded.statuses].sort((a, b) => a.sort - b.sort);
  const totalActive = leads.filter(l => l.pipeline_id === pipeline.id).length || 1;

  return statuses.map(status => {
    const stageLeads = leads.filter(
      l => l.pipeline_id === pipeline.id && l.status_id === status.id
    );
    const count = stageLeads.length;
    const value = stageLeads.reduce((s, l) => s + (l.price || 0), 0);
    return {
      id: status.id,
      name: status.name,
      count,
      value,
      percentage: (count / totalActive) * 100,
      color: status.color || '#E5173F',
      type: status.type,
      sort: status.sort,
    };
  });
}

export function computeUserMetrics(
  leads: Lead[],
  users: User[],
  pipelines: Pipeline[]
): UserMetric[] {
  const { wonIds, lostIds } = buildStatusSets(pipelines);
  const now = Math.floor(Date.now() / 1000);

  return users
    .map(user => {
      const userLeads = leads.filter(l => l.responsible_user_id === user.id);
      const won = userLeads.filter(l => classifyLead(l, wonIds, lostIds) === 'won');
      const lost = userLeads.filter(l => classifyLead(l, wonIds, lostIds) === 'lost');
      const active = userLeads.filter(l => classifyLead(l, wonIds, lostIds) === 'active');
      const closed = won.length + lost.length;
      const totalRevenue = won.reduce((s, l) => s + (l.price || 0), 0);

      const wonWithDates = won.filter(l => l.closed_at && l.created_at);
      const avgDaysToClose =
        wonWithDates.length > 0
          ? wonWithDates.reduce((s, l) => s + (l.closed_at! - l.created_at) / 86400, 0) / wonWithDates.length
          : 0;

      const avgActiveDays =
        active.length > 0
          ? active.reduce((s, l) => s + (now - l.created_at) / 86400, 0) / active.length
          : 0;

      return {
        id: user.id,
        name: user.name,
        assigned: userLeads.length,
        won: won.length,
        lost: lost.length,
        active: active.length,
        conversionRate: closed > 0 ? (won.length / closed) * 100 : 0,
        totalRevenue,
        avgTicket: won.length > 0 ? totalRevenue / won.length : 0,
        avgDaysToClose,
        avgActiveDays,
      };
    })
    .filter(u => u.assigned > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export function computeBottlenecks(
  leads: Lead[],
  pipeline: Pipeline
): Array<{ stageId: number; name: string; count: number; severity: 'high' | 'medium' | 'low'; insight: string }> {
  const stages = computeStageMetrics(leads, pipeline).filter(s => s.type !== 142 && s.type !== 143);
  if (stages.length === 0) return [];

  const avgCount = stages.reduce((s, st) => s + st.count, 0) / stages.length;
  const results: ReturnType<typeof computeBottlenecks> = [];

  stages.forEach(stage => {
    if (stage.count === 0) return;
    const ratio = stage.count / avgCount;
    let severity: 'high' | 'medium' | 'low' = 'low';
    if (ratio > 2.5) severity = 'high';
    else if (ratio > 1.5) severity = 'medium';
    else return;

    results.push({
      stageId: stage.id,
      name: stage.name,
      count: stage.count,
      severity,
      insight:
        severity === 'high'
          ? `${stage.count} leads acumulados neste estágio — ${stage.percentage.toFixed(0)}% do funil está travado aqui.`
          : `Concentração acima da média (${stage.count} leads). Monitorar evolução.`,
    });
  });

  return results.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
}

export function computeCustomFieldDistribution(
  leads: Lead[],
  field: CustomField
): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();

  leads.forEach(lead => {
    const fv = lead.custom_fields_values?.find(
      (cf: CustomFieldValue) => cf.field_id === field.id
    );
    if (!fv) return;
    fv.values.forEach(v => {
      const key = String(v.value || '').trim();
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function computeStageTimeMetrics(
  leads: Lead[],
  pipeline: Pipeline
): StageTimeMetric[] {
  const now = Math.floor(Date.now() / 1000);
  const statuses = pipeline._embedded.statuses;

  return statuses.map(status => {
    const stageLeads = leads.filter(
      l => l.pipeline_id === pipeline.id && l.status_id === status.id
    );
    const count = stageLeads.length;
    const ages = stageLeads.map(l => (now - l.updated_at) / 86400);
    const avgAgeDays = count > 0 ? ages.reduce((s, a) => s + a, 0) / count : 0;
    const staleCount = ages.filter(a => a >= 30).length;
    const criticalCount = ages.filter(a => a >= 60).length;
    return {
      id: status.id,
      name: status.name,
      count,
      avgAgeDays,
      staleCount,
      criticalCount,
      type: status.type,
    };
  }).sort((a, b) => {
    const sa = statuses.find(s => s.id === a.id)?.sort ?? 0;
    const sb = statuses.find(s => s.id === b.id)?.sort ?? 0;
    return sa - sb;
  });
}

export function computeLeadTrend(
  leads: Lead[],
  pipelines: Pipeline[]
): LeadTrendPoint[] {
  const { wonIds, lostIds } = buildStatusSets(pipelines);
  const byMonth = new Map<string, { total: number; won: number; lost: number; revenue: number }>();

  leads.forEach(lead => {
    const ts = lead.created_at * 1000;
    const d = new Date(ts);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth.has(key)) byMonth.set(key, { total: 0, won: 0, lost: 0, revenue: 0 });
    const bucket = byMonth.get(key)!;
    bucket.total++;
    const cls = classifyLead(lead, wonIds, lostIds);
    if (cls === 'won') { bucket.won++; bucket.revenue += lead.price || 0; }
    if (cls === 'lost') bucket.lost++;
  });

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, v]) => ({ month, ...v }));
}

export function generateInsights(
  leads: Lead[],
  pipelines: Pipeline[],
  users: User[]
): Insight[] {
  const insights: Insight[] = [];
  const { wonIds, lostIds } = buildStatusSets(pipelines);

  const wonLeads = leads.filter(l => classifyLead(l, wonIds, lostIds) === 'won');
  const lostLeads = leads.filter(l => classifyLead(l, wonIds, lostIds) === 'lost');
  const activeLeads = leads.filter(l => classifyLead(l, wonIds, lostIds) === 'active');
  const closed = wonLeads.length + lostLeads.length;
  const convRate = closed > 0 ? (wonLeads.length / closed) * 100 : 0;

  // Conversion rate
  if (convRate < 20)
    insights.push({ type: 'critical', title: 'Taxa de conversão baixa', description: `Apenas ${convRate.toFixed(1)}% dos leads fechados foram ganhos. Revise o processo de qualificação.`, metric: `${convRate.toFixed(1)}%` });
  else if (convRate >= 50)
    insights.push({ type: 'success', title: 'Excelente conversão', description: `Taxa de ${convRate.toFixed(1)}% — performance acima da média do mercado.`, metric: `${convRate.toFixed(1)}%` });

  // Stale active leads
  const now = Math.floor(Date.now() / 1000);
  const stale30 = activeLeads.filter(l => (now - l.updated_at) / 86400 >= 30);
  if (stale30.length > 0) {
    const pct = ((stale30.length / activeLeads.length) * 100).toFixed(0);
    insights.push({ type: stale30.length > 10 ? 'critical' : 'warning', title: 'Leads sem movimentação', description: `${stale30.length} leads ativos (${pct}%) sem atualização há mais de 30 dias.`, metric: `${stale30.length} leads` });
  }

  // High-value stale leads
  const avgPrice = wonLeads.length > 0 ? wonLeads.reduce((s, l) => s + (l.price || 0), 0) / wonLeads.length : 0;
  const highValueStale = stale30.filter(l => (l.price || 0) > avgPrice * 1.5);
  if (highValueStale.length > 0)
    insights.push({ type: 'warning', title: 'Leads de alto valor parados', description: `${highValueStale.length} leads acima da média de valor sem movimentação recente.`, metric: `${highValueStale.length} leads` });

  // Bottlenecks per pipeline
  pipelines.forEach(pipeline => {
    const bottlenecks = computeBottlenecks(leads, pipeline);
    bottlenecks.filter(b => b.severity === 'high').forEach(b => {
      insights.push({ type: 'critical', title: `Gargalo em "${b.name}"`, description: b.insight, metric: `${b.count} leads` });
    });
  });

  // User performance spread
  const userMetrics = computeUserMetrics(leads, users, pipelines);
  if (userMetrics.length >= 2) {
    const best = userMetrics[0];
    const worst = userMetrics[userMetrics.length - 1];
    if (best.totalRevenue > worst.totalRevenue * 3)
      insights.push({ type: 'warning', title: 'Desempenho desequilibrado entre consultores', description: `${best.name} gerou ${(best.totalRevenue / (worst.totalRevenue || 1)).toFixed(1)}x mais receita que ${worst.name}. Considere redistribuir leads ou oferecer suporte.` });
  }

  // No won leads in last 30 days
  const recentWon = wonLeads.filter(l => l.closed_at && (now - l.closed_at) / 86400 < 30);
  if (wonLeads.length > 0 && recentWon.length === 0)
    insights.push({ type: 'warning', title: 'Nenhum fechamento nos últimos 30 dias', description: 'O pipeline não registrou ganhos recentes. Avalie os leads em etapas finais.' });
  else if (recentWon.length > 0)
    insights.push({ type: 'success', title: 'Fechamentos recentes', description: `${recentWon.length} deals fechados nos últimos 30 dias.`, metric: `${recentWon.length} deals` });

  // High loss rate
  if (lostLeads.length > wonLeads.length * 2 && closed > 10)
    insights.push({ type: 'critical', title: 'Volume alto de perdas', description: `${lostLeads.length} leads perdidos contra ${wonLeads.length} ganhos. Analise os motivos de perda.`, metric: `${lostLeads.length} perdidos` });

  return insights;
}

export function computeLossReasonAnalysis(
  leads: Lead[],
  lossReasons: LossReason[],
  pipelines: Pipeline[]
): LossReasonStat[] {
  const { lostIds } = buildStatusSets(pipelines);
  const lostLeads = leads.filter(l => classifyLead(l, new Set(), lostIds) === 'lost');
  const counts = new Map<number | null, number>();
  lostLeads.forEach(l => {
    const key = l.loss_reason_id;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const total = lostLeads.length || 1;
  return Array.from(counts.entries())
    .map(([id, count]) => {
      const reason = lossReasons.find(r => r.id === id);
      return {
        id,
        name: reason?.name || (id === null ? 'Sem motivo informado' : `Motivo #${id}`),
        count,
        percentage: (count / total) * 100,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function computeCumulativeTrend(
  leads: Lead[],
  pipelines: Pipeline[]
): CumulativeTrendPoint[] {
  const trend = computeLeadTrend(leads, pipelines);
  let cumTotal = 0, cumWon = 0, cumLost = 0, cumRevenue = 0;
  return trend.map(p => {
    cumTotal += p.total;
    cumWon += p.won;
    cumLost += p.lost;
    cumRevenue += p.revenue;
    return { ...p, cumTotal, cumWon, cumLost, cumRevenue };
  });
}

export function computeFunnelStages(
  leads: Lead[],
  pipeline: Pipeline
): Array<{ name: string; value: number; fill: string }> {
  const stages = computeStageMetrics(leads, pipeline)
    .filter(s => s.type === 0)
    .sort((a, b) => a.sort - b.sort);

  const CHART_COLORS = [
    '#E5173F', '#c41f3a', '#a81c34', '#8c1a2e',
    '#701628', '#541222', '#38101c', '#1c0e16',
  ];

  return stages
    .filter(s => s.count > 0)
    .map((s, i) => ({
      name: s.name,
      value: s.count,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
}
