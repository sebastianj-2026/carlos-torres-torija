import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle, Loader2, SlidersHorizontal, X } from 'lucide-react';
import { logError } from '../../../utils/logError';
import { Empleado, NominaPagada, TipoHoraExtra } from '../../../types/nominas.types';
import {
  listarEmpleados, pagarNomina, pagarBase, logIncidencias,
} from '../../../services/nominasService';

const HORAS_SEMANA = 48;
const MULT: Record<TipoHoraExtra, number> = { Normal: 1, Doble: 2, Triple: 3 };

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(n);

const fmtFecha = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const getLunes = () => {
  const d = new Date();
  const off = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + off);
  return d.toISOString().split('T')[0];
};

const addDays = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

// ── Per-row state ──────────────────────────────────────────────────
interface FilaSimple {
  empleado_id: string;
  nombre: string;
  puesto: string;
  sueldo_base: number;
  prestamo_folio: string | null;
  prestamo_saldo: number;
  abono: number;
  pagado: boolean;
  pagando: boolean;
  error: string;
}

const buildFila = (e: Empleado): FilaSimple => ({
  empleado_id:    e.id,
  nombre:         e.nombre,
  puesto:         e.puesto,
  sueldo_base:    parseFloat(e.sueldo_semanal),
  prestamo_folio: e.prestamo_folio,
  prestamo_saldo: parseFloat(e.prestamo_saldo ?? '0') || 0,
  abono:          0,
  pagado:         false,
  pagando:        false,
  error:          '',
});

// ── Modal state ────────────────────────────────────────────────────
interface ModalState {
  fila: FilaSimple;
  horas_qty: number;
  horas_tipo: TipoHoraExtra;
  bonos: number;
  faltas_dias: number;
  ajuste_monto: number;
  ajuste_concepto: string;
  abono: number;
  pagando: boolean;
}

const initModal = (f: FilaSimple): ModalState => ({
  fila: f,
  horas_qty: 0, horas_tipo: 'Normal',
  bonos: 0,
  faltas_dias: 0,
  ajuste_monto: 0, ajuste_concepto: '',
  abono: f.abono,
  pagando: false,
});

// ── Log helpers ────────────────────────────────────────────────────
const logDesc = (n: NominaPagada): string[] => {
  const items: string[] = [];
  if (parseFloat(n.horas_extras_cantidad) > 0)
    items.push(`+${n.horas_extras_cantidad} hrs ${n.tipo_hora_extra ?? ''}`);
  if (parseFloat(n.bonos) > 0)
    items.push(`Bono ${fmt(parseFloat(n.bonos))}`);
  if (parseFloat(n.faltas_cantidad) > 0)
    items.push(`−${n.faltas_cantidad} falta(s)`);
  if (n.ajuste_concepto)
    items.push(`Ajuste: ${n.ajuste_concepto}`);
  return items;
};

// ══════════════════════════════════════════════════════════════════
const GeneradorNominaTab: React.FC = () => {
  const lunesInit = getLunes();
  const hoy       = new Date().toISOString().split('T')[0];

  const [inicio,  setInicio]  = useState(lunesInit);
  const [fin,     setFin]     = useState(addDays(lunesInit, 6));
  const [filas,   setFilas]   = useState<FilaSimple[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal,       setModal]       = useState<ModalState | null>(null);
  const [log,         setLog]         = useState<NominaPagada[]>([]);
  const [logCargando, setLogCargando] = useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    listarEmpleados()
      .then(emps => setFilas(emps.filter(e => e.estatus !== 'Inactivo').map(buildFila)))
      .catch(logError)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const updFila = useCallback((id: string, patch: Partial<FilaSimple>) => {
    setFilas(prev => prev.map(f => f.empleado_id === id ? { ...f, ...patch } : f));
  }, []);

  // ── Pagar Normal ────────────────────────────────────────────────
  const pagarNormal = async (f: FilaSimple) => {
    updFila(f.empleado_id, { pagando: true, error: '' });
    try {
      await pagarBase({
        empleado_id:        f.empleado_id,
        semana_inicio:      inicio,
        semana_fin:         fin,
        descuento_prestamo: f.abono || undefined,
      });
      updFila(f.empleado_id, { pagado: true, pagando: false });
    } catch {
      updFila(f.empleado_id, { pagando: false, error: 'Error al pagar' });
    }
  };

  // ── Abrir modal ─────────────────────────────────────────────────
  const abrirModal = (f: FilaSimple) => {
    setModal(initModal(f));
    setLog([]);
    setLogCargando(true);
    logIncidencias(f.empleado_id)
      .then(setLog)
      .catch(logError)
      .finally(() => setLogCargando(false));
  };

  // ── Confirmar pago ajustado ─────────────────────────────────────
  const confirmarAjustado = async () => {
    if (!modal) return;
    const m = modal;
    const horas_monto = m.horas_qty > 0
      ? parseFloat(((m.fila.sueldo_base / HORAS_SEMANA) * m.horas_qty * MULT[m.horas_tipo]).toFixed(2))
      : 0;
    const faltas_monto = m.faltas_dias > 0
      ? parseFloat(((m.fila.sueldo_base / 6) * m.faltas_dias).toFixed(2))
      : 0;

    setModal(prev => prev ? { ...prev, pagando: true } : null);
    try {
      await pagarNomina({
        empleado_id:           m.fila.empleado_id,
        semana_inicio:         inicio,
        semana_fin:            fin,
        horas_extras_cantidad: m.horas_qty    || undefined,
        tipo_hora_extra:       m.horas_qty > 0 ? m.horas_tipo : undefined,
        monto_horas_extras:    horas_monto,
        bonos:                 m.bonos        || undefined,
        faltas_cantidad:       m.faltas_dias  || undefined,
        monto_faltas:          faltas_monto,
        ajuste_monto:          m.ajuste_monto || undefined,
        ajuste_concepto:       m.ajuste_concepto || undefined,
        descuento_prestamo:    m.abono        || undefined,
      });
      updFila(m.fila.empleado_id, { pagado: true });
      setModal(null);
    } catch {
      setModal(prev => prev ? { ...prev, pagando: false } : null);
    }
  };

  // ── Modal computed total ────────────────────────────────────────
  const modalTotal = useMemo(() => {
    if (!modal) return 0;
    const horas_monto  = modal.horas_qty > 0
      ? parseFloat(((modal.fila.sueldo_base / HORAS_SEMANA) * modal.horas_qty * MULT[modal.horas_tipo]).toFixed(2))
      : 0;
    const faltas_monto = modal.faltas_dias > 0
      ? parseFloat(((modal.fila.sueldo_base / 6) * modal.faltas_dias).toFixed(2))
      : 0;
    return Math.max(0,
      modal.fila.sueldo_base + horas_monto + modal.bonos + modal.ajuste_monto - faltas_monto - modal.abono
    );
  }, [modal]);

  const totalGeneral = useMemo(() =>
    filas.reduce((s, f) => s + Math.max(0, f.sueldo_base - f.abono), 0), [filas]);

  if (loading) return <p className="text-sm text-slate-400 text-center py-10">Cargando empleados…</p>;
  if (!filas.length) return <p className="text-sm text-slate-400 text-center py-10">Sin empleados activos.</p>;

  return (
    <div className="space-y-4">
      {/* Period header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Semana inicio</label>
          <input type="date" value={inicio} max={hoy}
            onChange={e => { setInicio(e.target.value); setFin(addDays(e.target.value, 6)); }}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Semana fin</label>
          <input type="date" value={fin} max={hoy}
            onChange={e => setFin(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
        </div>
        <div className="ml-auto text-sm">
          <span className="text-slate-400">Plantilla estimada: </span>
          <span className="font-black text-sky-600 text-base">{fmt(totalGeneral)}</span>
        </div>
      </div>

      {/* Clean table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left font-semibold">Empleado</th>
              <th className="px-4 py-3 text-left font-semibold">Área</th>
              <th className="px-4 py-3 text-right font-semibold">Sueldo Base</th>
              <th className="px-4 py-3 text-right font-semibold">Préstamo a Descontar</th>
              <th className="px-4 py-3 text-right font-semibold bg-sky-50">Total a Pagar</th>
              <th className="px-3 py-3 text-center font-semibold" colSpan={2}>Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filas.map(f => {
              const total = Math.max(0, f.sueldo_base - f.abono);
              return (
                <tr key={f.empleado_id}
                  className={`hover:bg-slate-50/60 transition-colors ${f.pagado ? 'opacity-40' : ''}`}>

                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-800">{f.nombre}</p>
                  </td>

                  <td className="px-4 py-3 text-slate-500">{f.puesto}</td>

                  <td className="px-4 py-3 text-right font-bold text-slate-700 whitespace-nowrap">
                    {fmt(f.sueldo_base)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {f.prestamo_folio ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <input
                          type="number" min={0} step={1} placeholder="0"
                          value={f.abono || ''}
                          onChange={e => updFila(f.empleado_id, { abono: parseFloat(e.target.value) || 0 })}
                          className="w-24 border border-amber-200 rounded-lg px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-amber-300 bg-amber-50"
                        />
                        <span className="text-[10px] text-amber-500">Saldo: {fmt(f.prestamo_saldo)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 bg-sky-50 text-right font-black text-sky-700 text-base whitespace-nowrap">
                    {fmt(total)}
                  </td>

                  {/* Pagar Normal */}
                  <td className="px-2 py-3 text-center">
                    {f.pagado ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                        <CheckCircle size={13} /> Pagado
                      </span>
                    ) : f.error ? (
                      <span className="text-red-500 text-xs">{f.error}</span>
                    ) : (
                      <button
                        onClick={() => pagarNormal(f)}
                        disabled={f.pagando}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-40 text-xs"
                      >
                        {f.pagando ? <Loader2 size={11} className="animate-spin" /> : null}
                        Pagar Normal
                      </button>
                    )}
                  </td>

                  {/* Ajustar */}
                  <td className="px-2 py-3 text-center">
                    {!f.pagado && (
                      <button
                        onClick={() => abrirModal(f)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg transition-colors text-xs"
                      >
                        <SlidersHorizontal size={11} /> Ajustar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-xs font-bold">
            <tr>
              <td className="px-5 py-2.5 text-slate-500" colSpan={4}>Total semana</td>
              <td className="px-4 py-2.5 bg-sky-100 text-right text-sky-700 text-sm">{fmt(totalGeneral)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">{modal.fila.nombre}</h3>
                <p className="text-xs text-slate-400">
                  {modal.fila.puesto} · Semana {fmtFecha(inicio)} — {fmtFecha(fin)}
                </p>
              </div>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Body: two columns */}
            <div className="flex flex-1 overflow-hidden divide-x divide-slate-100">

              {/* LEFT — form */}
              <div className="flex-1 p-6 overflow-y-auto space-y-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ajustes de la semana</p>

                {/* Horas extras */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Horas Extras</label>
                  <div className="flex gap-2">
                    <input type="number" min={0} step={0.5} placeholder="Cantidad"
                      value={modal.horas_qty || ''}
                      onChange={e => setModal(m => m ? { ...m, horas_qty: parseFloat(e.target.value) || 0 } : null)}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300" />
                    <select value={modal.horas_tipo}
                      disabled={modal.horas_qty <= 0}
                      onChange={e => setModal(m => m ? { ...m, horas_tipo: e.target.value as TipoHoraExtra } : null)}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-300 disabled:opacity-30">
                      <option value="Normal">Normal ×1</option>
                      <option value="Doble">Doble ×2</option>
                      <option value="Triple">Triple ×3</option>
                    </select>
                  </div>
                  {modal.horas_qty > 0 && (
                    <p className="text-xs text-emerald-600 text-right">
                      + {fmt(parseFloat(((modal.fila.sueldo_base / HORAS_SEMANA) * modal.horas_qty * MULT[modal.horas_tipo]).toFixed(2)))}
                    </p>
                  )}
                </div>

                {/* Bonos */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Bono</label>
                  <input type="number" min={0} step={1} placeholder="Monto"
                    value={modal.bonos || ''}
                    onChange={e => setModal(m => m ? { ...m, bonos: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300" />
                </div>

                {/* Faltas */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Faltas (días)</label>
                  <input type="number" min={0} step={0.5} placeholder="Días"
                    value={modal.faltas_dias || ''}
                    onChange={e => setModal(m => m ? { ...m, faltas_dias: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300" />
                  {modal.faltas_dias > 0 && (
                    <p className="text-xs text-red-500 text-right">
                      − {fmt(parseFloat(((modal.fila.sueldo_base / 6) * modal.faltas_dias).toFixed(2)))}
                    </p>
                  )}
                </div>

                {/* Ajuste libre */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Ajuste libre</label>
                  <div className="flex gap-2">
                    <input type="number" step={1} placeholder="Monto (+ / −)"
                      value={modal.ajuste_monto || ''}
                      onChange={e => setModal(m => m ? { ...m, ajuste_monto: parseFloat(e.target.value) || 0 } : null)}
                      className="w-32 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300" />
                    <input type="text" placeholder="Concepto del ajuste…"
                      value={modal.ajuste_concepto}
                      onChange={e => setModal(m => m ? { ...m, ajuste_concepto: e.target.value } : null)}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300" />
                  </div>
                </div>

                {/* Descuento préstamo */}
                {modal.fila.prestamo_folio && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Descuento préstamo</label>
                    <input type="number" min={0} step={1}
                      value={modal.abono || ''}
                      onChange={e => setModal(m => m ? { ...m, abono: parseFloat(e.target.value) || 0 } : null)}
                      className="w-full border border-amber-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300 bg-amber-50" />
                    <p className="text-[10px] text-amber-500">Saldo actual: {fmt(modal.fila.prestamo_saldo)}</p>
                  </div>
                )}

                {/* Total dinámico */}
                <div className="bg-sky-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600">Total a pagar</span>
                  <span className="text-xl font-black text-sky-600">{fmt(modalTotal)}</span>
                </div>

                <button
                  onClick={confirmarAjustado}
                  disabled={modal.pagando}
                  className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
                >
                  {modal.pagando ? <Loader2 size={14} className="animate-spin" /> : null}
                  Confirmar Pago Ajustado
                </button>
              </div>

              {/* RIGHT — log */}
              <div className="w-72 p-6 overflow-y-auto bg-slate-50/40 flex-shrink-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Incidencias recientes</p>
                {logCargando ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-slate-300" />
                  </div>
                ) : log.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">Sin incidencias registradas.</p>
                ) : (
                  <ol className="relative border-l border-slate-200 space-y-5 ml-2">
                    {log.map(n => (
                      <li key={n.id} className="ml-4">
                        <span className="absolute -left-[5px] w-2.5 h-2.5 bg-sky-400 rounded-full ring-2 ring-white" />
                        <p className="text-xs font-semibold text-slate-700">
                          {fmtFecha(n.semana_inicio)} — {fmtFecha(n.semana_fin)}
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {logDesc(n).map((desc, i) => (
                            <li key={i} className="text-xs text-slate-500">{desc}</li>
                          ))}
                        </ul>
                        <p className="text-xs font-bold text-sky-600 mt-1">
                          Total: {fmt(parseFloat(n.monto_total_pagado))}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneradorNominaTab;
