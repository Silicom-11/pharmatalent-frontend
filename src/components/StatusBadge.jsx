const VARIANTS = {
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  gray: 'bg-slate-100 text-slate-600',
  purple: 'bg-purple-100 text-purple-700',
};

export default function StatusBadge({ children, variant = 'gray' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${VARIANTS[variant] || VARIANTS.gray}`}>
      {children}
    </span>
  );
}

export function QFBadge({ coverage }) {
  if (coverage >= 100) return <StatusBadge variant="green">VERDE {coverage}%</StatusBadge>;
  if (coverage >= 80) return <StatusBadge variant="yellow">AMARILLO {coverage}%</StatusBadge>;
  return <StatusBadge variant="red">ROJO {coverage}%</StatusBadge>;
}
