import React, { useState, useEffect } from 'react';
import { X, Calculator } from 'lucide-react';
import { ExpedientePrestamo, TipoPago, FormaPago, FormularioPagoData } from '../../types/prestamo.types';
import { registrarPago } from '../../services/prestamosService';

const fmt = (valor: number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);

const MESES = [
  { valor: 1,  etiqueta: 'Enero'      },
  { valor: 2,  etiqueta: 'Febrero'    },
  { valor: 3,  etiqueta: 'Marzo'      },
  { valor: 4,  etiqueta: 'Abril'      },
  { valor: 5,  etiqueta: 'Mayo'       },
  { valor: 6,  etiqueta: 'Junio'      },
  { valor: 7,  etiqueta: 'Julio'      },
  { valor: 8,  etiqueta: 'Agosto'     },
  { valor: 9,  etiqueta: 'Septiembre' },
  { valor: 10, etiqueta: 'Octubre'    },
  { valor: 11, etiqueta: 'Noviembre'  },
  { valor: 12, etiqueta: 'Diciembre'  },
];

const mesActual  = new Date().getMonth() + 1;
const anioActual = new Date().getFullYear();

const DATOS_INICIALES: FormularioPagoData = {
  tipo_pago:   '',
  monto:       '',
  forma_pago:  '',
  periodo_mes:  String(mesActual),
  periodo_anio: String(anioActual),
  notas:        '',
};

interface ModalRegistrarPagoProps {
  prestamo: ExpedientePrestamo;
  onCerrar: () => void;
  onExito: () => void;
}

const ModalRegistrarPago: React.FC<ModalRegistrarPagoProps> = ({ prestamo, onCerrar, onExito }) => {
  const [datos, setDatos]         = useState<FormularioPagoData>(DATOS_INICIALES);
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const saldo  = parseFloat(prestamo.saldo_pendiente);
  const tasa   = parseFloat(prestamo.tasa_interes_mensual);
  const tasaMor = parseFloat(prestamo.tasa_moratoria_mensual);

  const interesCalculado  = parseFloat((saldo * (tasa / 100)).toFixed(2));
  const moratorioCalculado = parseFloat((saldo * (tasaMor / 100)).toFixed(2));

  // Pre-rellenar monto al cambiar tipo
  useEffect(() => {
    if (datos.tipo_pago === 'interes') {
      setDatos((prev) => ({ ...prev, monto: interesCalculado.toFixed(2) }));
    } else if (datos.tipo_pago === 'moratorio') {
      setDatos((prev) => ({ ...prev, monto: moratorioCalculado.toFixed(2) }));
    } else if (datos.tipo_pago === 'capital') {
      setDatos((prev) => ({ ...prev, monto: '' }));
    }
  }, [datos.tipo_pago]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambio = (campo: keyof FormularioPagoData, valor: string) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    setError(null);
  };

  const handleGuardar = async () => {
    if (!datos.tipo_pago) { setError('Selecciona el tipo de pago.'); return; }
    const monto = parseFloat(datos.monto);
    if (!monto || monto <= 0) { setError('El monto debe ser mayor a cero.'); return; }
    if (!datos.forma_pago)  { setError('Selecciona la forma de pago.'); return; }

    setGuardando(true);
    setError(null);
    try {
      await registrarPago(prestamo.id, {
        tipo_pago:   datos.tipo_pago as TipoPago,
        monto,
        forma_pago:  datos.forma_pago as FormaPago,
        periodo_mes:  datos.periodo_mes  ? parseInt(datos.periodo_mes)  : undefined,
        periodo_anio: datos.periodo_anio ? parseInt(datos.periodo_anio) : undefined,
        notas:        datos.notas || undefined,
      });
      onExito();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { mensaje?: string } } };
      setError(axiosError?.response?.data?.mensaje ?? 'Error al registrar el pago.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">Registrar Pago</h2>
          <button onClick={onCerrar} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Info del préstamo */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
              <Calculator size={16} className="text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Saldo pendiente</p>
              <p className="text-base font-bold text-slate-800">{fmt(saldo)}</p>
              <p className="text-xs text-slate-400">
                Interés mensual: {fmt(interesCalculado)}
                {tasaMor > 0 && ` · Moratorio: ${fmt(moratorioCalculado)}`}
              </p>
            </div>
          </div>

          {/* Tipo de pago */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tipo de pago <span className="text-red-500">*</span>
            </label>
            <select
              value={datos.tipo_pago}
              onChange={(e) => cambio('tipo_pago', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            >
              <option value="">Seleccionar...</option>
              <option value="interes">Interés mensual</option>
              <option value="capital">Abono a capital</option>
              <option value="moratorio">Moratorio</option>
            </select>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Monto <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={datos.monto}
              onChange={(e) => cambio('monto', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          {/* Forma de pago */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Forma de pago <span className="text-red-500">*</span>
            </label>
            <select
              value={datos.forma_pago}
              onChange={(e) => cambio('forma_pago', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            >
              <option value="">Seleccionar...</option>
              <option value="efectivo">Efectivo</option>
              <option value="deposito">Depósito</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>

          {/* Periodo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mes</label>
              <select
                value={datos.periodo_mes}
                onChange={(e) => cambio('periodo_mes', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              >
                {MESES.map((m) => (
                  <option key={m.valor} value={m.valor}>{m.etiqueta}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Año</label>
              <input
                type="number"
                value={datos.periodo_anio}
                onChange={(e) => cambio('periodo_anio', e.target.value)}
                min="2020"
                max="2099"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
            <textarea
              value={datos.notas}
              onChange={(e) => cambio('notas', e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              placeholder="Observaciones opcionales..."
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200
                       rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="px-5 py-2 text-sm font-medium bg-orange-500 text-white rounded-xl
                       hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalRegistrarPago;
