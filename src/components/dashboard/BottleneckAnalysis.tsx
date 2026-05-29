import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

interface Bottleneck {
  stageId: number;
  name: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
  insight: string;
}

interface BottleneckAnalysisProps {
  bottlenecks: Bottleneck[];
}

const config = {
  high: {
    icon: AlertCircle,
    label: 'Crítico',
    bg: 'bg-red-950/40',
    border: 'border-red-800/50',
    iconColor: 'text-brand-red',
    labelColor: 'text-brand-red',
    badgeBg: 'bg-brand-red/20 text-brand-red',
  },
  medium: {
    icon: AlertTriangle,
    label: 'Atenção',
    bg: 'bg-yellow-950/30',
    border: 'border-yellow-800/40',
    iconColor: 'text-yellow-400',
    labelColor: 'text-yellow-400',
    badgeBg: 'bg-yellow-500/20 text-yellow-400',
  },
  low: {
    icon: Info,
    label: 'Observação',
    bg: 'bg-purple-950/20',
    border: 'border-purple-800/30',
    iconColor: 'text-purple-400',
    labelColor: 'text-purple-400',
    badgeBg: 'bg-purple-500/20 text-purple-400',
  },
};

export function BottleneckAnalysis({ bottlenecks }: BottleneckAnalysisProps) {
  if (bottlenecks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle2 size={32} className="text-green-500 mb-3" />
        <p className="text-sm font-medium text-text-primary">Funil saudável</p>
        <p className="text-xs text-text-muted mt-1">
          Nenhum gargalo crítico detectado no pipeline
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bottlenecks.map(b => {
        const { icon: Icon, label, bg, border, iconColor, labelColor, badgeBg } = config[b.severity];
        return (
          <div
            key={b.stageId}
            className={clsx(
              'flex gap-3 p-4 rounded-xl border',
              bg, border
            )}
          >
            <Icon size={16} className={clsx('flex-shrink-0 mt-0.5', iconColor)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-text-primary truncate">{b.name}</span>
                <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0', badgeBg)}>
                  {label}
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">{b.insight}</p>
            </div>
            <div className={clsx('text-xl font-bold flex-shrink-0', labelColor)}>
              {b.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}
