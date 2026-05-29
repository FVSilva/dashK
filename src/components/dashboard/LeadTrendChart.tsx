import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { LeadTrendPoint } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  trend: LeadTrendPoint[];
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)] min-w-[160px]">
      <p className="text-xs text-text-muted mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-4 items-center">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-xs text-text-secondary capitalize">{p.name}</span>
          </div>
          <span className="text-xs font-semibold text-text-primary">{p.value}</span>
        </div>
      ))}
      {payload[0] && (
        <div className="border-t border-border-subtle mt-2 pt-2">
          <div className="flex justify-between gap-4">
            <span className="text-xs text-text-muted">Receita</span>
            <span className="text-xs font-semibold text-brand-red">
              {formatCurrency((payload.find(p => p.name === 'revenue')?.value as number) || 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function LeadTrendChart({ trend }: Props) {
  if (trend.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted text-sm">
        Dados insuficientes para tendência
      </div>
    );
  }

  const data = trend.map(t => ({
    ...t,
    month: t.month.slice(5) + '/' + t.month.slice(2, 4),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#E5173F" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#E5173F" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradWon" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradLost" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6b7280" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: '#555', fontSize: 10 }}
          axisLine={{ stroke: '#1e1e1e' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#555', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={28}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: 12, fontSize: 11, color: '#666' }}
          formatter={(value) => value === 'total' ? 'Total' : value === 'won' ? 'Ganhos' : 'Perdidos'}
        />
        <Area type="monotone" dataKey="total" stroke="#E5173F" strokeWidth={2} fill="url(#gradTotal)" dot={false} />
        <Area type="monotone" dataKey="won" stroke="#22c55e" strokeWidth={1.5} fill="url(#gradWon)" dot={false} />
        <Area type="monotone" dataKey="lost" stroke="#6b7280" strokeWidth={1.5} fill="url(#gradLost)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
