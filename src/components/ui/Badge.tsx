import { clsx } from 'clsx';

interface BadgeProps {
  variant?: 'red' | 'green' | 'gray' | 'yellow' | 'blue';
  children: React.ReactNode;
  className?: string;
}

const variants = {
  red: 'bg-brand-red-subtle text-brand-red border border-brand-red-border',
  green: 'bg-green-950/40 text-green-400 border border-green-800/40',
  gray: 'bg-white/5 text-text-secondary border border-border-subtle',
  yellow: 'bg-yellow-950/40 text-yellow-400 border border-yellow-800/40',
  blue: 'bg-blue-950/40 text-blue-400 border border-blue-800/40',
};

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
