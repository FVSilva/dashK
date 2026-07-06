import { useState } from 'react';
import { clsx } from 'clsx';
import { TrendingUp, Trophy, XCircle, X, DollarSign, Clock, User } from 'lucide-react';
import { formatCurrency, formatNumber, formatDays } from '../../utils/formatters';
import type { StageMetric, Lead, User as UserType } from '../../types';

interface KanbanAnalysisProps {
  stages: StageMetric[];
  pipelineName: string;
  leads?: Lead[];
  users?: UserType[];
}

function LeadDrillDown({
  stage,
  leads,
  users,
  onClose,
}: {
  stage: StageMetric;
  leads: Lead[];
  users: UserType[];
  onClose: () => void;
}) {
  const now = Math.floor(Date.now() / 1000);
  const stageLeads = leads
    .filter(l => l.status_id === stage.id)
    .sort((a, b) => (b.price || 0) - (a.price || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-bg-elevated border border-border-subtle rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
            <h3 className="text-sm font-semibold text-text-primary">{stage.name}</h3>
            <span className="text-xs text-text-muted ml-1">
              {stageLeads.length} lead{stageLeads.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {stageLeads.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-text-muted text-sm">
              Nenhum lead nesta etapa
            </div>
          ) : (
            stageLeads.map(lead => {
              const owner = users.find(u => u.id === lead.responsible_user_id);
              const ageDays = (now - lead.updated_at) / 86400;
              const isStale = ageDays >= 30;
              return (
                <div
                  key={lead.id}
                  className="flex items-center gap-3 px-4 py-3 bg-bg-primary rounded-xl border border-border-subtle hover:border-border-strong transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{lead.name}</p>
                    {owner && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <User size={10} className="text-text-muted" />
                        <span className="text-xs text-text-muted truncate">{owner.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {lead.price > 0 && (
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <DollarSign size={10} className="text-brand-red" />
                          <span className="text-sm font-semibold text-text-primary">
                            {formatCurrency(lead.price)}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="text-right min-w-[52px]">
                      <div className="flex items-center gap-1">
                        <Clock size={10} className={isStale ? 'text-amber-400' : 'text-text-muted'} />
                        <span className={clsx('text-xs', isStale ? 'text-amber-400 font-semibold' : 'text-text-muted')}>
                          {formatDays(ageDays)}
                        </span>
                      </div>
                      <p className="text-[9px] text-text-muted">sem mov.</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border-subtle flex-shrink-0 flex items-center justify-between">
          <span className="text-xs text-text-muted">
            Valor total: <span className="text-text-primary font-medium">{formatCurrency(stage.value)}</span>
          </span>
          <button
            onClick={onClose}
            className="text-xs text-text-muted hover:text-text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function StageCard({
  stage,
  maxCount,
  onClick,
}: {
  stage: StageMetric;
  maxCount: number;
  onClick?: () => void;
}) {
  const isWon = stage.type === 142;
  const isLost = stage.type === 143;
  const isActive = stage.type === 0;
  const widthPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;

  return (
    <div
      onClick={isActive && onClick ? onClick : undefined}
      className={clsx(
        'flex-shrink-0 w-48 rounded-xl border p-4 transition-all',
        isWon
          ? 'bg-green-950/30 border-green-800/40'
          : isLost
          ? 'bg-white/[0.02] border-border-default'
          : 'bg-bg-elevated border-border-subtle hover:border-brand-red/50 cursor-pointer hover:bg-brand-red/5'
      )}
    >
      <div className="flex items-center gap-1.5 mb-3">
        {isWon ? (
          <Trophy size={12} className="text-green-400" />
        ) : isLost ? (
          <XCircle size={12} className="text-text-muted" />
        ) : (
          <TrendingUp size={12} className="text-brand-red" />
        )}
        <span
          className={clsx(
            'text-xs font-medium truncate',
            isWon ? 'text-green-400' : isLost ? 'text-text-muted' : 'text-text-secondary'
          )}
        >
          {stage.name}
        </span>
      </div>

      <p
        className={clsx(
          'text-2xl font-bold leading-none mb-1',
          isWon ? 'text-green-400' : isLost ? 'text-text-muted' : 'text-text-primary'
        )}
      >
        {formatNumber(stage.count)}
      </p>
      <p className="text-xs text-text-muted mb-3">{formatCurrency(stage.value)}</p>

      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500',
            isWon ? 'bg-green-500' : isLost ? 'bg-white/20' : 'bg-brand-red'
          )}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <p className={clsx('text-xs mt-1', isWon ? 'text-green-500/70' : 'text-text-muted')}>
        {stage.percentage.toFixed(1)}%
      </p>

      {isActive && stage.count > 0 && (
        <p className="text-[9px] text-text-muted mt-2 opacity-60">Clique para ver leads</p>
      )}
    </div>
  );
}

export function KanbanAnalysis({ stages, pipelineName, leads = [], users = [] }: KanbanAnalysisProps) {
  const [drillStage, setDrillStage] = useState<StageMetric | null>(null);
  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const active = stages.filter(s => s.type === 0);
  const won = stages.find(s => s.type === 142);
  const lost = stages.find(s => s.type === 143);
  const ordered = [...active, ...(won ? [won] : []), ...(lost ? [lost] : [])];

  return (
    <>
      <div className="bg-bg-card border border-border-default rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Kanban por Estágio</h3>
            <p className="text-xs text-text-muted mt-0.5">{pipelineName}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-brand-red" /> Ativo
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Ganho
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white/20" /> Perdido
            </span>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border-strong scrollbar-track-transparent">
          {ordered.map(stage => (
            <StageCard
              key={stage.id}
              stage={stage}
              maxCount={maxCount}
              onClick={() => setDrillStage(stage)}
            />
          ))}
        </div>
      </div>

      {drillStage && (
        <LeadDrillDown
          stage={drillStage}
          leads={leads}
          users={users}
          onClose={() => setDrillStage(null)}
        />
      )}
    </>
  );
}
