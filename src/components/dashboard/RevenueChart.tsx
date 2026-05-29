import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import type { StageMetric } from '../../types';

interface RevenueChartProps {
  stages: StageMetric[];
}

const COLORS = ['#E5173F', '#c41f3a', '#a81c34', '#8c1a2e', '#701628', '#541222'];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: StageMetric; value: number }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
      <p className="text-xs text-text-secondary mb-1">{d.name}</p>
      <p className="text-base font-bold text-brand-red">{formatCurrency(d.value)}</p>
      <p className="text-xs text-text-muted mt-0.5">{d.count} leads</p>
    </div>
  );
}

export function RevenueChart({ stages }: RevenueChartProps) {
  const data = stages
    .filter(s => s.type !== 143 && s.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (data.length === 0) return (
    <div className="flex items-center justify-center h-40 text-text-muted text-sm">
      Nenhuma receita registrada
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#555', fontSize: 10 }}
          axisLine={{ stroke: '#1e1e1e' }}
          tickLine={false}
          angle={-30}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v).replace('R$ ', 'R$')}
          tick={{ fill: '#555', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
