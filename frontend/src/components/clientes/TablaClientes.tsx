import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClienteResumen,
  EstatusCliente,
  COLORES_ESTATUS,
  ETIQUETAS_ESTATUS,
  PaginacionClientes,
} from '../../types/cliente.types';

interface TablaClientesProps {
  datos: PaginacionClientes;
  cargando: boolean;
  onCambiarPagina: (pagina: number) => void;
}

// Badge de estatus con color por tipo
const BadgeEstatus: React.FC<{ estatus: EstatusCliente }> = ({ estatus }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${COLORES_ESTATUS[estatus]}`}>
    {ETIQUETAS_ESTATUS[estatus]}
  </span>
);

// Nombre completo formateado
const nombreCompleto = (c: ClienteResumen): string =>
  [c.nombres, c.apellido_paterno, c.apellido_materno].filter(Boolean).join(' ');

const TablaClientes: React.FC<TablaClientesProps> = ({ datos, cargando, onCambiarPagina }) => {
  const navigate = useNavigate();

  if (cargando) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Cargando clientes...</p>
        </div>
      </div>
    );
  }

  if (datos.clientes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-slate-500 font-medium">No se encontraron clientes</p>
        <p className="text-slate-400 text-sm mt-1">Prueba con otro término de búsqueda o crea un nuevo cliente.</p>
      </div>
    );
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-3 py-3 font-medium text-slate-500">Nombre</th>
              <th className="w-32 px-3 py-3 font-medium text-slate-500">RFC</th>
              <th className="w-32 px-3 py-3 font-medium text-slate-500">Teléfono</th>
              <th className="w-28 px-3 py-3 font-medium text-slate-500 text-center">Estatus</th>
              <th className="w-28 px-3 py-3 font-medium text-slate-500 text-center">Meses sin pago</th>
              <th className="w-32 px-3 py-3 font-medium text-slate-500 text-right">Deuda total</th>
              <th className="w-32 px-3 py-3 font-medium text-slate-500 text-right">Interés mensual</th>
              <th className="w-24 px-3 py-3 font-medium text-slate-500 text-center">Préstamos</th>
              <th className="w-24 px-3 py-3 font-medium text-slate-500 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {datos.clientes.map((cliente) => (
              <tr
                key={cliente.id}
                className="hover:bg-orange-50/40 transition-colors duration-100 cursor-pointer"
                onClick={() => navigate(`/clientes/${cliente.id}`)}
              >
                <td className="px-3 py-3 font-medium truncate max-w-0">
                  <span className={(cliente.meses_sin_pago ?? 0) > 0 ? 'text-amber-600' : 'text-slate-800'}>
                    {nombreCompleto(cliente)}
                  </span>
                </td>
                <td className="w-32 px-3 py-3 text-slate-500 font-mono text-xs truncate">
                  {cliente.rfc || <span className="text-slate-300">—</span>}
                </td>
                <td className="w-32 px-3 py-3 text-slate-500 whitespace-nowrap">
                  {cliente.telefono_celular || <span className="text-slate-300">—</span>}
                </td>
                <td className="w-28 px-3 py-3 text-center">
                  <BadgeEstatus estatus={cliente.estatus} />
                </td>
                <td className="w-28 px-3 py-3 text-center">
                  {(cliente.meses_sin_pago ?? 0) > 0
                    ? <span className="font-semibold text-red-600">{cliente.meses_sin_pago}</span>
                    : <span className="text-slate-300">—</span>}
                </td>
                <td className="w-32 px-3 py-3 text-slate-700 text-right whitespace-nowrap">
                  {formatCurrency(cliente.deuda_total ?? 0)}
                </td>
                <td className="w-32 px-3 py-3 text-slate-700 text-right whitespace-nowrap">
                  {formatCurrency(cliente.interes_mensual ?? 0)}
                </td>
                <td className="w-24 px-3 py-3 text-slate-600 text-center">
                  {cliente.num_prestamos ?? 0}
                </td>
                <td className="w-24 px-3 py-3 text-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/clientes/${cliente.id}/editar`); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100
                               transition-colors duration-150"
                    title="Editar cliente"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {datos.totalPaginas > 1 && (
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Mostrando {((datos.pagina - 1) * datos.limite) + 1}–{Math.min(datos.pagina * datos.limite, datos.total)} de {datos.total} clientes
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onCambiarPagina(datos.pagina - 1)}
              disabled={datos.pagina === 1}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30
                         disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {Array.from({ length: datos.totalPaginas }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - datos.pagina) <= 2)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => onCambiarPagina(p)}
                  className={`w-8 h-8 text-xs rounded-lg font-medium transition-colors ${
                    p === datos.pagina
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            <button
              onClick={() => onCambiarPagina(datos.pagina + 1)}
              disabled={datos.pagina === datos.totalPaginas}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30
                         disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TablaClientes;
