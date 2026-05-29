import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatNumber } from '../../utils/formatters';
import type { StageMetric } from '../../types';

interface FunnelChartProps {
  stages: StageMetric[];
}

const COLORS = [
  '#E5173F', '#c41f3a', '#a81c34', '#8c1a2e',
  '#701628', '#541222', '#38101c', '#2a0d18',
];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; pct: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.7)] min-w-[140px]">
      <p className="text-xs font-semibold text-text-primary mb-1.5 leading-tight">{d.name}</p>
      <div className="flex justify-between gap-4">
        <span className="text-xs text-text-muted">Leads</span>
        <span className="text-xs font-bold text-text-primary">{formatNumber(d.value)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-xs text-text-muted">% do total</span>
        <span className="text-xs font-bold text-brand-red">{d.pct.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export function FunnelAnalysisChart({ stages }: FunnelChartProps) {
  const active = stages
    .filter(s => s.type === 0 && s.count > 0)
    .sort((a, b) => a.sort - b.sort);

  const total = active.reduce((s, st) => s + st.count, 0) || 1;

  const data = active.map(stage => ({
    name: stage.name,
    value: stage.count,
    pct: (stage.count / total) * 100,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted text-sm">
        Nenhum dado disponível
      </div>
    );
  }

  // Only show pairs where rate ≤ 100% (actual drop-offs, not increases)
  const dropoffs = active
    .slice(1)
    .map((stage, i) => {
      const prev = active[i];
      if (prev.count === 0) return null;
      const rate = (stage.count / prev.count) * 100;
      if (rate > 100) return null;
      return { from: prev.name, to: stage.name, rate };
    })
    .filter(Boolean) as { from: string; to: string; rate: number }[];

  return (
    <div className="flex flex-col gap-4">
      {/* Donut centered */}
      <div className="flex justify-center">
        <div className="relative" style={{ width: 160, height: 160 }}>
          <PieChart width={160} height={160}>
            <Pie
              data={data}
              cx={75}
              cy={75}
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-text-primary leading-none">{formatNumber(total)}</span>
            <span className="text-[9px] text-text-muted mt-0.5 uppercase tracking-wide">leads ativos</span>
          </div>
        </div>
      </div>

      {/* Legend — 2 columns */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-[10px] text-text-secondary truncate flex-1">{d.name}</span>
            <span className="text-[10px] font-bold text-text-primary flex-shrink-0">{d.value}</span>
          </div>
        ))}
      </div>

      {/* Drop-off rates — only meaningful ones (≤ 100%) */}
      {dropoffs.length > 0 && (
        <div className="border-t border-border-default pt-3">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">
            Taxa de queda entre etapas
          </p>
          <div className="space-y-1.5">
            {dropoffs.map((d, i) => {
              const kept = 100 - d.rate;
              const barColor =
                kept <= 30 ? '#22c55e' :
                kept <= 60 ? '#f59e0b' : '#E5173F';
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-text-muted truncate flex-shrink-0" style={{ width: 110 }}>
                    {d.from} → {d.to}
                  </span>
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(kept, 100)}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold w-9 text-right flex-shrink-0" style={{ color: barColor }}>
                    -{kept.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
