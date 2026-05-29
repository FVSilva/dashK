import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  RefreshCw, ArrowLeft, TrendingUp, Users, CheckCircle,
  XCircle, DollarSign, Target, Clock, BarChart2, GitBranch,
  AlertTriangle, Layers, ChevronDown, Lightbulb, Timer, Activity,
  Edit3, Check, X, TrendingDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useKommoData } from '../hooks/useKommoData';
import { Button } from '../components/ui/Button';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import { KPICard } from '../components/dashboard/KPICard';
import { KanbanAnalysis } from '../components/dashboard/KanbanAnalysis';
import { FunnelAnalysisChart } from '../components/dashboard/FunnelChart';
import { UserPerformance } from '../components/dashboard/UserPerformance';
import { BottleneckAnalysis } from '../components/dashboard/BottleneckAnalysis';
import { CustomFieldsAnalysis } from '../components/dashboard/CustomFieldsAnalysis';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { StageTimeChart } from '../components/dashboard/StageTimeChart';
import { LeadTrendChart } from '../components/dashboard/LeadTrendChart';
import { InsightsPanel } from '../components/dashboard/InsightsPanel';
import { LossReasonChart } from '../components/dashboard/LossReasonChart';
import { EvolutionView } from '../components/dashboard/EvolutionView';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import {
  computeKPIs, computeStageMetrics, computeUserMetrics,
  computeBottlenecks, computeStageTimeMetrics, computeLeadTrend,
  generateInsights, computeLossReasonAnalysis,
} from '../utils/analytics';
import { formatCurrency, formatNumber, formatPercent, formatDays, formatRelative } from '../utils/formatters';
import { clientsApi } from '../services/api';
import type { Pipeline } from '../types';

type Tab = 'overview' | 'evolution';
interface DateRange { start: string; end: string; }

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, action, accent }: {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ElementType<any>;
  children: React.ReactNode;
  action?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-bg-card border border-border-default rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-default">
        <div className="flex items-center gap-2">
          <Icon size={14} className={accent ? '' : 'text-brand-red'} style={accent ? { color: accent } : {}} />
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Stage name editor modal ────────────────────────────────────────────────────
function StageNameEditor({ pipeline, onSave }: {
  pipeline: Pipeline;
  onSave: (names: Record<string, string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});

  const handleOpen = () => {
    const init: Record<string, string> = { [`p_${pipeline.id}`]: pipeline.name };
    pipeline._embedded.statuses.forEach(s => { init[`s_${s.id}`] = s.name; });
    setNames(init);
    setOpen(true);
  };

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded hover:bg-white/5"
      >
        <Edit3 size={11} />
        Renomear etapas
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-bg-elevated border border-border-subtle rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary">Renomear Pipeline e Etapas</h3>
          <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Nome do Pipeline</label>
            <input
              value={names[`p_${pipeline.id}`] || ''}
              onChange={e => setNames(n => ({ ...n, [`p_${pipeline.id}`]: e.target.value }))}
              className="w-full bg-bg-primary border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-red/60 transition-colors"
            />
          </div>
          <div className="border-t border-border-subtle pt-3">
            <p className="text-xs text-text-muted mb-2">Etapas</p>
            {pipeline._embedded.statuses.sort((a, b) => a.sort - b.sort).map(s => (
              <div key={s.id} className="mb-2">
                <label className="text-xs text-text-muted mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || '#555' }} />
                  {s.type === 142 ? 'Ganho' : s.type === 143 ? 'Perdido' : `Etapa ID ${s.id}`}
                </label>
                <input
                  value={names[`s_${s.id}`] || ''}
                  onChange={e => setNames(n => ({ ...n, [`s_${s.id}`]: e.target.value }))}
                  className="w-full bg-bg-primary border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-red/60 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-border-subtle">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="flex-1">Cancelar</Button>
          <Button variant="primary" size="sm" icon={<Check size={13} />} onClick={() => { onSave(names); setOpen(false); }} className="flex-1">Salvar</Button>
        </div>
      </div>
    </div>
  );
}

const EMPTY_DATE: DateRange = { start: '', end: '' };

// ── Main page ──────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { clients } = useApp();
  const client = clients.find(c => c.id === id);
  const { data, loading, error, fetch } = useKommoData(id!);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [pipelineMenuOpen, setPipelineMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_DATE);

  useEffect(() => { if (id) fetch(); }, [id]);

  useEffect(() => {
    if (data?.pipelines?.length) {
      const main = data.pipelines.find(p => p.is_main) || data.pipelines[0];
      setSelectedPipeline(prev =>
        prev ? (data.pipelines.find(p => p.id === prev.id) || main) : main
      );
    }
  }, [data]);

  const handleSaveStageNames = async (names: Record<string, string>) => {
    if (!id) return;
    try { await clientsApi.saveStageNames(id, names); fetch(); } catch {}
  };

  const filteredLeads = useMemo(() => {
    if (!data) return [];
    const startTs = dateRange.start ? new Date(dateRange.start).getTime() / 1000 : null;
    const endTs = dateRange.end ? (new Date(dateRange.end).getTime() / 1000 + 86399) : null;
    return data.leads.filter(l =>
      (!startTs || l.created_at >= startTs) && (!endTs || l.created_at <= endTs)
    );
  }, [data, dateRange]);

  const hasDateFilter = !!(dateRange.start || dateRange.end);

  if (!client) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <p className="text-text-primary font-medium mb-2">Cliente não encontrado</p>
      <Link to="/" className="text-brand-red text-sm hover:underline">← Voltar</Link>
    </div>
  );

  const pipelineLeads = selectedPipeline
    ? filteredLeads.filter(l => l.pipeline_id === selectedPipeline.id)
    : [];

  const kpis = selectedPipeline
    ? computeKPIs(pipelineLeads, data?.pipelines ?? [])
    : null;

  const stages = selectedPipeline ? computeStageMetrics(filteredLeads, selectedPipeline) : [];
  const stageTimeMetrics = selectedPipeline ? computeStageTimeMetrics(filteredLeads, selectedPipeline) : [];
  const userMetrics = selectedPipeline
    ? computeUserMetrics(pipelineLeads, data?.users ?? [], data?.pipelines ?? [])
    : [];
  const bottlenecks = selectedPipeline ? computeBottlenecks(filteredLeads, selectedPipeline) : [];
  const trend = data ? computeLeadTrend(filteredLeads, data.pipelines) : [];
  const insights = selectedPipeline
    ? generateInsights(pipelineLeads, data?.pipelines ?? [], data?.users ?? [])
    : [];
  const lossStats = data && selectedPipeline
    ? computeLossReasonAnalysis(pipelineLeads, data.lossReasons ?? [], data.pipelines)
    : [];
  const lostTotal = lossStats.reduce((s, r) => s + r.count, 0);

  const criticalInsights = insights.filter(i => i.type === 'critical').length;
  const warningInsights = insights.filter(i => i.type === 'warning').length;
  const criticalStages = stageTimeMetrics.filter(s => s.type === 0).reduce((s, m) => s + m.criticalCount, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">

      {/* ── Row 1: Title + Sync ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-all">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-text-primary leading-tight">{client.name}</h1>
            <p className="text-xs text-text-muted font-mono">
              {client.subdomain}.kommo.com
              {data?.account?.name && ` · ${data.account.name}`}
              {data?.lastSync && <> · {formatRelative(data.lastSync)}</>}
            </p>
          </div>
        </div>

        <Button variant="primary" size="sm" icon={<RefreshCw size={13} />} loading={loading} onClick={fetch}>
          Sincronizar
        </Button>
      </div>

      {/* ── Row 2: Filters ──────────────────────────────────────────────────── */}
      {(data || loading) && (
        <div className="flex items-center gap-3 flex-wrap pb-3 border-b border-border-default">
          <DateRangePicker value={dateRange} onChange={setDateRange} onClear={() => setDateRange(EMPTY_DATE)} />

          <div className="ml-auto flex items-center gap-2">
            {hasDateFilter && data && (
              <span className="text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-full">
                {filteredLeads.length} de {data.leads.length} leads
              </span>
            )}

            {/* Pipeline selector */}
            {data && data.pipelines.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setPipelineMenuOpen(v => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-secondary hover:text-text-primary hover:border-border-strong transition-all"
                >
                  <GitBranch size={12} />
                  <span className="max-w-[140px] truncate font-medium">{selectedPipeline?.name || 'Pipeline'}</span>
                  {data.pipelines.length > 1 && <ChevronDown size={11} />}
                </button>
                {pipelineMenuOpen && data.pipelines.length > 1 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setPipelineMenuOpen(false)} />
                    <div className="absolute right-0 top-9 z-20 bg-bg-elevated border border-border-subtle rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] py-1 min-w-[180px]">
                      {data.pipelines.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedPipeline(p); setPipelineMenuOpen(false); }}
                          className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${
                            selectedPipeline?.id === p.id
                              ? 'text-brand-red bg-brand-red-subtle'
                              : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                          }`}
                        >
                          {selectedPipeline?.id === p.id && <span className="w-1.5 h-1.5 rounded-full bg-brand-red flex-shrink-0" />}
                          {p.name}
                          {p.is_main && <span className="ml-auto text-xs text-text-muted">Principal</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Synthetic pipeline notice ─────────────────────────────────────── */}
      {data?.syntheticPipelines && selectedPipeline && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-yellow-950/30 border border-yellow-700/40">
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} className="text-yellow-400 flex-shrink-0" />
            <p className="text-xs text-yellow-200">
              Nomes reais do funil indisponíveis — exibindo estrutura extraída dos leads.
            </p>
          </div>
          <StageNameEditor pipeline={selectedPipeline} onSave={handleSaveStageNames} />
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/50">
          <AlertTriangle size={15} className="text-brand-red mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">Erro ao conectar com Kommo</p>
            <p className="text-xs text-text-secondary mt-0.5">{error}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={fetch} className="flex-shrink-0">Tentar novamente</Button>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loading && !data && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart2 size={36} className="text-brand-red mb-4" />
          <p className="text-text-primary font-semibold">Carregue os dados do Kommo</p>
          <p className="text-text-muted text-sm mt-1 mb-5">Clique em Sincronizar para buscar os dados da conta</p>
          <Button variant="primary" icon={<RefreshCw size={14} />} onClick={fetch} loading={loading}>
            Sincronizar agora
          </Button>
        </div>
      )}

      {loading && <DashboardSkeleton />}

      {data && selectedPipeline && kpis && !loading && (
        <>
          {/* ── Tabs ────────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-1 border-b border-border-default">
            {([
              { key: 'overview', label: 'Visão Geral', icon: BarChart2 },
              { key: 'evolution', label: 'Evolução', icon: TrendingUp },
            ] as { key: Tab; label: string; icon: React.ElementType<{ size?: number; className?: string }> }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                  activeTab === tab.key
                    ? 'border-brand-red text-brand-red'
                    : 'border-transparent text-text-muted hover:text-text-secondary'
                }`}
              >
                <tab.icon size={12} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ══════════════ VISÃO GERAL ══════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-4">

              {/* ── 8 KPIs in 4×2 grid ────────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KPICard label="Total Leads" value={formatNumber(kpis.totalLeads)} icon={TrendingUp} variant="red" />
                <KPICard label="Leads Ativos" value={formatNumber(kpis.activeLeads)} icon={Target} variant="default" />
                <KPICard label="Ganhos" value={formatNumber(kpis.wonLeads)} icon={CheckCircle} variant="green" />
                <KPICard label="Perdidos" value={formatNumber(kpis.lostLeads)} icon={XCircle} variant="muted" />
                <KPICard
                  label="Conversão"
                  value={formatPercent(kpis.conversionRate)}
                  icon={Users}
                  variant={kpis.conversionRate >= 20 ? 'green' : 'default'}
                />
                <KPICard
                  label="Receita Total"
                  value={formatCurrency(kpis.totalRevenue)}
                  icon={DollarSign}
                  variant="red"
                />
                <KPICard
                  label="Ticket Médio"
                  value={formatCurrency(kpis.averageDealValue)}
                  icon={DollarSign}
                  variant="default"
                />
                <KPICard
                  label="Tempo p/ Fechar"
                  value={formatDays(kpis.avgDaysToClose)}
                  icon={Clock}
                  variant="default"
                />
              </div>

              {/* ── Insights ─────────────────────────────────────────────── */}
              <Section
                title="Insights Automáticos"
                icon={Lightbulb}
                action={
                  <div className="flex items-center gap-1.5">
                    {criticalInsights > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-900/50 text-red-300 border border-red-700/40">
                        {criticalInsights} crítico{criticalInsights !== 1 ? 's' : ''}
                      </span>
                    )}
                    {warningInsights > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-900/40 text-yellow-300 border border-yellow-700/40">
                        {warningInsights} atenção
                      </span>
                    )}
                  </div>
                }
              >
                <InsightsPanel insights={insights} />
              </Section>

              {/* ── Kanban ───────────────────────────────────────────────── */}
              <KanbanAnalysis stages={stages} pipelineName={selectedPipeline.name} />

              {/* ── Tempo médio por etapa ─────────────────────────────────── */}
              <Section
                title={`Tempo Médio por Etapa`}
                icon={Timer}
                accent="#f59e0b"
                action={criticalStages > 0 ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-700/40">
                    {criticalStages} lead{criticalStages !== 1 ? 's' : ''} com 60d+
                  </span>
                ) : undefined}
              >
                <StageTimeChart stages={stageTimeMetrics} />
              </Section>

              {/* ── Trend + Funil + Receita em linha ─────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <Section title="Tendência — Últimos 12 Meses" icon={Activity}>
                    <LeadTrendChart trend={trend} />
                  </Section>
                </div>
                <Section title="Funil de Conversão" icon={GitBranch}>
                  <FunnelAnalysisChart stages={stages} />
                </Section>
              </div>

              {/* ── Receita + Motivos de perda ────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Section title="Receita por Estágio" icon={DollarSign}>
                  <RevenueChart stages={stages} />
                </Section>
                <Section
                  title="Motivos de Perda"
                  icon={TrendingDown}
                  accent="#6b7280"
                  action={<span className="text-xs text-text-muted">{lostTotal} perdidos</span>}
                >
                  <LossReasonChart reasons={lossStats} total={lostTotal} />
                </Section>
              </div>

              {/* ── Performance + Gargalos ───────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Section
                  title="Performance por Consultor"
                  icon={Users}
                  action={<span className="text-xs text-text-muted">{userMetrics.length} usuário{userMetrics.length !== 1 ? 's' : ''}</span>}
                >
                  <UserPerformance users={userMetrics} />
                </Section>
                <Section
                  title="Gargalos e Pontos de Atenção"
                  icon={AlertTriangle}
                  accent="#f59e0b"
                  action={bottlenecks.length > 0 ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-700/40">
                      {bottlenecks.length} detectado{bottlenecks.length !== 1 ? 's' : ''}
                    </span>
                  ) : null}
                >
                  <BottleneckAnalysis bottlenecks={bottlenecks} />
                </Section>
              </div>

              {/* ── Custom Fields ────────────────────────────────────────── */}
              {data.customFields.leads.length > 0 && (
                <Section
                  title="Campos Personalizados"
                  icon={Layers}
                  action={
                    <span className="text-xs text-text-muted">
                      {data.customFields.leads.filter(f => !f.is_system).length} campos
                    </span>
                  }
                >
                  <CustomFieldsAnalysis fields={data.customFields.leads} leads={pipelineLeads} />
                </Section>
              )}
            </div>
          )}

          {/* ══════════════ EVOLUÇÃO ════════════════════════════════════════ */}
          {activeTab === 'evolution' && (
            <EvolutionView
              leads={filteredLeads}
              pipelines={data.pipelines}
              lossReasons={data.lossReasons ?? []}
              pipelineName={selectedPipeline.name}
            />
          )}
        </>
      )}
    </div>
  );
}
