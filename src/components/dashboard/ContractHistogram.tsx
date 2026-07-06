import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import type { ContractRangeStat } from '../../types';

interface Props {
  data: ContractRangeStat[];
}

const COLORS = ['#701628', '#8c1a2e', '#a81c34', '#c41f3a', '#E5173F', '#f03d5f'];

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: ContractRangeStat }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (d.count === 0) return null;
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
      <p className="text-xs text-text-secondary mb-1 font-medium">{d.range}</p>
      <p className="text-base font-bold text-brand-red">{d.count} contrato{d.count !== 1 ? 's' : ''}</p>
      <p className="text-xs text-text-muted mt-0.5">{formatCurrency(d.totalValue)} total</p>
      {d.count > 0 && (
        <p className="text-xs text-text-muted">Ticket médio: {formatCurrency(d.totalValue / d.count)}</p>
      )}
    </div>
  );
}

export function ContractHistogram({ data }: Props) {
  const hasData = data.some(d => d.count > 0);

  if (!hasData) return (
    <div className="flex items-center justify-center h-40 text-text-muted text-sm">
      Nenhum contrato fechado registrado
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
        <XAxis
          dataKey="range"
          tick={{ fill: '#555', fontSize: 10 }}
          axisLine={{ stroke: '#1e1e1e' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => String(v)}
          tick={{ fill: '#555', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={44}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
