import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import type { MonthlyMRRPoint } from '../../types';

interface Props {
  data: MonthlyMRRPoint[];
  goal?: number;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const bar = payload.find(p => p.name === 'mrr');
  const line = payload.find(p => p.name === 'trend');
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
      <p className="text-xs text-text-secondary mb-2 font-medium">{label}</p>
      {bar && (
        <p className="text-base font-bold text-brand-red">{formatCurrency(bar.value)}</p>
      )}
      {line && line.value > 0 && (
        <p className="text-xs text-text-muted mt-1">Tendência: {formatCurrency(line.value)}</p>
      )}
    </div>
  );
}

function linearTrend(data: MonthlyMRRPoint[]): number[] {
  const n = data.length;
  if (n < 2) return data.map(d => d.mrr);
  const xs = data.map((_, i) => i);
  const ys = data.map(d => d.mrr);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slope = den !== 0 ? num / den : 0;
  const intercept = my - slope * mx;
  return xs.map(x => Math.max(0, slope * x + intercept));
}

export function MonthlyMRRChart({ data, goal }: Props) {
  const trend = linearTrend(data);
  const chartData = data.map((d, i) => ({ ...d, trend: Math.round(trend[i]) }));
  const hasData = data.some(d => d.mrr > 0);

  if (!hasData) return (
    <div className="flex items-center justify-center h-40 text-text-muted text-sm">
      Sem fechamentos nos últimos 6 meses
    </div>
  );

  const maxVal = Math.max(...data.map(d => d.mrr), goal ?? 0, 1);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#555', fontSize: 11 }}
          axisLine={{ stroke: '#1e1e1e' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => formatCurrency(v).replace('R$ ', 'R$')}
          tick={{ fill: '#555', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={75}
          domain={[0, Math.ceil(maxVal * 1.15)]}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="mrr" name="mrr" fill="#E5173F" radius={[6, 6, 0, 0]} maxBarSize={48} opacity={0.9} />
        <Line
          type="monotone"
          dataKey="trend"
          name="trend"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          strokeDasharray="4 3"
        />
        {goal && goal > 0 && (
          <Line
            type="monotone"
            dataKey={() => goal}
            stroke="#22c55e"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="6 4"
            name="meta"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
