import { AlertTriangle, CheckCircle, Info, TrendingUp, XCircle } from 'lucide-react';
import type { Insight } from '../../types';

interface Props {
  insights: Insight[];
}

const CONFIG = {
  critical: {
    icon: XCircle,
    border: 'border-red-800/50',
    bg: 'bg-red-950/40',
    iconColor: 'text-red-400',
    labelColor: 'text-red-400',
    badge: 'bg-red-900/60 text-red-300 border-red-700/50',
    label: 'Crítico',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-yellow-700/40',
    bg: 'bg-yellow-950/30',
    iconColor: 'text-yellow-400',
    labelColor: 'text-yellow-400',
    badge: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/40',
    label: 'Atenção',
  },
  success: {
    icon: CheckCircle,
    border: 'border-green-700/40',
    bg: 'bg-green-950/30',
    iconColor: 'text-green-400',
    labelColor: 'text-green-400',
    badge: 'bg-green-900/40 text-green-300 border-green-700/40',
    label: 'Positivo',
  },
  info: {
    icon: Info,
    border: 'border-purple-700/40',
    bg: 'bg-purple-950/30',
    iconColor: 'text-purple-400',
    labelColor: 'text-purple-400',
    badge: 'bg-purple-900/40 text-purple-300 border-purple-700/40',
    label: 'Info',
  },
} as const;

export function InsightsPanel({ insights }: Props) {
  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
        <TrendingUp size={28} className="text-text-muted" />
        <p className="text-sm text-text-secondary">Nenhum insight gerado</p>
        <p className="text-xs text-text-muted">Sincronize dados para análise automática</p>
      </div>
    );
  }

  const order: Insight['type'][] = ['critical', 'warning', 'success', 'info'];
  const sorted = [...insights].sort(
    (a, b) => order.indexOf(a.type) - order.indexOf(b.type)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {sorted.map((insight, i) => {
        const cfg = CONFIG[insight.type];
        const Icon = cfg.icon;
        return (
          <div
            key={i}
            className={`flex gap-3 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}
          >
            <Icon size={16} className={`${cfg.iconColor} mt-0.5 flex-shrink-0`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-text-primary leading-tight">{insight.title}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded border whitespace-nowrap ${cfg.badge}`}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">{insight.description}</p>
              {insight.metric && (
                <p className={`text-xs font-bold mt-1.5 ${cfg.labelColor}`}>{insight.metric}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
