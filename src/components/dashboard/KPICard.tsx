import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  variant?: 'default' | 'red' | 'green' | 'muted';
}

const ACCENT: Record<string, string> = {
  red: '#E5173F',
  green: '#22c55e',
  default: '#333',
  muted: '#2a2a2a',
};

export function KPICard({ label, value, subValue, icon: Icon, variant = 'default' }: KPICardProps) {
  const accent = ACCENT[variant];
  const valueColor =
    variant === 'red' ? 'text-brand-red' :
    variant === 'green' ? 'text-green-400' :
    variant === 'muted' ? 'text-text-muted' :
    'text-text-primary';

  return (
    <div className="relative bg-bg-card border border-border-default rounded-xl px-4 pt-4 pb-3 overflow-hidden">
      {/* Left accent */}
      <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full" style={{ backgroundColor: accent }} />

      {/* Watermark icon */}
      <div className="absolute right-2 bottom-1 opacity-[0.05] pointer-events-none">
        <Icon size={52} />
      </div>

      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2.5 leading-none">
        {label}
      </p>
      <p className={clsx('text-[1.6rem] font-bold leading-none tracking-tight mb-1', valueColor)}>
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-text-muted leading-none">{subValue}</p>
      )}
    </div>
  );
}
