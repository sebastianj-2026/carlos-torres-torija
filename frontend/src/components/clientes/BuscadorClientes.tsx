import React from 'react';
import { EstatusCliente, ETIQUETAS_ESTATUS, FiltrosClientes } from '../../types/cliente.types';

interface BuscadorClientesProps {
  filtros: FiltrosClientes;
  onChange: (filtros: Partial<FiltrosClientes>) => void;
}

const ESTATUS_OPCIONES: { valor: EstatusCliente | ''; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todos los estatus' },
  { valor: 'activo', etiqueta: ETIQUETAS_ESTATUS.activo },
  { valor: 'atrasado', etiqueta: ETIQUETAS_ESTATUS.atrasado },
  { valor: 'negociado', etiqueta: ETIQUETAS_ESTATUS.negociado },
  { valor: 'en_juicio', etiqueta: ETIQUETAS_ESTATUS.en_juicio },
  { valor: 'inactivo', etiqueta: ETIQUETAS_ESTATUS.inactivo },
];

const BuscadorClientes: React.FC<BuscadorClientesProps> = ({ filtros, onChange }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Campo de búsqueda */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre, RFC, CURP o teléfono..."
          value={filtros.buscar}
          onChange={(e) => onChange({ buscar: e.target.value, pagina: 1 })}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg
                     bg-white text-slate-800 placeholder-slate-400
                     focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent
                     transition-all duration-150"
        />
        {filtros.buscar && (
          <button
            onClick={() => onChange({ buscar: '', pagina: 1 })}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filtro por estatus */}
      <select
        value={filtros.estatus}
        onChange={(e) => onChange({ estatus: e.target.value as EstatusCliente | '', pagina: 1 })}
        className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700
                   focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent
                   transition-all duration-150 min-w-[180px]"
      >
        {ESTATUS_OPCIONES.map((op) => (
          <option key={op.valor} value={op.valor}>
            {op.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
};

export default BuscadorClientes;
