const TONES = {
  slate:   { bg: 'bg-slate-100',   text: 'text-slate-600' },
  primary: { bg: 'bg-primary/10',  text: 'text-primary' },
  green:   { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  blue:    { bg: 'bg-blue-100',    text: 'text-blue-600' },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-600' },
  red:     { bg: 'bg-red-100',     text: 'text-red-600' },
  violet:  { bg: 'bg-violet-100',  text: 'text-violet-600' },
  cyan:    { bg: 'bg-cyan-100',    text: 'text-cyan-600' },
  rose:    { bg: 'bg-rose-100',    text: 'text-rose-600' },
  fuchsia: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-600' },
};

export default function StatCard({ icon: Icon, label, value, hint, tone = 'slate', onClick }) {
  const t = TONES[tone] || TONES.slate;
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-left w-full ${
        onClick ? 'hover:border-slate-300 hover:shadow transition-all cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1.5">{value ?? '—'}</p>
          {hint && <p className="text-xs text-slate-500 mt-1 leading-snug">{hint}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${t.bg}`}>
            <Icon size={20} className={t.text} />
          </div>
        )}
      </div>
    </Wrapper>
  );
}

/** Barra de progreso simple para indicadores de cobertura */
export function ProgressBar({ value, max = 100, tone = 'primary', label }) {
  const pct = Math.min(100, Math.round(((value || 0) / (max || 1)) * 100));
  const color = { primary: 'bg-primary', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', blue: 'bg-blue-500' }[tone] || 'bg-primary';
  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">{label}</span>
          <span className="font-medium text-slate-700">{pct}%</span>
        </div>
      )}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
