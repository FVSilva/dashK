import { Calendar, X } from 'lucide-react';

interface DateRange {
  start: string;
  end: string;
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onClear: () => void;
}

export function DateRangePicker({ value, onChange, onClear }: Props) {
  const hasFilter = value.start || value.end;

  return (
    <div className="flex items-center gap-2">
      <Calendar size={13} className="text-text-muted flex-shrink-0" />
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={value.start}
          onChange={e => onChange({ ...value, start: e.target.value })}
          className="bg-bg-elevated border border-border-subtle rounded-lg px-2 py-1.5 text-xs text-text-secondary outline-none focus:border-brand-red/60 transition-colors cursor-pointer [color-scheme:dark] w-[130px]"
          placeholder="De"
        />
        <span className="text-text-muted text-xs">até</span>
        <input
          type="date"
          value={value.end}
          onChange={e => onChange({ ...value, end: e.target.value })}
          className="bg-bg-elevated border border-border-subtle rounded-lg px-2 py-1.5 text-xs text-text-secondary outline-none focus:border-brand-red/60 transition-colors cursor-pointer [color-scheme:dark] w-[130px]"
          placeholder="Até"
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
