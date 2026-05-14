import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, Car, FileText } from 'lucide-react';
import { PendientesCxCResponse, PendienteCxC } from '../../../types/ingresos.types';
import { DeudaOrigen } from '../../../types/pagos.types';
import { pendientesCxC } from '../../../services/ingresosService';
import NavigadorTemporal from '../../../components/pagos/NavigadorTemporal';
import ModalPagoFlash    from '../../../components/pagos/ModalPagoFlash';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const TIPO_BADGE: Record<string, string> = {
  prestamo: 'bg-blue-100 text-blue-700',
  renta:    'bg-purple-100 text-purple-700',
  pension:  'bg-orange-100 text-orange-700',
};
const TIPO_LABEL: Record<string, string> = {
  prestamo: 'Préstamo',
  renta:    'Inmobiliaria',
  pension:  'Pensión',
};

const deudaDesdeItem = (item: PendienteCxC): DeudaOrigen | null => {
  if (item.tipo === 'prestamo') {
    return {
      modulo_origen: 'prestamo',
      referencia_id: item.id,
      cliente_id:    item.cliente_id,
      descripcion:   item.descripcion,
      saldo_actual:  item.saldo_referencia ?? item.monto_pendiente,
    };
  }
  if (item.tipo === 'renta' && item.contrato_id) {
    return {
      modulo_origen: 'renta',
      referencia_id: item.contrato_id,
      descripcion:   item.descripcion,
      saldo_actual:  item.saldo_referencia ?? item.monto_pendiente,
    };
  }
  return null;
};

// ── Fila de la tabla ─────────────────────────────────────────────
interface FilaProps {
  item: PendienteCxC;
  onAbonar: (deuda: DeudaOrigen) => void;
}

const FilaCxC: React.FC<FilaProps> = ({ item, onAbonar }) => {
  const deuda   = deudaDesdeItem(item);
  const esPrest = item.tipo === 'prestamo';

  return (
    <tr className="hover:bg-slate-50">
      {/* Tipo */}
      <td className="px-4 py-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_BADGE[item.tipo]}`}>
          {TIPO_LABEL[item.tipo]}
        </span>
      </td>

      {/* Descripción */}
      <td className="px-4 py-3 text-sm">
        <p className="text-slate-800">{item.descripcion}</p>
        {/* Mostrar día de pago para préstamos */}
        {esPrest && item.dia_limite && (
          <p className="text-xs text-slate-400 mt-0.5">Pago: día {item.dia_limite} de cada mes</p>
        )}
      </td>

      {/* Interés (monto pendiente) + Capital */}
      <td className="px-4 py-3 text-right">
        {esPrest ? (
          <div>
            <p className="font-bold text-orange-600">{fmt(item.monto_pendiente)}</p>
            <p className="text-xs text-slate-400 leading-tight">↑ Interés este mes</p>
            {(item.saldo_referencia ?? 0) > 0 && (
              <p className="text-xs text-blue-500 leading-tight mt-0.5">
                Saldo cap: {fmt(item.saldo_referencia!)}
              </p>
            )}
          </div>
        ) : (
          <p className="font-bold text-slate-800">{fmt(item.monto_pendiente)}</p>
        )}
      </td>

      {/* Fecha / Día límite */}
      <td className="px-4 py-3 text-sm text-slate-500 text-center">
        {item.fecha_limite ?? (item.dia_limite ? `Día ${item.dia_limite}` : '—')}
      </td>

      {/* Urgencia */}
      <td className="px-4 py-3 text-center">
        {item.dias_para_vencer != null && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            item.dias_para_vencer <= 0  ? 'bg-red-100 text-red-700' :
            item.dias_para_vencer <= 5  ? 'bg-red-100 text-red-700' :
            item.dias_para_vencer <= 15 ? 'bg-amber-100 text-amber-700' :
            'bg-slate-100 text-slate-500'
          }`}>
            {item.dias_para_vencer <= 0 ? 'Vencido' : `${item.dias_para_vencer}d`}
          </span>
        )}
      </td>

      {/* Acción */}
      <td className="px-4 py-3 text-center">
        {deuda ? (
          <button
            onClick={() => onAbonar(deuda)}
            className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Abonar
          </button>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </td>
    </tr>
  );
};

// ── Componente principal ─────────────────────────────────────────
const ConsolidadoCxCTab: React.FC = () => {
  const hoy = new Date();
  const [datos,      setDatos]      = useState<PendientesCxCResponse | null>(null);
  const [cargando,   setC]          = useState(true);
  const [mes,        setMes]        = useState(hoy.getMonth() + 1);
  const [anio,       setAnio]       = useState(hoy.getFullYear());
  const [deudaModal, setDeudaModal] = useState<DeudaOrigen | null>(null);

  const cargar = useCallback(() => {
    setC(true);
    pendientesCxC(mes, anio).then(setDatos).catch(() => {}).finally(() => setC(false));
  }, [mes, anio]);

  useEffect(() => { cargar(); }, [cargar]);

  // Ordenamiento: préstamos por día de pago ASC, luego rentas, luego pensiones
  const todos: PendienteCxC[] = datos ? [
    ...datos.prestamos.slice().sort((a, b) => (a.dia_limite ?? 99) - (b.dia_limite ?? 99)),
    ...datos.rentas,
    ...datos.pensiones,
  ] : [];

  return (
    <div className="space-y-5">

      {/* Cabecera */}
      <div className="flex items-center gap-4 flex-wrap">
        <NavigadorTemporal
          mes={mes}
          anio={anio}
          onChange={(m, a) => { setMes(m); setAnio(a); }}
        />
        <button
          onClick={cargar}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Actualizar
        </button>
      </div>

      {/* KPIs */}
      {datos && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <DollarSign size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Gran Total Pendiente</p>
                <p className="text-lg font-bold text-emerald-600">{fmt(datos.totales.gran_total)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <FileText size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Intereses de Préstamos ({datos.prestamos.length})</p>
                <p className="text-lg font-bold text-blue-600">{fmt(datos.totales.prestamos)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <TrendingUp size={18} className="text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Rentas ({datos.rentas.length})</p>
                <p className="text-lg font-bold text-purple-600">{fmt(datos.totales.rentas)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <Car size={18} className="text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Pensiones ({datos.pensiones.length})</p>
                <p className="text-lg font-bold text-orange-600">{fmt(datos.totales.pensiones)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leyenda de columna Interés/Capital */}
      {datos && datos.prestamos.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-slate-400 pl-1">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
            Interés mensual (utilidad)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
            Saldo de capital (retorno, no es ganancia)
          </span>
        </div>
      )}

      {/* Tabla */}
      {cargando ? (
        <p className="text-sm text-slate-400 text-center py-12">Cargando…</p>
      ) : todos.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">Sin cobros pendientes para este período.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              Todos los pendientes — {MESES[mes]} {anio}
              <span className="ml-2 text-slate-400 font-normal">({todos.length} registros, préstamos orden día de pago ↑)</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-right">
                    <span className="text-orange-500">Interés</span>
                    <span className="text-slate-300"> / </span>
                    <span className="text-blue-400 text-[10px]">Cap.</span>
                  </th>
                  <th className="px-4 py-3 text-center">Fecha Límite</th>
                  <th className="px-4 py-3 text-center">Vence</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todos.map(item => (
                  <FilaCxC
                    key={`${item.tipo}-${item.id}`}
                    item={item}
                    onAbonar={setDeudaModal}
                  />
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-slate-600">
                    Total intereses + rentas + pensiones
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-orange-600">
                    {datos ? fmt(datos.totales.gran_total) : ''}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal de pago */}
      <ModalPagoFlash
        deuda={deudaModal}
        onCerrar={() => setDeudaModal(null)}
        onExito={() => { setDeudaModal(null); cargar(); }}
      />
    </div>
  );
};

export default ConsolidadoCxCTab;
