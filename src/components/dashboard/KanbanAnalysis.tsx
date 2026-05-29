import { clsx } from 'clsx';
import { TrendingUp, Trophy, XCircle } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import type { StageMetric } from '../../types';

interface KanbanAnalysisProps {
  stages: StageMetric[];
  pipelineName: string;
}

function StageCard({ stage, maxCount }: { stage: StageMetric; maxCount: number }) {
  const isWon = stage.type === 142;
  const isLost = stage.type === 143;
  const widthPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;

  return (
    <div
      className={clsx(
        'flex-shrink-0 w-48 rounded-xl border p-4 transition-all',
        isWon
          ? 'bg-green-950/30 border-green-800/40'
          : isLost
          ? 'bg-white/[0.02] border-border-default'
          : 'bg-bg-elevated border-border-subtle hover:border-border-strong'
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
      <p
        className={clsx(
          'text-xs mt-1',
          isWon ? 'text-green-500/70' : 'text-text-muted'
        )}
      >
        {stage.percentage.toFixed(1)}%
      </p>
    </div>
  );
}

export function KanbanAnalysis({ stages, pipelineName }: KanbanAnalysisProps) {
  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const active = stages.filter(s => s.type === 0);
  const won = stages.find(s => s.type === 142);
  const lost = stages.find(s => s.type === 143);
  const ordered = [...active, ...(won ? [won] : []), ...(lost ? [lost] : [])];

  return (
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
          <StageCard key={stage.id} stage={stage} maxCount={maxCount} />
        ))}
      </div>
    </div>
  );
}
