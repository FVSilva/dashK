import type { LossReasonStat } from '../../types';

interface Props {
  reasons: LossReasonStat[];
  total: number;
}

const COLORS = ['#E5173F', '#c41f3a', '#a81c34', '#8c1a2e', '#701628', '#541222', '#38101c'];

export function LossReasonChart({ reasons, total }: Props) {
  if (reasons.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-text-muted text-sm">
        Nenhum lead perdido registrado
      </div>
    );
  }

  const data = reasons.slice(0, 8);
  const withReason = reasons.filter(r => r.id !== null);
  const withoutReason = reasons.find(r => r.id === null);

  return (
    <div className="space-y-3">
      {/* Summary chips */}
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="text-xs text-text-muted">
          <span className="font-semibold text-text-primary">{withReason.length}</span> motivos distintos
        </span>
        {withoutReason && (
          <>
            <span className="text-text-muted">·</span>
            <span className="text-xs text-yellow-400/80">
              {withoutReason.count} sem motivo informado ({withoutReason.percentage.toFixed(0)}%)
            </span>
          </>
        )}
      </div>

      {/* Bars */}
      <div className="space-y-2.5">
        {data.map((r, i) => {
          const isNoReason = r.id === null;
          return (
            <div key={i} className="flex items-center gap-3 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs leading-tight ${isNoReason ? 'text-text-muted italic' : 'text-text-secondary'}`}>
                    {r.name}
                  </span>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <span className="text-xs font-bold text-text-primary">{r.count}</span>
                    <span className="text-xs text-text-muted w-8 text-right">{r.percentage.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${r.percentage}%`,
                      backgroundColor: isNoReason ? '#374151' : COLORS[i % COLORS.length],
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
