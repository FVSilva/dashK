import { useState } from 'react';
import { Calendar, X, ChevronDown } from 'lucide-react';

interface DateRange {
  start: string;
  end: string;
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onClear: () => void;
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const SHORTCUTS = [
  {
    label: 'Hoje',
    get: () => { const t = toYMD(new Date()); return { start: t, end: t }; },
  },
  {
    label: 'Esta semana',
    get: () => {
      const now = new Date();
      const day = now.getDay();
      const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      return { start: toYMD(mon), end: toYMD(now) };
    },
  },
  {
    label: 'Este mês',
    get: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: toYMD(start), end: toYMD(now) };
    },
  },
  {
    label: 'Mês passado',
    get: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: toYMD(start), end: toYMD(end) };
    },
  },
  {
    label: 'Últimos 90 dias',
    get: () => {
      const end = new Date();
      const start = new Date(); start.setDate(end.getDate() - 89);
      return { start: toYMD(start), end: toYMD(end) };
    },
  },
];

export function DateRangePicker({ value, onChange, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const hasFilter = value.start || value.end;

  const activeShortcut = SHORTCUTS.find(s => {
    const r = s.get();
    return r.start === value.start && r.end === value.end;
  });

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar size={13} className="text-text-muted flex-shrink-0" />

      {/* Shortcut dropdown */}
      <div className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1.5 bg-bg-elevated border border-border-subtle rounded-lg px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:border-border-strong transition-all"
        >
          {activeShortcut ? activeShortcut.label : 'Período'}
          <ChevronDown size={10} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-9 z-20 bg-bg-elevated border border-border-subtle rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] py-1 min-w-[148px]">
              {SHORTCUTS.map(s => (
                <button
                  key={s.label}
                  onClick={() => { onChange(s.get()); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    activeShortcut?.label === s.label
                      ? 'text-brand-red bg-brand-red-subtle'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <div className="border-t border-border-subtle my-1" />
              <p className="px-3 py-1 text-[10px] text-text-muted uppercase tracking-wide">Personalizado</p>
            </div>
          </>
        )}
      </div>

      {/* Date inputs */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={value.start}
          onChange={e => onChange({ ...value, start: e.target.value })}
          className="bg-bg-elevated border border-border-subtle rounded-lg px-2 py-1.5 text-xs text-text-secondary outline-none focus:border-brand-red/60 transition-colors cursor-pointer [color-scheme:dark] w-[130px]"
        />
        <span className="text-text-muted text-xs">até</span>
        <input
          type="date"
          value={value.end}
          onChange={e => onChange({ ...value, end: e.target.value })}
          className="bg-bg-elevated border border-border-subtle rounded-lg px-2 py-1.5 text-xs text-text-secondary outline-none focus:border-brand-red/60 transition-colors cursor-pointer [color-scheme:dark] w-[130px]"
        />
      </div>

      {hasFilter && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-brand-red transition-colors px-1.5 py-1 rounded hover:bg-white/5"
          title="Limpar filtro"
        >
          <X size={11} />
          Limpar
        </button>
      )}
    </div>
  );
}
