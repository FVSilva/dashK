import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import type { StageTimeMetric } from '../../types';

interface Props {
  stages: StageTimeMetric[];
}

function barColor(avg: number): string {
  if (avg >= 60) return '#E5173F';
  if (avg >= 30) return '#f97316';
  if (avg >= 14) return '#f59e0b';
  return '#22c55e';
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: StageTimeMetric }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (d.count === 0) return null;
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)] min-w-[170px]">
      <p className="text-xs font-semibold text-text-primary mb-2">{d.name}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-xs text-text-muted">Leads</span>
          <span className="text-xs font-semibold text-text-primary">{d.count}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-xs text-text-muted">Tempo médio</span>
          <span className="text-xs font-bold" style={{ color: barColor(d.avgAgeDays) }}>
            {d.avgAgeDays.toFixed(1)} dias
          </span>
        </div>
        {d.staleCount > 0 && (
          <div className="flex justify-between gap-6">
            <span className="text-xs text-text-muted">Parados 30d+</span>
            <span className="text-xs font-semibold text-yellow-400">{d.staleCount}</span>
          </div>
        )}
        {d.criticalCount > 0 && (
          <div className="flex justify-between gap-6">
            <span className="text-xs text-text-muted">Críticos 60d+</span>
            <span className="text-xs font-semibold text-red-400">{d.criticalCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function StageTimeChart({ stages }: Props) {
  const data = stages.filter(s => s.type === 0 && s.count > 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted text-sm">
        Nenhum lead ativo no pipeline
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 160)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 70, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#555', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${v}d`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#888', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={140}
            tickFormatter={v => v.length > 20 ? v.slice(0, 20) + '…' : v}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="avgAgeDays" radius={[0, 6, 6, 0]} maxBarSize={22}>
            {data.map((d, i) => (
              <Cell key={i} fill={barColor(d.avgAgeDays)} />
            ))}
            <LabelList
              dataKey="avgAgeDays"
              position="right"
              style={{ fill: '#666', fontSize: 10 }}
              formatter={(v: number) => `${v.toFixed(1)}d`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        {[
          { color: '#22c55e', label: '< 14 dias — saudável' },
          { color: '#f59e0b', label: '14–29 dias — atenção' },
          { color: '#f59e0b', label: '30–59 dias — lento' },
          { color: '#E5173F', label: '60+ dias — crítico' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
