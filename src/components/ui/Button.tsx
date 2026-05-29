import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants = {
  primary:
    'bg-brand-red hover:bg-brand-red-light text-white shadow-red-glow-sm hover:shadow-red-glow transition-all',
  secondary:
    'bg-bg-elevated border border-border-subtle hover:border-border-strong text-text-primary hover:bg-bg-hover transition-all',
  ghost:
    'text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all',
  danger:
    'bg-transparent border border-red-900/50 hover:border-brand-red text-red-400 hover:text-brand-red transition-all',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
