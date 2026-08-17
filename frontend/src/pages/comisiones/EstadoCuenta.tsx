import { useEffect, useState } from 'react';
import { Search, FileText, X } from 'lucide-react';
import { listarPersonas } from '../../services/personasService';
import { Persona } from '../../types/persona.types';
import { getEstadoCuenta, EstadoCuenta as EC } from '../../services/comisionesService';

// T-010 · Estado de cuenta por persona (solo lectura).
// Buscador de persona → saldo por concepto + detalle de devengos.

const nombreCompleto = (p: Persona) =>
  `${p.nombre} ${p.apellido_paterno}${p.apellido_materno ? ' ' + p.apellido_materno : ''}`;
const money = (s: string) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(s));

const estadoBadge: Record<string, string> = {
  pendiente: 'bg-slate-100 text-slate-600',
  parcial: 'bg-amber-50 text-amber-700',
  pagado: 'bg-green-50 text-green-700',
};

export default function EstadoCuenta() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<Persona[]>([]);
  const [data, setData] = useState<EC | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (persona || q.trim().length < 2) { setResultados([]); return; }
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const r = await listarPersonas(q.trim());
        if (vivo) setResultados(r);
      } catch { if (vivo) setResultados([]); }
    }, 250);
    return () => { vivo = false; clearTimeout(t); };
  }, [q, persona]);

  useEffect(() => {
    if (!persona) { setData(null); return; }
    let vivo = true;
    setCargando(true); setError('');
    getEstadoCuenta(persona.id)
      .then((d) => { if (vivo) setData(d); })
      .catch((e: any) => { if (vivo) setError(e?.response?.data?.mensaje ?? 'No se pudo cargar el estado de cuenta.'); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [persona]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <FileText size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Estado de cuenta</h1>
          <p className="text-sm text-slate-500">Devengado, pagado y acumulado por persona.</p>
        </div>
      </div>

      {/* Buscador */}
      {persona ? (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-blue-50 rounded-xl border border-blue-100 mb-4">
          <span className="text-sm font-medium text-slate-800">{nombreCompleto(persona)}</span>
          <button onClick={() => { setPersona(null); setQ(''); }} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white" aria-label="Cambiar">
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar persona por nombre…"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
          />
          {resultados.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-lg max-h-56 overflow-y-auto">
              {resultados.map((p) => (
                <li key={p.id}>
                  <button onClick={() => setPersona(p)} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    {nombreCompleto(p)}<span className="text-slate-400"> · {p.telefono}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {cargando && <p className="text-sm text-slate-500">Cargando…</p>}

      {data && !cargando && (
        <>
          {/* Saldo por concepto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {data.saldo.length === 0 && (
              <p className="text-sm text-slate-500 bg-white border border-slate-100 rounded-xl px-4 py-6 text-center sm:col-span-2">Sin devengos registrados.</p>
            )}
            {data.saldo.map((s) => (
              <div key={s.concepto} className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">{s.concepto}</div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-slate-500">Acumulado</span>
                  <span className="text-lg font-semibold text-slate-800">{money(s.acumulado)}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500 flex justify-between">
                  <span>Devengado {money(s.devengado)}</span>
                  <span>Pagado {money(s.pagado)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Detalle de devengos */}
          {data.devengos.length > 0 && (
            <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="px-3 py-2 font-medium">Periodo</th>
                    <th className="px-3 py-2 font-medium">Concepto</th>
                    <th className="px-3 py-2 font-medium text-right">Devengado</th>
                    <th className="px-3 py-2 font-medium text-right">Pagado</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.devengos.map((d) => (
                    <tr key={d.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-3 py-2 text-slate-700">{new Date(d.periodo).toISOString().slice(0, 7)}</td>
                      <td className="px-3 py-2 text-slate-600">{d.concepto}</td>
                      <td className="px-3 py-2 text-right text-slate-800">{money(d.monto_devengado)}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{money(d.monto_pagado)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${estadoBadge[d.estado]}`}>{d.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
