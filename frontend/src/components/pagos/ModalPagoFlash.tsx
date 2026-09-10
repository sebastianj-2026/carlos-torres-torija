import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, CheckCircle } from 'lucide-react';
import { DeudaOrigen, RegistrarPagoResponse } from '../../types/pagos.types';
import { registrarPago } from '../../services/pagosService';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(n);

interface ModalPagoFlashProps {
  deuda: DeudaOrigen | null;
  onCerrar: () => void;
  onExito: (resultado: RegistrarPagoResponse) => void;
}

const ModalPagoFlash: React.FC<ModalPagoFlashProps> = ({ deuda, onCerrar, onExito }) => {
  const [monto, setMonto]       = useState('');
  const [notas, setNotas]       = useState('');
  const [archivo, setArchivo]   = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [exito, setExito]       = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!deuda) return null;

  const montoNum   = parseFloat(monto) || 0;
  const nuevoSaldo = Math.max(0, deuda.saldo_actual - montoNum);
  const hoy        = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!montoNum || montoNum <= 0) { setError('El monto debe ser mayor a cero.'); return; }
    if (montoNum > deuda.saldo_actual) { setError('El monto supera el saldo pendiente.'); return; }

    setEnviando(true);
    try {
      const resultado = await registrarPago({
        modulo_origen: deuda.modulo_origen,
        referencia_id: deuda.referencia_id,
        cliente_id:    deuda.cliente_id,
        monto_pagado:  montoNum,
        notas:         notas || undefined,
        recibo:        archivo ?? undefined,
      });
      setExito(true);
      setTimeout(() => { onExito(resultado); onCerrar(); }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.mensaje ?? 'Error al registrar el pago.');
    } finally {
      setEnviando(false);
    }
  };

  const MODULO_LABEL: Record<string, string> = { prestamo: 'Préstamo', renta: 'Renta' };
  const MODULO_COLOR: Record<string, string> = {
    prestamo: 'bg-blue-100 text-blue-700',
    renta:    'bg-purple-100 text-purple-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[90vw] sm:max-w-md mx-0 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MODULO_COLOR[deuda.modulo_origen]}`}>
              {MODULO_LABEL[deuda.modulo_origen]}
            </span>
            <h2 className="text-base font-semibold text-slate-800">Registrar pago</h2>
          </div>
          <button onClick={onCerrar} disabled={enviando}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Descripción */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
          <p className="text-xs text-slate-500 truncate">{deuda.descripcion}</p>
          <p className="text-lg font-bold text-slate-800 mt-0.5">Saldo actual: {fmt(deuda.saldo_actual)}</p>
        </div>

        {/* Éxito */}
        {exito ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <CheckCircle size={48} className="text-emerald-500" />
            <p className="text-base font-semibold text-emerald-700">¡Pago registrado!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {/* Fecha bloqueada */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Fecha de pago</label>
              <div className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-400 bg-slate-50 cursor-not-allowed">
                {hoy}
              </div>
            </div>

            {/* Monto */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Monto a pagar *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={deuda.saldo_actual}
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-7 pr-4 py-3 border border-slate-200 rounded-xl text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
            </div>

            {/* Nuevo saldo dinámico */}
            {montoNum > 0 && (
              <div className={`rounded-xl px-4 py-2.5 flex items-center justify-between text-sm ${
                nuevoSaldo === 0
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-sky-50 border border-sky-200'
              }`}>
                <span className="text-slate-600 font-medium">Nuevo saldo pendiente:</span>
                <span className={`font-bold ${nuevoSaldo === 0 ? 'text-emerald-600' : 'text-sky-600'}`}>
                  {nuevoSaldo === 0 ? '¡Liquidado! ' : ''}{fmt(nuevoSaldo)}
                </span>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Notas (opcional)</label>
              <input
                type="text"
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Referencia, folio de transferencia…"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>

            {/* Archivo */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Recibo (opcional)</label>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={e => setArchivo(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-2.5 text-sm text-slate-500 hover:border-sky-300 hover:text-sky-500 transition-colors"
              >
                <Upload size={16} />
                {archivo ? archivo.name : 'Subir PDF o imagen'}
              </button>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            {/* Acciones */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onCerrar}
                disabled={enviando}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando || !montoNum}
                className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {enviando ? <Loader2 size={16} className="animate-spin" /> : null}
                {enviando ? 'Guardando…' : 'Confirmar pago'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ModalPagoFlash;
