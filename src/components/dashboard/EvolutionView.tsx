import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import type { CumulativeTrendPoint, Pipeline, Lead, LossReason } from '../../types';
import { computeCumulativeTrend, computeLossReasonAnalysis } from '../../utils/analytics';
import { formatCurrency } from '../../utils/formatters';
import { TrendingUp, DollarSign, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  leads: Lead[];
  pipelines: Pipeline[];
  lossReasons: LossReason[];
  pipelineName: string;
}

function KPIMini({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-xl p-4 flex-1">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function CumTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const cum = payload.filter(p => p.name.startsWith('cum'));
  const monthly = payload.filter(p => !p.name.startsWith('cum'));
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)] min-w-[180px]">
      <p className="text-xs text-text-muted mb-2">{label}</p>
      {cum.map(p => (
        <div key={p.name} className="flex justify-between gap-4 items-center">
          <span className="text-xs text-text-secondary">
            {p.name === 'cumTotal' ? 'Total acum.' : p.name === 'cumWon' ? 'Ganhos acum.' : p.name === 'cumLost' ? 'Perdidos acum.' : p.name}
          </span>
          <span className="text-xs font-semibold text-text-primary">{p.value}</span>
        </div>
      ))}
      {monthly.length > 0 && <div className="border-t border-border-subtle mt-2 pt-2">
        {monthly.map(p => (
          <div key={p.name} className="flex justify-between gap-4 items-center">
            <span className="text-xs text-text-muted">
              {p.name === 'total' ? 'Novos no mês' : p.name === 'won' ? 'Ganhos no mês' : 'Perdidos no mês'}
            </span>
            <span className="text-xs text-text-primary">{p.value}</span>
          </div>
        ))}
      </div>}
    </div>
  );
}

function MonthlyTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const rev = payload.find(p => p.name === 'revenue');
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
      <p className="text-xs text-text-muted mb-2">{label}</p>
      {payload.filter(p => p.name !== 'revenue').map(p => (
        <div key={p.name} className="flex justify-between gap-4 items-center">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-xs text-text-secondary">
              {p.name === 'total' ? 'Novos' : p.name === 'won' ? 'Ganhos' : 'Perdidos'}
            </span>
          </div>
          <span className="text-xs font-semibold text-text-primary">{p.value}</span>
        </div>
      ))}
      {rev && (
        <div className="border-t border-border-subtle mt-2 pt-2 flex justify-between gap-4">
          <span className="text-xs text-text-muted">Receita</span>
          <span className="text-xs font-semibold text-brand-red">{formatCurrency(rev.value)}</span>
        </div>
      )}
    </div>
  );
}

const LOSS_COLORS = ['#E5173F', '#c41f3a', '#a81c34', '#8c1a2e', '#701628', '#541222'];

export function EvolutionView({ leads, pipelines, lossReasons, pipelineName }: Props) {
  const cumData = computeCumulativeTrend(leads, pipelines);
  const lossStats = computeLossReasonAnalysis(leads, lossReasons, pipelines);
  const lostTotal = lossStats.reduce((s, r) => s + r.count, 0);

  if (cumData.length < 2) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted text-sm">
        Dados insuficientes para análise de evolução
      </div>
    );
  }

  const last = cumData[cumData.length - 1];
  const monthlyData = cumData.map(p => ({
    ...p,
    month: p.month.slice(5) + '/' + p.month.slice(2, 4),
  }));

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="flex gap-3 flex-wrap">
        <KPIMini label="Total acumulado" value={String(last.cumTotal)} color="#E5173F" />
        <KPIMini label="Ganhos acumulados" value={String(last.cumWon)} color="#22c55e"
          sub={`${last.cumTotal > 0 ? ((last.cumWon / last.cumTotal) * 100).toFixed(1) : 0}% do total`} />
        <KPIMini label="Perdidos acumulados" value={String(last.cumLost)} color="#6b7280" />
        <KPIMini label="Receita acumulada" value={formatCurrency(last.cumRevenue)} color="#E5173F"
          sub={`Ticket médio: ${last.cumWon > 0 ? formatCurrency(last.cumRevenue / last.cumWon) : 'R$ 0'}`} />
      </div>

      {/* Cumulative area chart */}
      <div className="bg-bg-card border border-border-default rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border-default">
          <TrendingUp size={15} className="text-brand-red" />
          <h2 className="text-sm font-semibold text-text-primary">Evolução Acumulada — {pipelineName}</h2>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gCumTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E5173F" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#E5173F" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCumWon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCumLost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6b7280" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 10 }} axisLine={{ stroke: '#1e1e1e' }} tickLine={false} />
              <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
              <Tooltip content={<CumTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 12, fontSize: 11, color: '#666' }}
                formatter={v => v === 'cumTotal' ? 'Total' : v === 'cumWon' ? 'Ganhos' : 'Perdidos'} />
              <Area type="monotone" dataKey="cumTotal" stroke="#E5173F" strokeWidth={2} fill="url(#gCumTotal)" dot={false} />
              <Area type="monotone" dataKey="cumWon" stroke="#22c55e" strokeWidth={1.5} fill="url(#gCumWon)" dot={false} />
              <Area type="monotone" dataKey="cumLost" stroke="#6b7280" strokeWidth={1.5} fill="url(#gCumLost)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-card border border-border-default rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border-default">
            <CheckCircle size={15} className="text-brand-red" />
            <h2 className="text-sm font-semibold text-text-primary">Novos Leads por Mês</h2>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 10 }} axisLine={{ stroke: '#1e1e1e' }} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                <Tooltip content={<MonthlyTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="total" fill="#E5173F" radius={[4, 4, 0, 0]} maxBarSize={32} name="total" />
                <Bar dataKey="won" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} name="won" />
                <Bar dataKey="lost" fill="#374151" radius={[4, 4, 0, 0]} maxBarSize={32} name="lost" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Loss reasons */}
        <div className="bg-bg-card border border-border-default rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
            <div className="flex items-center gap-2">
              <XCircle size={15} className="text-brand-red" />
              <h2 className="text-sm font-semibold text-text-primary">Motivos de Perda</h2>
            </div>
            <span className="text-xs text-text-muted">{lostTotal} perdidos</span>
          </div>
          <div className="p-6">
            {lossStats.length === 0 || lostTotal === 0 ? (
              <div className="flex items-center justify-center h-40 text-text-muted text-sm">
                Nenhum motivo de perda registrado
              </div>
            ) : (
              <div className="space-y-2">
                {lossStats.slice(0, 10).map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-text-secondary truncate">{r.name}</span>
                        <span className="text-xs font-semibold text-text-primary ml-2 flex-shrink-0">{r.count}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${r.percentage}%`, backgroundColor: LOSS_COLORS[i % LOSS_COLORS.length] }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-text-muted w-9 text-right flex-shrink-0">{r.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Revenue evolution */}
      <div className="bg-bg-card border border-border-default rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border-default">
          <DollarSign size={15} className="text-brand-red" />
          <h2 className="text-sm font-semibold text-text-primary">Receita Acumulada</h2>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E5173F" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#E5173F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 10 }} axisLine={{ stroke: '#1e1e1e' }} tickLine={false} />
              <YAxis
                tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} width={70}
                tickFormatter={v => formatCurrency(v).replace('R$', 'R$')}
              />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Receita acumulada']}
                contentStyle={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#666' }} itemStyle={{ color: '#E5173F' }} />
              <Area type="monotone" dataKey="cumRevenue" stroke="#E5173F" strokeWidth={2} fill="url(#gRevenue)" dot={false} name="cumRevenue" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
