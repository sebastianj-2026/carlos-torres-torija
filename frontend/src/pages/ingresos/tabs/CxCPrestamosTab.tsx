import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, DollarSign, Clock, Zap, RefreshCw } from 'lucide-react';
import { logError } from '../../../utils/logError';
import { ProyeccionPrestamo, ProyeccionCxCResponse, EstatusProyeccion } from '../../../types/ingresos.types';
import {
  getProyeccionCxCPrestamos,
  generarMesCxCPrestamos,
  cobrarPrestamo,
} from '../../../services/ingresosService';


const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(n);

const FORMAS_PAGO = ['efectivo', 'transferencia', 'tarjeta'] as const;

// ── Chip de estatus ──────────────────────────────────────────────
const EstatusChip: React.FC<{ estatus: EstatusProyeccion }> = ({ estatus }) => {
  const cfg = {
    Cobrado:      { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle size={12} /> },
    Pendiente:    { bg: 'bg-amber-50   text-amber-700   border-amber-200',   icon: <Clock size={12} /> },
    'Por Generar':{ bg: 'bg-slate-50   text-slate-500   border-slate-200',   icon: <Zap size={12} /> },
  }[estatus];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${cfg.bg}`}>
      {cfg.icon} {estatus}
    </span>
  );
};

// ── Modal de cobro ───────────────────────────────────────────────
interface ModalCobroProps {
  prestamo: ProyeccionPrestamo;
  mes: number;
  anio: number;
  onCerrar: () => void;
  onExito: () => void;
}

const ModalCobroPrestamo: React.FC<ModalCobroProps> = ({ prestamo, mes, anio, onCerrar, onExito }) => {
  const [interes,   setInteres]   = useState(prestamo.pendiente_interes.toFixed(2));
  const [capital,   setCapital]   = useState('0');
  const [formaPago, setFormaPago] = useState<string>('efectivo');
  const [notas,     setNotas]     = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const i = parseFloat(interes) || 0;
    const k = parseFloat(capital) || 0;
    if (i <= 0 && k <= 0) { setError('Ingresa al menos interés o abono a capital.'); return; }
    setGuardando(true);
    setError('');
    try {
      await cobrarPrestamo(prestamo.id, {
        interes_pagado: i,
        abono_capital:  k || undefined,
        forma_pago:     formaPago,
        periodo_mes:    mes,
        periodo_anio:   anio,
        notas:          notas || undefined,
      });
      onExito();
    } catch {
      setError('Error al registrar el cobro. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[90vw] sm:max-w-md mx-0 overflow-hidden">
        <div className="bg-blue-600 px-6 py-4">
          <h3 className="text-white font-bold text-lg">Registrar Pago</h3>
          <p className="text-blue-100 text-sm mt-0.5">{prestamo.cliente_nombre} · Folio {prestamo.folio}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Capital</p>
              <p className="font-bold text-slate-700">{fmt(prestamo.capital_prestado)}</p>
            </div>
            <div className="bg-sky-50 rounded-xl p-3">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Interés</p>
              <p className="font-bold text-sky-600">{fmt(prestamo.monto_interes)}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Pendiente</p>
              <p className="font-bold text-emerald-600">{fmt(prestamo.pendiente_interes)}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Interés Pagado</label>
            <input
              type="number" step="0.01" min="0" value={interes}
              onChange={e => setInteres(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Abono a Capital <span className="text-slate-300 font-normal">(opcional)</span>
            </label>
            <input
              type="number" step="0.01" min="0" value={capital}
              onChange={e => setCapital(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Forma de Pago</label>
            <select
              value={formaPago} onChange={e => setFormaPago(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 capitalize"
            >
              {FORMAS_PAGO.map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Notas <span className="text-slate-300 font-normal">(opcional)</span>
            </label>
            <input
              type="text" value={notas} onChange={e => setNotas(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="p. ej. efectivo en oficina"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onCerrar}
              className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={guardando}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl py-2 text-sm font-semibold transition-colors"
            >
              {guardando ? 'Registrando…' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Fila de tabla ────────────────────────────────────────────────
interface FilaProps {
  prestamo: ProyeccionPrestamo;
  onCobrar: (p: ProyeccionPrestamo) => void;
}

const FilaPrestamo: React.FC<FilaProps> = ({ prestamo: p, onCobrar }) => (
  <tr className={`hover:bg-slate-50 ${p.estatus_proyeccion === 'Cobrado' ? 'opacity-50' : ''}`}>
    <td className="px-4 py-3 text-sm text-center font-mono text-slate-500 w-14 hidden sm:table-cell">{p.dia_pago}</td>
    <td className="px-4 py-3 text-sm">
      <p className="text-slate-800 font-medium">{p.cliente_nombre}</p>
      <p className="text-xs text-slate-400">Folio {p.folio} · {p.tasa_interes_mensual}% mensual</p>
    </td>
    <td className="px-4 py-3 text-right text-sm text-blue-700 font-semibold hidden sm:table-cell">{fmt(p.capital_prestado)}</td>
    <td className="px-4 py-3 text-right text-sm font-bold text-sky-600">{fmt(p.monto_interes)}</td>
    <td className="px-4 py-3 text-center">
      <EstatusChip estatus={p.estatus_proyeccion} />
    </td>
    <td className="px-4 py-3 text-center">
      {p.estatus_proyeccion === 'Pendiente' && (
        <button
          onClick={() => onCobrar(p)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Registrar Pago
        </button>
      )}
      {p.estatus_proyeccion === 'Cobrado' && (
        <span className="flex items-center justify-center gap-1 text-emerald-600 text-xs font-medium">
          <CheckCircle size={14} /> Completo
        </span>
      )}
    </td>
  </tr>
);

// ── Componente principal ─────────────────────────────────────────
const CxCPrestamosTab: React.FC<{ mes: number; anio: number }> = ({ mes, anio }) => {
  const [datos,     setDatos]     = useState<ProyeccionCxCResponse | null>(null);
  const [cargando,  setCargando]  = useState(true);
  const [generando, setGenerando] = useState(false);
  const [modal,     setModal]     = useState<ProyeccionPrestamo | null>(null);
  const [msgGen,    setMsgGen]    = useState('');

  const cargar = useCallback(() => {
    setCargando(true);
    setMsgGen('');
    getProyeccionCxCPrestamos(mes, anio)
      .then(setDatos)
      .catch(logError)
      .finally(() => setCargando(false));
  }, [mes, anio]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleGenerarMes = async () => {
    if (!window.confirm(`¿Generar obligaciones de cobro para ${mes}/${anio}? Esto creará registros para todos los préstamos activos.`)) return;
    setGenerando(true);
    try {
      const r = await generarMesCxCPrestamos(mes, anio);
      setMsgGen(r.mensaje);
      cargar();
    } catch {
      setMsgGen('Error al generar. Intenta de nuevo.');
    } finally {
      setGenerando(false);
    }
  };

  const t = datos?.totales;

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={cargar}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <RefreshCw size={14} /> Actualizar
        </button>
        <button
          onClick={handleGenerarMes}
          disabled={generando}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <Zap size={14} /> {generando ? 'Generando…' : 'Generar Cobros del Mes'}
        </button>
        {msgGen && (
          <span className="text-xs text-emerald-600 font-medium">{msgGen}</span>
        )}
      </div>

      {/* KPIs */}
      {t && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Interés Esperado', valor: fmt(t.total_esperado),  color: 'text-slate-700',   bg: 'bg-slate-50',   icon: <DollarSign size={18} className="text-slate-500" /> },
            { label: 'Ya Cobrado',       valor: fmt(t.total_cobrado),   color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <CheckCircle size={18} className="text-emerald-600" /> },
            { label: 'Pendiente',        valor: fmt(t.total_pendiente), color: 'text-amber-600',   bg: 'bg-amber-50',   icon: <Clock size={18} className="text-amber-600" /> },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center`}>{k.icon}</div>
                <div>
                  <p className="text-xs text-slate-400">{k.label}</p>
                  <p className={`text-lg font-bold ${k.color}`}>{k.valor}</p>
                </div>
              </div>
            </div>
          ))}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Zap size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Estado</p>
                <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                  <span className="text-emerald-600">{t.cobrados} cobrados</span>
                  {' · '}
                  <span className="text-amber-600">{t.pendientes} pendientes</span>
                  {' · '}
                  <span className="text-slate-400">{t.por_generar} por generar</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla */}
      {cargando ? (
        <p className="text-sm text-slate-400 text-center py-12">Cargando proyección…</p>
      ) : !datos || datos.prestamos.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">Sin préstamos activos para este período.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              Proyección de Cobros
              <span className="ml-2 text-slate-400 font-normal">
                ({datos.prestamos.length} préstamos · orden día de pago ↑)
              </span>
            </h3>
          </div>
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-center hidden sm:table-cell">Día</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-right text-blue-600 hidden sm:table-cell">Capital</th>
                  <th className="px-4 py-3 text-right text-sky-500">Interés a Cobrar</th>
                  <th className="px-4 py-3 text-center">Estatus</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.prestamos.map(p => (
                  <FilaPrestamo key={p.id} prestamo={p} onCobrar={setModal} />
                ))}
              </tbody>
              {t && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-slate-600">Totales</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-blue-700 hidden sm:table-cell">
                      {fmt(datos.prestamos.reduce((s, p) => s + p.capital_prestado, 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-sky-600">{fmt(t.total_esperado)}</td>
                    <td />
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {modal && (
        <ModalCobroPrestamo
          prestamo={modal}
          mes={mes}
          anio={anio}
          onCerrar={() => setModal(null)}
          onExito={() => { setModal(null); cargar(); }}
        />
      )}
    </div>
  );
};

export default CxCPrestamosTab;
