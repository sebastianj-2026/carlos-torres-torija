import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import {
  PaginacionPrestamos,
  CampoOrden,
  DireccionOrden,
  COLORES_ESTATUS_PRESTAMO,
  ETIQUETAS_ESTATUS_PRESTAMO,
} from '../../types/prestamo.types';

const fmt = (valor: string | number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    typeof valor === 'string' ? parseFloat(valor) : valor
  );

const fmtFecha = (iso: string): string =>
  new Date(iso.substring(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: '2-digit',
  });

const EsqueletoFila: React.FC = () => (
  <tr className="animate-pulse">
    {[...Array(10)].map((_, i) => (
      <td key={i} className="px-3 py-3">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
      </td>
    ))}
  </tr>
);

interface ColHeader {
  label: string;
  campo?: CampoOrden;
  align?: 'left' | 'right' | 'center';
}

const COLUMNAS: ColHeader[] = [
  { label: 'No.',      align: 'center' },
  { label: 'Cliente',  campo: 'cliente_nombre',       align: 'left'   },
  { label: 'Monto',    campo: 'monto_prestado',        align: 'right'  },
  { label: 'Tasa',     campo: 'tasa_interes_mensual',  align: 'center' },
  { label: 'Int. Mensual',                             align: 'right'  },
  { label: 'Int. Vencido',                             align: 'right'  },
  { label: 'Día Pago', campo: 'dia_pago',              align: 'center' },
  { label: 'Inicio',                                   align: 'center' },
  { label: 'Progreso', campo: 'progreso',              align: 'left'   },
  { label: 'Estatus',                                  align: 'center' },
  { label: '',                                         align: 'center' },
];

interface TablaPrestamosProps {
  datos: PaginacionPrestamos;
  cargando: boolean;
  ordenarPor: CampoOrden;
  direccion: DireccionOrden;
  onOrdenar: (campo: CampoOrden) => void;
  onCambiarPagina: (pagina: number) => void;
}

const TablaPrestamos: React.FC<TablaPrestamosProps> = ({
  datos, cargando, ordenarPor, direccion, onOrdenar, onCambiarPagina,
}) => {
  const navigate = useNavigate();
  const { prestamos, total, pagina, limite, totalPaginas } = datos;

  if (!cargando && prestamos.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
        <p className="text-slate-400 text-sm">Sin préstamos registrados.</p>
      </div>
    );
  }

  const SortIcon: React.FC<{ campo?: CampoOrden }> = ({ campo }) => {
    if (!campo) return null;
    if (ordenarPor !== campo) return <ChevronsUpDown size={12} className="text-slate-300" />;
    return direccion === 'asc'
      ? <ChevronUp size={12} className="text-orange-500" />
      : <ChevronDown size={12} className="text-orange-500" />;
  };

  const alignClass = (a?: string) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {COLUMNAS.map((col, i) => (
                <th
                  key={i}
                  className={`px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap
                    ${alignClass(col.align)}
                    ${col.campo ? 'cursor-pointer select-none hover:text-slate-700' : ''}`}
                  onClick={col.campo ? () => onOrdenar(col.campo!) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon campo={col.campo} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {cargando
              ? [...Array(5)].map((_, i) => <EsqueletoFila key={i} />)
              : prestamos.map((p, idx) => {
                  const numero  = (pagina - 1) * limite + idx + 1;
                  const pagosHechos = p.pagos_realizados;
                  const pct     = p.plazo_meses > 0 ? (pagosHechos / p.plazo_meses) * 100 : 0;
                  const intVencido = p.meses_sin_pago > 0
                    ? p.meses_sin_pago * parseFloat(p.interes_mensual)
                    : 0;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/prestamos/${p.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      {/* No. */}
                      <td className="px-3 py-3 text-center text-xs text-slate-400 font-mono">
                        {numero}
                      </td>

                      {/* Cliente */}
                      <td className="px-3 py-3 font-medium text-slate-800 max-w-[160px] truncate">
                        {p.cliente_nombre}
                      </td>

                      {/* Monto */}
                      <td className="px-3 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                        {fmt(p.monto_prestado)}
                      </td>

                      {/* Tasa */}
                      <td className="px-3 py-3 text-center text-slate-600 whitespace-nowrap">
                        {parseFloat(p.tasa_interes_mensual)}%
                      </td>

                      {/* Interés mensual */}
                      <td className="px-3 py-3 text-right font-semibold text-green-700 whitespace-nowrap">
                        {fmt(p.interes_mensual)}
                      </td>

                      {/* Interés vencido (solo interés, nunca capital) */}
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        {intVencido > 0
                          ? <span className="font-semibold text-red-600">{fmt(intVencido)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Día de pago */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-50 text-orange-600 text-xs font-bold">
                          {p.dia_pago}
                        </span>
                      </td>

                      {/* Fecha inicio */}
                      <td className="px-3 py-3 text-center text-slate-500 text-xs whitespace-nowrap">
                        {fmtFecha(p.fecha_inicio)}
                      </td>

                      {/* Progreso */}
                      <td className="px-3 py-3 whitespace-nowrap min-w-[100px]">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 min-w-[48px]">
                            <div
                              className="bg-orange-400 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {pagosHechos}&nbsp;/&nbsp;{p.plazo_meses}
                          </span>
                        </div>
                      </td>

                      {/* Estatus */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${COLORES_ESTATUS_PRESTAMO[p.estatus]}`}>
                          {ETIQUETAS_ESTATUS_PRESTAMO[p.estatus]}
                        </span>
                      </td>

                      {/* Acción */}
                      <td className="px-3 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/prestamos/${p.id}`); }}
                          className="p-1.5 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-orange-50 transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
          <p className="text-xs text-slate-400">
            {((pagina - 1) * limite) + 1}–{Math.min(pagina * limite, total)} de {total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onCambiarPagina(pagina - 1)}
              disabled={pagina === 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - pagina) <= 2)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => onCambiarPagina(p)}
                  className={`w-8 h-8 text-xs rounded-lg font-medium transition-colors ${
                    p === pagina ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            <button
              onClick={() => onCambiarPagina(pagina + 1)}
              disabled={pagina === totalPaginas}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TablaPrestamos;
