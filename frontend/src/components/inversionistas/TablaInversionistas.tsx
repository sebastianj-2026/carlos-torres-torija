import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, Pencil, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { PaginacionInversionistas } from '../../types/inversionista.types';

// Formatea número como moneda MXN
const formatearMoneda = (valor: string | number): string => {
  const num = typeof valor === 'string' ? parseFloat(valor) : valor;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(num);
};

interface TablaInversionistasProps {
  datos: PaginacionInversionistas;
  cargando: boolean;
  orden: string;
  onOrdenar: (orden: string) => void;
  onCambiarPagina: (pagina: number) => void;
}

const EsqueletoFila: React.FC = () => (
  <tr className="animate-pulse">
    {[...Array(8)].map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
      </td>
    ))}
  </tr>
);

const TablaInversionistas: React.FC<TablaInversionistasProps> = ({
  datos,
  cargando,
  orden,
  onOrdenar,
  onCambiarPagina,
}) => {
  const navigate = useNavigate();
  const { inversionistas, total, pagina, limite, totalPaginas } = datos;

  const toggleOrden = (ascKey: string, descKey: string) => {
    if (orden === ascKey) onOrdenar(descKey);
    else if (orden === descKey) onOrdenar(ascKey);
    else onOrdenar(descKey);
  };

  const SortIcon = ({ ascKey, descKey }: { ascKey: string; descKey: string }) => {
    if (orden === ascKey) return <ChevronUp size={13} className="text-orange-500" />;
    if (orden === descKey) return <ChevronDown size={13} className="text-orange-500" />;
    return <ChevronsUpDown size={13} className="text-slate-300" />;
  };

  // Etiqueta legible del asignado
  const etiquetaAsignado = (valor: string | null) => {
    if (!valor) return <span className="text-slate-400">—</span>;
    return (
      <span className="capitalize text-slate-700">{valor}</span>
    );
  };

  if (!cargando && inversionistas.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="font-medium text-slate-700">No hay inversionistas registrados</p>
        <p className="text-sm text-slate-400 mt-1">
          Registra el primer inversionista con el botón de arriba.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wide w-10">
                #
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">
                Nombre
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">
                Teléfono
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">
                Asignado a
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">
                <button
                  onClick={() => toggleOrden('inversion_asc', 'inversion_desc')}
                  className="flex items-center gap-1 ml-auto hover:text-slate-700 transition-colors"
                >
                  Total invertido
                  <SortIcon ascKey="inversion_asc" descKey="inversion_desc" />
                </button>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">
                Pago mensual
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wide">
                <button
                  onClick={() => toggleOrden('dia_pago_asc', 'dia_pago_desc')}
                  className="flex items-center gap-1 mx-auto hover:text-slate-700 transition-colors"
                >
                  Día pago
                  <SortIcon ascKey="dia_pago_asc" descKey="dia_pago_desc" />
                </button>
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wide">
                Inv. activas
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {cargando
              ? [...Array(8)].map((_, i) => <EsqueletoFila key={i} />)
              : inversionistas.map((inv, idx) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* # */}
                    <td className="px-4 py-3 text-center text-xs text-slate-400 font-medium w-10">
                      {(pagina - 1) * limite + idx + 1}
                    </td>

                    {/* Nombre */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/inversionistas/${inv.id}`)}
                        className="font-medium text-slate-800 hover:text-orange-600 transition-colors text-left"
                      >
                        {inv.nombres} {inv.apellido_paterno}{inv.apellido_materno ? ` ${inv.apellido_materno}` : ''}
                      </button>
                    </td>

                    {/* Teléfono */}
                    <td className="px-4 py-3 text-slate-600">
                      {inv.telefono ?? <span className="text-slate-400">—</span>}
                    </td>

                    {/* Asignado */}
                    <td className="px-4 py-3">{etiquetaAsignado(inv.asignado_a)}</td>

                    {/* Total invertido */}
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {formatearMoneda(inv.total_invertido)}
                    </td>

                    {/* Pago mensual */}
                    <td className="px-4 py-3 text-right font-semibold text-orange-600">
                      {formatearMoneda(inv.pago_mensual)}
                    </td>

                    {/* Día pago */}
                    <td className="px-4 py-3 text-center">
                      {inv.dias_pago
                        ? (() => {
                            const dias = inv.dias_pago.split(', ');
                            if (dias.length === 1) {
                              return <span className="text-sm font-semibold text-slate-700">día {dias[0]}</span>;
                            }
                            return (
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                {dias.map(d => (
                                  <span key={d} className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                                    {d}
                                  </span>
                                ))}
                              </div>
                            );
                          })()
                        : <span className="text-slate-300">—</span>
                      }
                    </td>

                    {/* Inversiones activas */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full
                                       bg-orange-100 text-orange-600 text-xs font-bold">
                        {inv.inversiones_activas}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/inversionistas/${inv.id}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600
                                     hover:bg-orange-50 transition-colors"
                          title="Ver perfil"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => navigate(`/inversionistas/${inv.id}/editar`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700
                                     hover:bg-slate-100 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {!cargando && totalPaginas > 1 && (
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
          <span className="text-slate-500">
            {(pagina - 1) * limite + 1}–{Math.min(pagina * limite, total)} de {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onCambiarPagina(pagina - 1)}
              disabled={pagina <= 1}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100
                         disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-slate-700 font-medium">
              {pagina} / {totalPaginas}
            </span>
            <button
              onClick={() => onCambiarPagina(pagina + 1)}
              disabled={pagina >= totalPaginas}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100
                         disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TablaInversionistas;
