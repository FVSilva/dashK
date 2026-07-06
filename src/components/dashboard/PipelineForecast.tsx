import { TrendingUp } from 'lucide-react';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import type { PipelineForecastStat } from '../../types';

interface Props {
  stages: PipelineForecastStat[];
}

export function PipelineForecast({ stages }: Props) {
  if (stages.length === 0) return (
    <div className="flex items-center justify-center h-40 text-text-muted text-sm">
      Sem leads ativos no pipeline
    </div>
  );

  const totalPipeline = stages.reduce((s, st) => s + st.pipelineValue, 0);
  const totalExpected = stages.reduce((s, st) => s + st.expectedRevenue, 0);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/[0.03] rounded-xl p-3 border border-border-subtle">
          <p className="text-xs text-text-muted mb-1">Valor total em aberto</p>
          <p className="text-lg font-bold text-text-primary">{formatCurrency(totalPipeline)}</p>
        </div>
        <div className="bg-brand-red-subtle rounded-xl p-3 border border-brand-red-border">
          <p className="text-xs text-text-muted mb-1">Receita esperada (~30d)</p>
          <p className="text-lg font-bold text-brand-red">{formatCurrency(totalExpected)}</p>
        </div>
      </div>

      {/* Per-stage breakdown */}
      <div className="space-y-2">
        {stages.map(st => (
          <div key={st.stageId} className="flex items-center gap-3 px-3 py-2.5 bg-bg-elevated rounded-xl border border-border-subtle">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: st.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text-primary truncate">{st.stageName}</p>
              <p className="text-xs text-text-muted">{st.activeCount} lead{st.activeCount !== 1 ? 's' : ''} · {formatCurrency(st.pipelineValue)}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <p className="text-xs text-text-muted">Conv.</p>
                <p className="text-xs font-semibold text-amber-400">{formatPercent(st.conversionRate)}</p>
              </div>
              <div className="text-right min-w-[72px]">
                <p className="text-xs text-text-muted">Esperado</p>
                <p className="text-sm font-bold text-brand-red">{formatCurrency(st.expectedRevenue)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-text-muted text-center pt-1 flex items-center justify-center gap-1">
        <TrendingUp size={9} />
        Projeção baseada na taxa histórica de conversão do pipeline
      </p>
    </div>
  );
}
