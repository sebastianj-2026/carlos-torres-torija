import React, { useState } from 'react';
import { X, PlusCircle } from 'lucide-react';
import { Inversion, FormularioAgregarFondosData } from '../../types/inversionista.types';
import { registrarMovimiento } from '../../services/inversionistasService';

const formatearMoneda = (valor: number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);

const DATOS_INICIALES: FormularioAgregarFondosData = {
  monto:     '',
  forma_pago: '',
  notas:      '',
};

interface ModalAgregarFondosProps {
  inversion: Inversion;
  onCerrar: () => void;
  onExito: () => void;
}

const ModalAgregarFondos: React.FC<ModalAgregarFondosProps> = ({
  inversion,
  onCerrar,
  onExito,
}) => {
  const [datos, setDatos]         = useState<FormularioAgregarFondosData>(DATOS_INICIALES);
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const montoActual   = parseFloat(inversion.monto_actual);
  const montoAgregar  = parseFloat(datos.monto) || 0;
  const nuevoTotal    = montoActual + montoAgregar;

  const handleCambio = (campo: keyof FormularioAgregarFondosData, valor: string) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    setError(null);
  };

  const handleGuardar = async () => {
    const monto = parseFloat(datos.monto);
    if (!monto || monto <= 0) {
      setError('El monto debe ser mayor a cero.');
      return;
    }
    if (!datos.forma_pago) {
      setError('Selecciona la forma de ingreso.');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await registrarMovimiento(inversion.id, {
        tipo:       'aporte_capital',
        monto,
        forma_pago: datos.forma_pago,
        notas:      datos.notas || undefined,
      });
      onExito();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { mensaje?: string } } };
      setError(axiosError?.response?.data?.mensaje ?? 'Error al registrar el aporte.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Agregar Fondos</h2>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Banner de monto actual */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <PlusCircle size={16} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium">Monto actual</p>
              <p className="text-lg font-bold text-blue-700">{formatearMoneda(montoActual)}</p>
              {montoAgregar > 0 && (
                <p className="text-xs text-blue-500">
                  Nuevo total: {formatearMoneda(nuevoTotal)}
                </p>
              )}
            </div>
          </div>

          {/* Monto a agregar */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Monto a agregar <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={datos.monto}
              onChange={(e) => handleCambio('monto', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          {/* Forma de ingreso */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Forma de ingreso <span className="text-red-500">*</span>
            </label>
            <select
              value={datos.forma_pago}
              onChange={(e) => handleCambio('forma_pago', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            >
              <option value="">Seleccionar...</option>
              <option value="efectivo">Efectivo</option>
              <option value="deposito">Depósito</option>
            </select>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
            <textarea
              value={datos.notas}
              onChange={(e) => handleCambio('notas', e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              placeholder="Observaciones opcionales..."
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800
                       border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="px-5 py-2 text-sm font-medium bg-orange-500 text-white rounded-xl
                       hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Agregar fondos'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAgregarFondos;
