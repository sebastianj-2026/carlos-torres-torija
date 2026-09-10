import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import FileDropZone from '../../../components/shared/FileDropZone';
import { useAuth } from '../../../context/AuthContext';
import {
  LineaPendiente,
  listarPendientes,
  registrarPagoDevengo,
  aCentavos,
  formatearCentavos,
} from '../../../services/pagosDevengoService';

// ================================================================
// Pantalla de pendientes de devengos (M18)
// - Carlos selecciona, el sistema no decide (R14): checkbox por línea.
// - Dentro de la línea el periodo NO se elige: FIFO forzado (R15).
// - Totales en centavos enteros — cero float en la UI (M16).
// - Antes de guardar: forma de pago, cuenta, comprobante (R19).
// - En 375px: tarjetas con la barra de total fija abajo.
// ================================================================

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const claveLinea = (l: LineaPendiente): string =>
  `${l.beneficiario_id}|${l.concepto}|${l.origen_tipo}|${l.origen_id}`;

const PendientesDevengosTab: React.FC = () => {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'administrador';

  const [lineas, setLineas]       = useState<LineaPendiente[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

  // Datos del pago (R19) — aplican a cada línea seleccionada; un pago por línea
  const [formaPago, setFormaPago]   = useState<'efectivo' | 'transferencia' | 'deposito'>('efectivo');
  const [cuenta, setCuenta]         = useState('');
  const [banco, setBanco]           = useState('');
  const [comprobante, setComprobante] = useState('');
  const [guardando, setGuardando]   = useState(false);
  const [exito, setExito]           = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setLineas(await listarPendientes());
      setSeleccion(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los pendientes.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Totales en centavos enteros (M16): seleccionado y "quedaría", en vivo
  const { totalPendiente, totalSeleccionado } = useMemo(() => {
    let pendiente = 0n;
    let seleccionado = 0n;
    for (const l of lineas) {
      const c = aCentavos(l.total_pendiente);
      pendiente += c;
      if (seleccion.has(claveLinea(l))) seleccionado += c;
    }
    return { totalPendiente: pendiente, totalSeleccionado: seleccionado };
  }, [lineas, seleccion]);

  const toggle = (clave: string) => {
    setSeleccion((prev) => {
      const s = new Set(prev);
      if (s.has(clave)) s.delete(clave); else s.add(clave);
      return s;
    });
    setExito(null);
  };

  const puedeGuardar =
    esAdmin &&
    seleccion.size > 0 &&
    comprobante.trim() !== '' &&
    (formaPago === 'efectivo' || cuenta.trim() !== '') &&
    !guardando;

  const handlePagar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    setError(null);
    try {
      // Un pago POR LÍNEA (R17: un concepto por pago). Secuencial: si una
      // falla, las previas quedan registradas y la lista se recarga fiel.
      for (const l of lineas.filter((l) => seleccion.has(claveLinea(l)))) {
        await registrarPagoDevengo({
          [l.beneficiario_tipo === 'inversionista' ? 'inversionista_id' : 'referenciador_id']:
            l.beneficiario_id,
          concepto: l.concepto,
          origen_tipo: l.origen_tipo,
          origen_id: l.origen_id,
          monto: l.total_pendiente,
          forma_pago: formaPago,
          numero_cuenta: cuenta.trim() || undefined,
          banco: banco.trim() || undefined,
          url_comprobante: comprobante.trim(),
        });
      }
      setExito(`${seleccion.size} pago(s) registrados.`);
      setComprobante('');
      await cargar();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al registrar el pago.');
      await cargar();
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="pb-28 sm:pb-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-800">Devengos pendientes</h3>
          <p className="text-xs text-slate-500">
            Tú seleccionas qué líneas pagar; dentro de cada línea el periodo va
            FIFO — lo más viejo primero, el sistema no lo pregunta.
          </p>
        </div>
        <button
          onClick={cargar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Recargar"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl mb-4">{error}</p>
      )}
      {exito && (
        <p className="text-sm text-green-700 bg-green-50 px-4 py-2.5 rounded-xl mb-4 flex items-center gap-2">
          <CheckCircle2 size={15} /> {exito}
        </p>
      )}

      {lineas.length === 0 && !error ? (
        <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
          Sin devengos pendientes.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
          {lineas.map((l) => {
            const clave = claveLinea(l);
            const activa = seleccion.has(clave);
            return (
              <label
                key={clave}
                className={`flex gap-3 p-4 bg-white rounded-2xl border cursor-pointer transition-colors
                  ${activa ? 'border-sky-400 ring-1 ring-sky-200' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <input
                  type="checkbox"
                  checked={activa}
                  onChange={() => toggle(clave)}
                  className="mt-1 h-4 w-4 accent-sky-500 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {l.beneficiario_nombre}
                    </p>
                    <p className="text-sm font-bold text-slate-800 whitespace-nowrap">
                      {formatearCentavos(aCentavos(l.total_pendiente))}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    <span className={`inline-block px-1.5 py-0.5 rounded-md text-[11px] font-medium mr-1
                      ${l.concepto === 'rendimiento' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>
                      {l.concepto === 'rendimiento' ? 'Rendimiento' : 'Comisión'}
                    </span>
                    {l.origen_tipo === 'inversion' ? 'inversión' : 'préstamo'}
                  </p>
                  {/* Periodos de la línea: FIFO, solo lectura (R15) */}
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    {l.devengos.map((d) =>
                      `${MESES[d.periodo_mes - 1]} ${d.periodo_anio} · $${d.pendiente}`
                    ).join('  →  ')}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {/* Datos del pago (R19) — visibles cuando hay selección */}
      {seleccion.size > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Datos del pago · autoriza {usuario?.nombre ?? 'sesión actual'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Forma de pago</label>
              <select
                value={formaPago}
                onChange={(e) => setFormaPago(e.target.value as typeof formaPago)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="deposito">Depósito</option>
              </select>
            </div>
            {formaPago !== 'efectivo' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Número de cuenta<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    value={cuenta}
                    onChange={(e) => setCuenta(e.target.value)}
                    placeholder="CLABE o cuenta"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Banco</label>
                  <input
                    type="text"
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    placeholder="Banco"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </>
            )}
          </div>
          <FileDropZone
            label="Comprobante del pago (obligatorio)"
            value={comprobante}
            folder="pagos-devengo/comprobantes"
            onChange={setComprobante}
          />
          {!esAdmin && (
            <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-xl">
              Solo un administrador puede registrar pagos.
            </p>
          )}
        </div>
      )}

      {/* Barra de totales — fija abajo en móvil (FLUJOS §6) */}
      <div className="fixed sm:static bottom-0 left-0 right-0 z-10 bg-white sm:rounded-2xl
                      border-t sm:border border-slate-200 sm:border-slate-100 p-4
                      flex items-center justify-between gap-3 shadow-lg sm:shadow-none">
        <div className="text-sm">
          <p className="font-semibold text-slate-800">
            Seleccionado: {formatearCentavos(totalSeleccionado)}
          </p>
          <p className="text-xs text-slate-500">
            Quedaría pendiente: {formatearCentavos(totalPendiente - totalSeleccionado)}
          </p>
        </div>
        <button
          onClick={handlePagar}
          disabled={!puedeGuardar}
          className="px-5 py-2.5 text-sm font-medium bg-sky-500 text-white rounded-xl
                     hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {guardando ? 'Registrando…' : `Pagar ${seleccion.size || ''} línea(s)`}
        </button>
      </div>
    </div>
  );
};

export default PendientesDevengosTab;
