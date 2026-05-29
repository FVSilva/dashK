import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { Layers } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';
import type { CustomField, Lead } from '../../types';
import { computeCustomFieldDistribution } from '../../utils/analytics';

interface CustomFieldsAnalysisProps {
  fields: CustomField[];
  leads: Lead[];
}

const CHART_COLORS = ['#E5173F', '#c41f3a', '#a81c34', '#8c1a2e', '#701628', '#541222', '#38101c', '#FF4D6D'];

const VISUAL_TYPES = new Set(['select', 'multiselect', 'radiobutton', 'checkbox', 'text', 'textarea']);

function FieldChart({ field, leads }: { field: CustomField; leads: Lead[] }) {
  const data = computeCustomFieldDistribution(leads, field);
  if (data.length === 0) return (
    <div className="flex items-center justify-center h-24 text-xs text-text-muted">
      Sem dados preenchidos
    </div>
  );

  const isSmall = ['checkbox', 'radiobutton'].includes(field.type) || data.length <= 3;

  if (isSmall) {
    return (
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={65}
            innerRadius={35}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#1a1a1a',
              border: '1px solid #262626',
              borderRadius: 10,
              fontSize: 11,
              color: '#f0f0f0',
            }}
            formatter={(v: number) => [formatNumber(v), 'Leads']}
          />
          <Legend
            iconSize={8}
            iconType="circle"
            formatter={(v) => <span style={{ color: '#8a8a8a', fontSize: 11 }}>{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
        <XAxis type="number" tick={{ fill: '#555', fontSize: 10 }} axisLine={{ stroke: '#1e1e1e' }} tickLine={false} />
        <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#1a1a1a', border: '1px solid #262626', borderRadius: 10, fontSize: 11, color: '#f0f0f0' }}
          formatter={(v: number) => [formatNumber(v), 'Leads']}
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CustomFieldsAnalysis({ fields, leads }: CustomFieldsAnalysisProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const relevant = fields
    .filter(f => !f.is_system && VISUAL_TYPES.has(f.type))
    .slice(0, 12);

  if (relevant.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Layers size={28} className="text-text-muted mb-3" />
      <p className="text-sm text-text-muted">Nenhum campo personalizado encontrado</p>
    </div>
  );

  const activeField = selected !== null ? relevant.find(f => f.id === selected) : relevant[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {relevant.map(field => (
          <button
            key={field.id}
            onClick={() => setSelected(field.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              (selected === null && field.id === relevant[0].id) || selected === field.id
                ? 'bg-brand-red text-white shadow-red-glow-sm'
                : 'bg-bg-elevated border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-strong'
            }`}
          >
            {field.name}
          </button>
        ))}
      </div>

      {activeField && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-text-muted">
              Tipo: <span className="text-text-secondary font-mono">{activeField.type}</span>
            </p>
            <p className="text-xs text-text-muted">
              {computeCustomFieldDistribution(leads, activeField).reduce((s, d) => s + d.count, 0)}{' '}
              leads com valor
            </p>
          </div>
          <FieldChart field={activeField} leads={leads} />
        </div>
      )}
    </div>
  );
}
