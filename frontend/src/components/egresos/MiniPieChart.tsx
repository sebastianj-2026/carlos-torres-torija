import React from 'react';

interface Slice { label: string; value: number; color: string; }
interface Props  { slices: Slice[]; size?: number; }

const fmtMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const MiniPieChart: React.FC<Props> = ({ slices, size = 120 }) => {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0 || slices.length === 0) return null;

  // r = 15.9155  →  circumference ≈ 100 (easy percentage math)
  const R = 15.9155;
  let cumulative = 0;
  const segments = slices.map(s => {
    const pct = (s.value / total) * 100;
    const seg = { ...s, pct, offset: 25 - cumulative };
    cumulative += pct;
    return seg;
  });

  return (
    <div className="flex items-start gap-6">
      <svg width={size} height={size} viewBox="0 0 36 36" className="shrink-0 -rotate-90 mt-1">
        <circle cx="18" cy="18" r={R} fill="none" stroke="#f1f5f9" strokeWidth="4" />
        {segments.map((s, i) => (
          <circle
            key={i}
            cx="18" cy="18" r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="4"
            strokeDasharray={`${s.pct.toFixed(2)} ${(100 - s.pct).toFixed(2)}`}
            strokeDashoffset={s.offset}
          />
        ))}
      </svg>

      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wide pb-1.5 border-b border-slate-100 mb-1.5">
          <span>Categoría</span>
          <span className="text-right">Importe</span>
          <span className="text-right w-10">%</span>
        </div>
        {segments.map((s, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center py-1 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span className="text-xs text-slate-600 truncate">{s.label}</span>
            </div>
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap text-right tabular-nums">
              {fmtMXN(s.value)}
            </span>
            <span className="text-xs font-semibold text-slate-500 text-right w-10 tabular-nums">
              {s.pct.toFixed(1)}%
            </span>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center pt-2 mt-1 border-t border-slate-200">
          <span className="text-xs font-bold text-slate-700">Total</span>
          <span className="text-xs font-bold text-slate-800 text-right tabular-nums">{fmtMXN(total)}</span>
          <span className="text-xs font-bold text-slate-500 text-right w-10">100%</span>
        </div>
      </div>
    </div>
  );
};

export default MiniPieChart;
