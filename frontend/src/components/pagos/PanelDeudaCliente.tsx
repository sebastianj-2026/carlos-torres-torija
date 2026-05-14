import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, FileText, ExternalLink, RefreshCw } from 'lucide-react';
import { DeudaActivaCliente, PagoGlobal, DeudaOrigen } from '../../types/pagos.types';
import { deudaActivaCliente, historialPorCliente } from '../../services/pagosService';
import ModalPagoFlash from './ModalPagoFlash';

const fmt = (n: number | string) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })
    .format(Number(n));

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

interface PanelDeudaClienteProps {
  clienteId: string;
  nombreCliente: string;
}

const MODULO_BADGE: Record<string, string> = {
  prestamo: 'bg-blue-100 text-blue-700',
  renta:    'bg-purple-100 text-purple-700',
};
const MODULO_LABEL: Record<string, string> = { prestamo: 'Préstamo', renta: 'Renta' };

const ESTATUS_BADGE: Record<string, string> = {
  activo:    'bg-emerald-100 text-emerald-700',
  atrasado:  'bg-red-100 text-red-700',
  liquidado: 'bg-slate-100 text-slate-500',
};

const PanelDeudaCliente: React.FC<PanelDeudaClienteProps> = ({ clienteId, nombreCliente }) => {
  const [deuda,    setDeuda]    = useState<DeudaActivaCliente | null>(null);
  const [historial, setHistorial] = useState<PagoGlobal[]>([]);
  const [cargando, setCargando]  = useState(true);
  const [deudaModal, setDeudaModal] = useState<DeudaOrigen | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    Promise.all([
      deudaActivaCliente(clienteId),
      historialPorCliente(clienteId),
    ])
      .then(([d, h]) => { setDeuda(d); setHistorial(h); })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [clienteId]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirModal = (p: DeudaActivaCliente['prestamos'][0]) => {
    setDeudaModal({
      modulo_origen: 'prestamo',
      referencia_id: p.id,
      cliente_id:    clienteId,
      descripcion:   `Folio ${p.folio}`,
      saldo_actual:  parseFloat(p.saldo_pendiente),
    });
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText size={16} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Deuda en Préstamos</p>
              <p className="text-base font-bold text-blue-700">{fmt(deuda?.total_prestamos ?? 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <DollarSign size={16} className="text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Deuda en Rentas</p>
              <p className="text-base font-bold text-purple-700">{fmt(deuda?.total_rentas ?? 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
              <DollarSign size={16} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-orange-500">Deuda Total Activa</p>
              <p className="text-base font-bold text-orange-700">{fmt(deuda?.total_activo ?? 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Préstamos activos */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Préstamos con saldo activo</h3>
          <button onClick={cargar}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Actualizar">
            <RefreshCw size={14} />
          </button>
        </div>

        {!deuda?.prestamos.length ? (
          <p className="text-sm text-slate-400 py-4 text-center">Sin préstamos activos.</p>
        ) : (
          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-left">Folio</th>
                  <th className="px-4 py-2.5 text-right">Saldo pendiente</th>
                  <th className="px-4 py-2.5 text-center">Próximo pago</th>
                  <th className="px-4 py-2.5 text-center">Estatus</th>
                  <th className="px-4 py-2.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deuda.prestamos.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-700">{p.folio}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(p.saldo_pendiente)}</td>
                    <td className="px-4 py-3 text-center text-slate-500">
                      {p.fecha_proximo_pago ? fmtFecha(p.fecha_proximo_pago) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTATUS_BADGE[p.estatus] ?? 'bg-slate-100 text-slate-500'}`}>
                        {p.estatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => abrirModal(p)}
                        className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Abonar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Historial de pagos */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Historial de pagos — {nombreCliente}
        </h3>

        {!historial.length ? (
          <p className="text-sm text-slate-400 py-4 text-center">Sin pagos registrados aún.</p>
        ) : (
          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-left">Módulo</th>
                  <th className="px-4 py-2.5 text-left">Fecha</th>
                  <th className="px-4 py-2.5 text-right">Monto</th>
                  <th className="px-4 py-2.5 text-left">Notas</th>
                  <th className="px-4 py-2.5 text-center">Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historial.map(pago => (
                  <tr key={pago.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MODULO_BADGE[pago.modulo_origen] ?? ''}`}>
                        {MODULO_LABEL[pago.modulo_origen] ?? pago.modulo_origen}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{fmtFecha(pago.fecha_pago)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{fmt(pago.monto_pagado)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[160px] truncate">{pago.notas ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {pago.url_recibo ? (
                        <a
                          href={`${(process.env.REACT_APP_API_URL ?? 'http://localhost:4000/api').replace('/api', '')}${pago.url_recibo}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <ExternalLink size={12} />
                          Ver
                        </a>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de pago */}
      <ModalPagoFlash
        deuda={deudaModal}
        onCerrar={() => setDeudaModal(null)}
        onExito={() => { setDeudaModal(null); cargar(); }}
      />
    </>
  );
};

export default PanelDeudaCliente;
