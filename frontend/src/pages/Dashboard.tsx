import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAnalytics } from '../services/dashboardService';
import { AnalyticsData } from '../types/analytics.types';

// ── Helpers ───────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);

const fmtDec = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 2,
  }).format(n);

const pct = (val: number, total: number) =>
  total > 0 ? Math.min((val / total) * 100, 100) : 0;

// ── SVG Donut Chart ───────────────────────────────────────────────

interface Slice { label: string; value: number; color: string }

const DonutChart: React.FC<{ slices: Slice[]; total: number; cx?: number; cy?: number; r?: number; thick?: number }> = ({
  slices, total, cx = 90, cy = 90, r = 68, thick = 22,
}) => {
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const paths = slices.map(s => {
    const fraction = total > 0 ? s.value / total : 0;
    const dash     = fraction * circumference;
    const gap      = circumference - dash;
    const rotation = (offset / (total || 1)) * 360 - 90;
    offset += s.value;
    return { ...s, dash, gap, rotation };
  });

  return (
    <svg viewBox="0 0 180 180" className="w-full h-full">
      {total === 0 ? (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={thick} />
      ) : (
        paths.map((p, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={p.color}
            strokeWidth={thick}
            strokeDasharray={`${p.dash} ${p.gap}`}
            transform={`rotate(${p.rotation}, ${cx}, ${cy})`}
            strokeLinecap="butt"
          />
        ))
      )}
      <text x={cx} y={cy - 6} textAnchor="middle" className="text-[11px]" fill="#64748b" fontSize="11">TOTAL</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#1e293b" fontSize="13" fontWeight="700">
        {total === 0 ? '$0' : fmt(total).replace('MX$', '$')}
      </text>
    </svg>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────

const Skeleton = () => (
  <div className="p-6 lg:p-8 animate-pulse space-y-6">
    <div className="flex items-center justify-between">
      <div className="h-6 bg-slate-200 rounded w-48" />
      <div className="h-8 bg-slate-200 rounded w-32" />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="h-72 bg-slate-200 rounded-2xl" />
      <div className="h-72 bg-slate-200 rounded-2xl" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-slate-200 rounded-2xl" />)}
    </div>
  </div>
);

// ── Bar row ───────────────────────────────────────────────────────

const BarRow = ({
  label, value, total, color = '#94a3b8', right,
}: { label: string; value: number; total: number; color?: string; right?: React.ReactNode }) => {
  const p = pct(value, total);
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-slate-600">{label}</span>
        <span className="tabular-nums text-slate-500 flex items-center gap-2">
          {right ?? null}
          {fmtDec(value)} <span className="text-slate-300">{p.toFixed(1)}%</span>
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

// ── Section title ─────────────────────────────────────────────────

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">{children}</h3>
);

// ── Month selector ────────────────────────────────────────────────

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const MonthSelector = ({
  mes, anio, onChange,
}: { mes: number; anio: number; onChange: (m: number, a: number) => void }) => {
  const prev = () => {
    if (mes === 1) onChange(12, anio - 1);
    else onChange(mes - 1, anio);
  };
  const next = () => {
    const now = new Date();
    if (anio > now.getFullYear() || (anio === now.getFullYear() && mes >= now.getMonth() + 1)) return;
    if (mes === 12) onChange(1, anio + 1);
    else onChange(mes + 1, anio);
  };
  return (
    <div className="flex items-center gap-2 text-sm">
      <button onClick={prev} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">‹</button>
      <span className="font-semibold text-slate-700 capitalize min-w-[130px] text-center">
        {MONTHS[mes - 1]} {anio}
      </span>
      <button onClick={next} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">›</button>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const { usuario } = useAuth();
  const now = new Date();
  const [mes,  setMes]  = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [data,    setData]    = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    getAnalytics(mes, anio)
      .then(setData)
      .catch((err: any) => {
        const msg = err?.response?.data?.mensaje ?? err?.message ?? 'Error desconocido';
        setError(`[${err?.response?.status ?? 'ERR'}] ${msg}`);
      })
      .finally(() => setLoading(false));
  }, [mes, anio]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMonthChange = (m: number, a: number) => {
    setMes(m);
    setAnio(a);
  };

  if (loading) return <Skeleton />;
  if (error || !data) return (
    <div className="p-6 text-sm text-red-500">{error ?? 'Sin datos.'}</div>
  );

  const { bloque_a: ba, bloque_b: bb, bloque_c: bc, bloque_d: bd, bloque_e: be, bloque_f: bf, bloque_g: bg } = data;
  const positiva = ba.utilidad_mensual >= 0;

  // Donut slices
  const ingresosSlices: Slice[] = [
    { label: 'Rentas propias',   value: bb.rentas_propias,   color: '#22c55e' },
    { label: 'Rentas externas',  value: bb.rentas_externas,  color: '#86efac' },
    { label: 'Préstamos',        value: bb.prestamos,        color: '#3b82f6' },
    { label: 'Cancha',           value: bb.cancha,           color: '#f59e0b' },
    { label: 'Estacionamiento',  value: bb.estacionamiento,  color: '#14b8a6' },
    { label: 'Otros',            value: bb.otros,            color: '#a78bfa' },
  ];

  const egresosSlices: Slice[] = [
    { label: 'Abril',          value: bc.abril,          color: '#f43f5e' },
    { label: 'Oficina',        value: bc.oficina,        color: '#fb923c' },
    { label: 'Nóminas',        value: bc.nominas,        color: '#f97316' },
    { label: 'Inversionistas', value: bc.inversionistas, color: '#8b5cf6' },
    { label: 'Créditos',       value: bc.creditos,       color: '#ef4444' },
    { label: 'Extras',         value: bc.extras,         color: '#94a3b8' },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-8 pb-16">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Radiografía Financiera</p>
          <h2 className="text-2xl font-bold text-slate-800">{usuario?.nombre}</h2>
        </div>
        <MonthSelector mes={mes} anio={anio} onChange={handleMonthChange} />
      </div>

      {/* ── Bloque A: 4 KPI cards ─────────────────────────────── */}
      <section>
        <SectionTitle>Resumen Ejecutivo</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          <div className={`rounded-2xl p-5 border-2 shadow-sm ${positiva ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Utilidad del Mes</p>
            <p className={`text-2xl font-bold mt-1 tabular-nums ${positiva ? 'text-green-700' : 'text-red-600'}`}>
              {fmt(ba.utilidad_mensual)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{positiva ? '↑ Positiva' : '↓ Negativa'}</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Liquidez Real</p>
            <p className="text-2xl font-bold text-green-600 mt-1 tabular-nums">{fmt(ba.liquidez_total)}</p>
            <p className="text-[11px] text-slate-400 mt-1">Bancos + caja chica</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cobranza Rentas</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-2xl font-bold tabular-nums ${bd.eficiencia_rentas >= 80 ? 'text-green-600' : bd.eficiencia_rentas >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {bd.eficiencia_rentas.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full rounded-full ${bd.eficiencia_rentas >= 80 ? 'bg-green-500' : bd.eficiencia_rentas >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${bd.eficiencia_rentas}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">{fmt(bd.rentas_cobradas)} / {fmt(bd.rentas_esperadas)}</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cobranza Préstamos</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-2xl font-bold tabular-nums ${bd.eficiencia_prestamos >= 80 ? 'text-green-600' : bd.eficiencia_prestamos >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {bd.eficiencia_prestamos.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full rounded-full ${bd.eficiencia_prestamos >= 80 ? 'bg-blue-500' : bd.eficiencia_prestamos >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${bd.eficiencia_prestamos}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">{fmt(bd.intereses_cobrados)} / {fmt(bd.intereses_esperados)}</p>
          </div>

        </div>
      </section>

      {/* ── Bloques B + C: Pie charts + breakdowns ────────────── */}
      <section>
        <SectionTitle>Composición del Flujo</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Ingresos */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Ingresos del Mes</p>
            <p className="text-3xl font-bold text-green-600 tabular-nums mb-4">{fmtDec(bb.total)}</p>
            <div className="flex gap-4">
              <div className="w-36 h-36 flex-shrink-0">
                <DonutChart slices={ingresosSlices.filter(s => s.value > 0)} total={bb.total} />
              </div>
              <div className="flex-1 pt-1">
                {ingresosSlices.map(s => (
                  <BarRow key={s.label} label={s.label} value={s.value} total={bb.total} color={s.color} />
                ))}
              </div>
            </div>
            {/* Legend dots */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
              {ingresosSlices.filter(s => s.value > 0).map(s => (
                <span key={s.label} className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* Egresos */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Egresos del Mes</p>
            <p className="text-3xl font-bold text-red-500 tabular-nums mb-4">{fmtDec(bc.total)}</p>
            <div className="flex gap-4">
              <div className="w-36 h-36 flex-shrink-0">
                <DonutChart slices={egresosSlices.filter(s => s.value > 0)} total={bc.total} />
              </div>
              <div className="flex-1 pt-1">
                {egresosSlices.map(s => (
                  <BarRow key={s.label} label={s.label} value={s.value} total={bc.total} color={s.color} />
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
              {egresosSlices.filter(s => s.value > 0).map(s => (
                <span key={s.label} className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Bloque D: Sub-negocios ────────────────────────────── */}
      <section>
        <SectionTitle>Sub-negocios</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cancha</p>
            <p className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">{fmtDec(bb.cancha)}</p>
            <p className="text-[11px] text-slate-400 mt-1">ingreso del mes</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Estacionamiento</p>
            <p className="text-2xl font-bold text-teal-600 mt-1 tabular-nums">{fmtDec(bb.estacionamiento)}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {bd.pensiones_activas} pensión{bd.pensiones_activas !== 1 ? 'es' : ''} activa{bd.pensiones_activas !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Otros</p>
            <p className="text-2xl font-bold text-violet-600 mt-1 tabular-nums">{fmtDec(bb.otros)}</p>
            <p className="text-[11px] text-slate-400 mt-1">ingresos varios</p>
          </div>

        </div>
      </section>

      {/* ── Bloque E: Inversionistas ──────────────────────────── */}
      <section>
        <SectionTitle>Margen de Inversiones</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cobrado a Deudores</p>
            <p className="text-2xl font-bold text-blue-600 mt-1 tabular-nums">{fmtDec(be.ingresos_prestamos_mes)}</p>
            <p className="text-[11px] text-slate-400 mt-1">intereses del mes</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pagado a Inversionistas</p>
            <p className="text-2xl font-bold text-purple-600 mt-1 tabular-nums">{fmtDec(be.pago_total_inversionistas)}</p>
            <p className="text-[11px] text-slate-400 mt-1">rendimientos del mes</p>
          </div>

          <div className={`rounded-2xl p-5 border-2 shadow-sm ${be.utilidad_oficina_inversion >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Margen Oficina</p>
            <p className={`text-2xl font-bold mt-1 tabular-nums ${be.utilidad_oficina_inversion >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {fmtDec(be.utilidad_oficina_inversion)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">cobrado − pagado a inv.</p>
          </div>

        </div>
      </section>

      {/* ── Bloque F: Juicios ─────────────────────────────────── */}
      {bf.conteo_casos > 0 && (
        <section>
          <SectionTitle>Radar Legal — Juicios Activos</SectionTitle>
          <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-red-100 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-red-700">{bf.conteo_casos} caso{bf.conteo_casos !== 1 ? 's' : ''} activo{bf.conteo_casos !== 1 ? 's' : ''}</span>
                <span className="text-xs text-red-500 ml-2">— Capital congelado: {fmtDec(bf.capital_atorado)}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-red-100 text-red-700 text-[11px] uppercase tracking-wide">
                    <th className="px-4 py-2 text-left font-semibold">Cliente</th>
                    <th className="px-4 py-2 text-left font-semibold">Etapa</th>
                    <th className="px-4 py-2 text-right font-semibold">Saldo</th>
                    <th className="px-4 py-2 text-left font-semibold">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {bf.casos.map((c, i) => (
                    <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-red-50/40'}>
                      <td className="px-4 py-2.5 font-medium text-slate-700">{c.cliente_nombre}</td>
                      <td className="px-4 py-2.5 text-slate-500">{c.etapa_procesal ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-red-700 font-semibold">
                        {fmtDec(c.saldo_pendiente)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs max-w-xs truncate">{c.notas ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── Bloque G: Rankings ────────────────────────────────── */}
      <section>
        <SectionTitle>Rankings del Mes</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Top pagadores */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-3">Top 5 Pagadores</p>
            {bg.top_pagadores.length === 0 ? (
              <p className="text-xs text-slate-400">Sin pagos registrados</p>
            ) : (
              <ol className="space-y-2">
                {bg.top_pagadores.map((p, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-bold text-slate-300 w-4">{i + 1}</span>
                      <span className="text-slate-700 truncate">{p.nombre}</span>
                    </div>
                    <span className="tabular-nums text-green-600 font-semibold flex-shrink-0 ml-2">{fmt(p.total)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Top deudores */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-3">Top 5 Deudores</p>
            {bg.top_deudores.length === 0 ? (
              <p className="text-xs text-slate-400">Sin deuda pendiente</p>
            ) : (
              <ol className="space-y-2">
                {bg.top_deudores.map((d, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-bold text-slate-300 w-4">{i + 1}</span>
                      <span className="text-slate-700 truncate">{d.nombre}</span>
                    </div>
                    <span className="tabular-nums text-red-500 font-semibold flex-shrink-0 ml-2">{fmt(d.deuda)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Abonos a capital */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-3">Abonos a Capital</p>
            {bg.abonos_capital.length === 0 ? (
              <p className="text-xs text-slate-400">Sin abonos a capital</p>
            ) : (
              <ol className="space-y-2">
                {bg.abonos_capital.map((a, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-bold text-slate-300 w-4">{i + 1}</span>
                      <span className="text-slate-700 truncate">{a.nombre}</span>
                    </div>
                    <span className="tabular-nums text-blue-600 font-semibold flex-shrink-0 ml-2">{fmt(a.abono)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

        </div>
      </section>

    </div>
  );
};

export default Dashboard;
