import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, AlertCircle, DollarSign, Building2, X } from 'lucide-react';
import { RentaMensual, RentasMensualResponse } from '../../../types/ingresos.types';
import { getRentasMensual, registrarPagoRenta } from '../../../services/ingresosService';

import FileDropZone from '../../../components/shared/FileDropZone';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const hoyISO = () => new Date().toISOString().split('T')[0];

// ── Badge de estatus ──────────────────────────────────────────────
const BADGE: Record<RentaMensual['estatus_pago'], string> = {
  Pagado:   'bg-emerald-100 text-emerald-700',
  Parcial:  'bg-amber-100 text-amber-700',
  Pendiente:'bg-slate-100 text-slate-500',
};
const BADGE_ICON: Record<RentaMensual['estatus_pago'], React.ReactNode> = {
  Pagado:    <CheckCircle size={11} className="inline mr-0.5" />,
  Parcial:   <AlertCircle size={11} className="inline mr-0.5" />,
  Pendiente: <Clock       size={11} className="inline mr-0.5" />,
};

// ── Modal de registro / actualización de pago ─────────────────────
interface ModalProps {
  contrato: RentaMensual;
  mes: number;
  anio: number;
  onCerrar: () => void;
  onExito: () => void;
}

const ModalPago: React.FC<ModalProps> = ({ contrato, mes, anio, onCerrar, onExito }) => {
  const esEdicion = !!contrato.pago_id;

  const [monto,     setMonto]     = useState(esEdicion ? String(contrato.monto_pagado) : '');
  const [fecha,     setFecha]     = useState(contrato.fecha_pago?.split('T')[0] ?? hoyISO());
  const [metodo,    setMetodo]    = useState<string>(contrato.metodo_pago ?? 'Efectivo');
  const [cuenta,    setCuenta]    = useState(contrato.cuenta_destino ?? '');
  const [comprobante, setComprobante] = useState(contrato.comprobante_url ?? '');
  const [comentarios, setComentarios] = useState(contrato.comentarios ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const pagado   = parseFloat(monto) || 0;
  const pactado  = contrato.monto_pactado;
  const saldo    = Math.max(0, pactado - pagado);
  const completo = pagado >= pactado && pagado > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pagado < 0) { setError('El monto no puede ser negativo.'); return; }
    setGuardando(true);
    setError('');
    try {
      await registrarPagoRenta({
        contrato_id:          contrato.contrato_id,
        mes_correspondiente:  mes,
        anio_correspondiente: anio,
        monto_pagado:         pagado,
        fecha_pago:           fecha || undefined,
        metodo_pago:          metodo || undefined,
        cuenta_destino:       (metodo !== 'Efectivo' && cuenta) ? cuenta : undefined,
        comprobante_url:      comprobante || undefined,
        comentarios:          comentarios || undefined,
      });
      onExito();
    } catch {
      setError('Error al registrar el pago. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-purple-600 px-6 py-4 flex items-start justify-between">
          <div>
            <h3 className="text-white font-bold text-base">
              {esEdicion ? 'Actualizar Pago' : 'Registrar Pago'}
            </h3>
            <p className="text-purple-200 text-xs mt-0.5 truncate max-w-[300px]">
              {contrato.inquilino_nombre} · {contrato.ubicacion_direccion}
            </p>
          </div>
          <button onClick={onCerrar} className="text-purple-200 hover:text-white mt-0.5">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* Resumen pactado */}
          <div className="flex gap-3">
            <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Renta pactada</p>
              <p className="font-bold text-slate-700 text-sm">{fmt(pactado)}</p>
            </div>
            {/* Indicador en tiempo real */}
            <div className={`flex-1 rounded-xl p-3 text-center transition-colors ${
              completo ? 'bg-emerald-50' : pagado > 0 ? 'bg-amber-50' : 'bg-slate-50'
            }`}>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                {completo ? 'Completo ✓' : 'Saldo pendiente'}
              </p>
              <p className={`font-bold text-sm ${
                completo ? 'text-emerald-600' : pagado > 0 ? 'text-amber-600' : 'text-slate-400'
              }`}>
                {completo ? '—' : saldo > 0 ? fmt(saldo) : '—'}
              </p>
            </div>
          </div>

          {/* Monto pagado */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Cantidad recibida *
            </label>
            <input
              type="number" step="0.01" min="0"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              placeholder={`Máx. ${fmt(pactado)}`}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Fecha de pago
            </label>
            <input
              type="date" value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          {/* Método + Cuenta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Método
              </label>
              <select
                value={metodo}
                onChange={e => setMetodo(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                {['Efectivo','Transferencia','Cheque','Otro'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Cuenta destino
              </label>
              <input
                value={cuenta}
                onChange={e => setCuenta(e.target.value)}
                placeholder={metodo === 'Efectivo' ? 'N/A' : 'BBVA, HSBC…'}
                disabled={metodo === 'Efectivo'}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          </div>

          {/* Comprobante drag & drop */}
          <FileDropZone
            label="Comprobante (transferencia / recibo)"
            value={comprobante}
            folder={`comprobantes/rentas`}
            onChange={setComprobante}
          />

          {/* Comentarios */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Comentarios
            </label>
            <textarea
              value={comentarios}
              onChange={e => setComentarios(e.target.value)}
              rows={2}
              placeholder="Observaciones opcionales…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCerrar}
              className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-2 text-sm font-medium hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl py-2 text-sm font-semibold transition-colors">
              {guardando ? 'Guardando…' : esEdicion ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Componente principal ─────────────────────────────────────────
const CxCInmueblesTab: React.FC<{ mes: number; anio: number }> = ({ mes, anio }) => {
  const [datos,    setDatos]  = useState<RentasMensualResponse | null>(null);
  const [cargando, setC]      = useState(true);
  const [modal,    setModal]  = useState<RentaMensual | null>(null);

  const cargar = useCallback(() => {
    setC(true);
    getRentasMensual(mes, anio).then(setDatos).catch(() => {}).finally(() => setC(false));
  }, [mes, anio]);

  useEffect(() => { cargar(); }, [cargar]);

  const t = datos?.totales;

  return (
    <div className="space-y-5">

      {/* Navegador + refresh */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={cargar}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors">
          Actualizar
        </button>
      </div>

      {/* KPIs */}
      {t && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Esperado',  valor: fmt(t.monto_esperado), color: 'text-slate-700',   bg: 'bg-slate-50',   Ic: DollarSign },
            { label: 'Cobrado',   valor: fmt(t.monto_cobrado),  color: 'text-emerald-600', bg: 'bg-emerald-50', Ic: CheckCircle },
            { label: 'Pendiente', valor: fmt(t.pendiente),      color: 'text-purple-600',  bg: 'bg-purple-50',  Ic: Building2   },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center`}>
                  <k.Ic size={18} className={k.color} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">{k.label}</p>
                  <p className={`text-lg font-bold ${k.color}`}>{k.valor}</p>
                </div>
              </div>
            </div>
          ))}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <CheckCircle size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Estatus</p>
                <p className="text-sm font-bold text-slate-700 leading-tight">
                  <span className="text-emerald-600">{t.pagados_completos}</span> pagados ·{' '}
                  <span className="text-amber-500">{t.parciales}</span> parciales ·{' '}
                  <span className="text-slate-400">{t.pendientes}</span> pend.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla */}
      {cargando ? (
        <p className="text-sm text-slate-400 text-center py-12">Cargando…</p>
      ) : !datos || datos.contratos.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">Sin contratos activos para este período.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              Contratos activos
              <span className="ml-2 text-slate-400 font-normal">
                ({datos.contratos.length} · ordenados por día de pago ↑)
              </span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-3 py-3 text-center w-8">#</th>
                  <th className="px-3 py-3 text-center">Tipo</th>
                  <th className="px-4 py-3 text-left">Inquilino / Inmueble</th>
                  <th className="px-4 py-3 text-center">Día</th>
                  <th className="px-4 py-3 text-right">Renta pactada</th>
                  <th className="px-4 py-3 text-right">Monto recibido</th>
                  <th className="px-4 py-3 text-center">Estatus</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.contratos.map((c, idx) => (
                  <tr key={c.contrato_id}
                    className={`hover:bg-slate-50 transition-colors ${c.estatus_pago === 'Pagado' ? 'opacity-60' : ''}`}>
                    <td className="px-3 py-3 text-center text-xs text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-3 py-3 text-center">
                      {c.es_renta_externa
                        ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">Externo</span>
                        : c.total_locales
                          ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Local</span>
                          : <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">Casa</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{c.inquilino_nombre}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[220px]">{c.ubicacion_direccion}</p>
                      {c.es_renta_externa && c.comision_oficina_pct && (
                        <p className="text-[10px] text-purple-500 mt-0.5">
                          Com. {c.comision_oficina_pct}% = {fmt(c.monto_pactado * c.comision_oficina_pct / 100)} · Neto {fmt(c.monto_pactado * (1 - c.comision_oficina_pct / 100))}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-600">{c.dia_corte_pago}</td>
                    <td className="px-4 py-3 text-right font-semibold text-purple-700">{fmt(c.monto_pactado)}</td>
                    <td className="px-4 py-3 text-right">
                      {c.monto_pagado > 0
                        ? <span className="font-semibold text-emerald-600">{fmt(c.monto_pagado)}</span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${BADGE[c.estatus_pago]}`}>
                        {BADGE_ICON[c.estatus_pago]}{c.estatus_pago}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setModal(c)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          c.estatus_pago === 'Pagado'
                            ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        {c.estatus_pago === 'Pagado' ? 'Editar' : c.estatus_pago === 'Parcial' ? 'Completar' : 'Registrar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {t && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-slate-600">Totales</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-purple-700">{fmt(t.monto_esperado)}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600">{fmt(t.monto_cobrado)}</td>
                    <td colSpan={2} className="px-4 py-3 text-right text-sm font-bold text-slate-500">
                      Pendiente: {fmt(t.pendiente)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {modal && (
        <ModalPago
          contrato={modal}
          mes={mes}
          anio={anio}
          onCerrar={() => setModal(null)}
          onExito={() => { setModal(null); cargar(); }}
        />
      )}
    </div>
  );
};

export default CxCInmueblesTab;
