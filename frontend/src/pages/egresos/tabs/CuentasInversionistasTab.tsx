import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, Zap, X, Timer, FileText, AlertTriangle } from 'lucide-react';
import { CuentaPorPagar, EstatusCP } from '../../../types/egresos.types';
import { listarCuentas, cambiarEstatusCuenta, generarRendimientos } from '../../../services/egresosService';

const fmt = (n: string | number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n));

const TODAY = new Date().toISOString().split('T')[0];

const BADGE_CFG: Record<EstatusCP, { cls: string; icon: React.ReactNode }> = {
  borrador:    { cls: 'bg-slate-50   text-slate-500   border-slate-200',   icon: <FileText      size={11} /> },
  por_aprobar: { cls: 'bg-blue-50    text-blue-700    border-blue-200',    icon: <Timer         size={11} /> },
  programado:  { cls: 'bg-amber-50   text-amber-700   border-amber-200',   icon: <Clock         size={11} /> },
  pagado:      { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle   size={11} /> },
  vencido:     { cls: 'bg-red-50     text-red-700     border-red-200',     icon: <AlertTriangle size={11} /> },
};

const LABEL: Record<EstatusCP, string> = {
  borrador:    'Borrador',
  por_aprobar: 'Por aprobar',
  programado:  'Programado',
  pagado:      'Pagado',
  vencido:     'Vencido',
};

const EstatusChipCP: React.FC<{ estatus: EstatusCP }> = ({ estatus }) => {
  const { cls, icon } = BADGE_CFG[estatus];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${cls}`}>
      {icon} {LABEL[estatus]}
    </span>
  );
};

const FLUJO: Record<EstatusCP, EstatusCP[]> = {
  borrador:    ['por_aprobar'],
  por_aprobar: ['programado', 'borrador'],
  programado:  ['pagado'],
  pagado:      [],
  vencido:     ['pagado'],
};

// Extracts "Juan García" from "Rendimiento Mayo 2025 — Juan García"
const parsearNombre = (concepto: string): string => {
  const idx = concepto.indexOf('—');
  return idx !== -1 ? concepto.slice(idx + 1).trim() : '—';
};

// Extracts "Rendimiento Mayo 2025" from the concepto
const parsearConcepto = (concepto: string): string => {
  const idx = concepto.indexOf('—');
  return idx !== -1 ? concepto.slice(0, idx).trim() : concepto;
};

const diaDeFecha = (iso: string): number => parseInt(iso.split('-')[2] ?? '0', 10);

const CuentasInversionistasTab: React.FC<{ mes: number; anio: number }> = ({ mes, anio }) => {

  const [cuentas, setCuentas]     = useState<CuentaPorPagar[]>([]);
  const [total, setTotal]         = useState(0);
  const [cargando, setCargando]   = useState(true);

  // Generar rendimientos
  const [generando, setGenerando]         = useState(false);
  const [resultadoGen, setResultadoGen]   = useState<{ generados: number; omitidos: number } | null>(null);
  const [errorGen, setErrorGen]           = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const d = await listarCuentas({
        centro_costo: 'Inversionistas',
        mes,
        anio,
        limite: 100,
      });
      // Sort strictly by day-of-month ascending
      const ordenadas = [...d.cuentas].sort(
        (a, b) => diaDeFecha(a.fecha_limite_pago) - diaDeFecha(b.fecha_limite_pago)
      );
      setCuentas(ordenadas);
      setTotal(d.total);
    } finally {
      setCargando(false);
    }
  }, [mes, anio]);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiarEstatus = async (id: string, estatus: EstatusCP) => {
    await cambiarEstatusCuenta(id, { estatus });
    cargar();
  };

  const handleGenerar = async () => {
    setGenerando(true);
    setResultadoGen(null);
    setErrorGen('');
    try {
      const r = await generarRendimientos(mes, anio);
      setResultadoGen({ generados: r.generados, omitidos: r.omitidos });
      if (r.generados > 0) cargar();
    } catch (e: any) {
      setErrorGen(e?.response?.data?.mensaje ?? 'Error al generar rendimientos.');
    } finally {
      setGenerando(false);
    }
  };

  const vencidaNoPagada = (c: CuentaPorPagar) =>
    c.fecha_limite_pago < TODAY && c.estatus !== 'pagado';

  return (
    <div>
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">
          {cargando ? 'Cargando…' : `${total} registro${total !== 1 ? 's' : ''}`}
        </p>
        <button
          onClick={handleGenerar}
          disabled={generando}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm disabled:opacity-50 transition-colors"
        >
          <Zap size={15} />
          {generando ? 'Generando…' : 'Generar rendimientos'}
        </button>
      </div>

      {/* Feedback de generación */}
      {resultadoGen && (
        <div className="flex items-center justify-between mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          <span>
            <strong>{resultadoGen.generados}</strong> registros generados
            {resultadoGen.omitidos > 0 && `, ${resultadoGen.omitidos} omitidos (ya existían)`}
          </span>
          <button onClick={() => setResultadoGen(null)}><X size={14} /></button>
        </div>
      )}
      {errorGen && (
        <div className="flex items-center justify-between mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <span>{errorGen}</span>
          <button onClick={() => setErrorGen('')}><X size={14} /></button>
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-center">Día</th>
                <th className="px-4 py-3 text-left">Inversionista</th>
                <th className="px-4 py-3 text-left">Concepto</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-center">Estatus</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">Cargando…</td></tr>
              ) : cuentas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    Sin registros para este mes — usa "Generar rendimientos" para crearlos.
                  </td>
                </tr>
              ) : cuentas.map(c => {
                const estaVencida = vencidaNoPagada(c);
                return (
                  <tr
                    key={c.id}
                    className={`transition-colors ${
                      estaVencida
                        ? 'bg-red-50/70 hover:bg-red-50'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Día */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold
                        ${estaVencida ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                        {diaDeFecha(c.fecha_limite_pago)}
                      </span>
                    </td>

                    {/* Inversionista */}
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {parsearNombre(c.concepto)}
                    </td>

                    {/* Concepto */}
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {parsearConcepto(c.concepto)}
                    </td>

                    {/* Monto */}
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap text-right">
                      {fmt(c.monto_total)}
                    </td>

                    {/* Estatus */}
                    <td className="px-4 py-3 text-center">
                      <EstatusChipCP estatus={c.estatus} />
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {FLUJO[c.estatus].map(sig => (
                          <button
                            key={sig}
                            onClick={() => cambiarEstatus(c.id, sig)}
                            title={`Mover a ${LABEL[sig]}`}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            {sig === 'pagado'
                              ? <CheckCircle size={15} className="text-green-500" />
                              : <Clock size={15} />
                            }
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totales del mes */}
        {cuentas.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/60">
            <div className="flex gap-6 text-xs text-slate-500">
              <span>
                Pagados:{' '}
                <strong className="text-green-600">
                  {fmt(cuentas.filter(c => c.estatus === 'pagado').reduce((s, c) => s + Number(c.monto_total), 0))}
                </strong>
              </span>
              <span>
                Pendientes:{' '}
                <strong className="text-amber-600">
                  {fmt(cuentas.filter(c => c.estatus !== 'pagado').reduce((s, c) => s + Number(c.monto_total), 0))}
                </strong>
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Total: <strong className="text-slate-600">{fmt(cuentas.reduce((s, c) => s + Number(c.monto_total), 0))}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CuentasInversionistasTab;
