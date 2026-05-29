import { Trophy, Clock, TrendingUp, DollarSign, Timer } from 'lucide-react';
import { clsx } from 'clsx';
import { formatCurrency, formatPercent, getInitials, clientColor } from '../../utils/formatters';
import type { UserMetric } from '../../types';

interface UserPerformanceProps {
  users: UserMetric[];
}

function MetricPill({ icon: Icon, label, value, highlight }: {
  icon: React.ElementType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3 py-2 bg-white/[0.03] rounded-lg min-w-[72px]">
      <Icon size={11} className={highlight ? 'text-brand-red' : 'text-text-muted'} />
      <span className={clsx('text-sm font-bold leading-none', highlight ? 'text-brand-red' : 'text-text-primary')}>
        {value}
      </span>
      <span className="text-[9px] text-text-muted uppercase tracking-wide leading-none">{label}</span>
    </div>
  );
}

export function UserPerformance({ users }: UserPerformanceProps) {
  if (users.length === 0) return (
    <div className="flex items-center justify-center h-40 text-text-muted text-sm">
      Nenhum usuário com leads atribuídos
    </div>
  );

  const topUser = users[0];
  const maxRevenue = topUser.totalRevenue || 1;

  return (
    <div className="space-y-3">
      {users.map((user, idx) => {
        const isTop = user.id === topUser.id;
        const color = clientColor(user.name);
        const revenueBar = (user.totalRevenue / maxRevenue) * 100;
        const convColor =
          user.conversionRate >= 60 ? '#22c55e' :
          user.conversionRate >= 35 ? '#f59e0b' :
          user.conversionRate >= 20 ? '#f59e0b' : '#E5173F';

        return (
          <div
            key={user.id}
            className={clsx(
              'rounded-xl border transition-all overflow-hidden',
              isTop
                ? 'border-brand-red-border bg-brand-red-subtle'
                : 'border-border-default bg-bg-elevated hover:border-border-strong'
            )}
          >
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 pt-3 pb-2">
              <span className="w-5 text-center text-xs font-bold text-text-muted flex-shrink-0">
                {idx + 1}
              </span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: color }}
              >
                {getInitials(user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-text-primary truncate">{user.name}</span>
                  {isTop && <Trophy size={12} className="text-brand-red flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-text-muted">{user.assigned} leads</span>
                  <span className="text-text-muted">·</span>
                  <span className="text-xs text-green-400">{user.won} ganhos</span>
                  <span className="text-text-muted">·</span>
                  <span className="text-xs text-text-muted">{user.lost} perdidos</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <TrendingUp size={11} style={{ color: convColor }} />
                  <span className="text-sm font-bold" style={{ color: convColor }}>
                    {formatPercent(user.conversionRate)}
                  </span>
                </div>
                <span className="text-xs text-text-muted">{formatCurrency(user.totalRevenue)}</span>
              </div>
            </div>

            {/* Revenue bar */}
            <div className="px-4 pb-2">
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${revenueBar}%`, backgroundColor: color }}
                />
              </div>
            </div>

            {/* Metric pills */}
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
              <MetricPill
                icon={DollarSign}
                label="Ticket médio"
                value={user.avgTicket > 0 ? formatCurrency(user.avgTicket) : '—'}
                highlight={isTop}
              />
              <MetricPill
                icon={Timer}
                label="Dias p/ fechar"
                value={user.avgDaysToClose > 0 ? `${user.avgDaysToClose.toFixed(1)}d` : '—'}
              />
              <MetricPill
                icon={Clock}
                label="Leads ativos"
                value={user.active > 0 ? String(user.active) : '—'}
              />
              {user.avgActiveDays > 0 && (
                <MetricPill
                  icon={Clock}
                  label="Dias em aberto"
                  value={`${user.avgActiveDays.toFixed(0)}d`}
                  highlight={user.avgActiveDays > 30}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
