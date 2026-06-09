import React from 'react';
import { useAuth } from '../context/AuthContext';

// Página de inicio para Oficinista
const Inicio: React.FC = () => {
  const { usuario } = useAuth();

  return (
    <div className="p-6 lg:p-8">
      {/* Saludo */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">
          Hola, {usuario?.nombre?.split(' ')[0]}
        </h2>
        <p className="text-slate-500 mt-1">
          {new Date().toLocaleDateString('es-MX', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* Banner informativo */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-6 mb-8
                      text-white shadow-lg shadow-orange-500/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold">Panel de Trabajo</p>
            <p className="text-orange-100 text-sm">OFICINA TS — Sistema Financiero</p>
          </div>
        </div>
        <p className="text-orange-100 text-sm">
          Accede a los módulos operativos desde el menú lateral. Cualquier duda consulta con el administrador.
        </p>
      </div>

      {/* Módulos disponibles para oficinista */}
      <div>
        <h3 className="text-lg font-semibold text-slate-700 mb-4">Módulos Disponibles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { nombre: 'Expedientes', descripcion: 'Administración de expedientes' },
            { nombre: 'Clientes', descripcion: 'Registro de clientes' },
            { nombre: 'Documentos', descripcion: 'Gestión documental' },
            { nombre: 'Agenda', descripcion: 'Calendario y citas' },
            { nombre: 'Pagos', descripcion: 'Registro de pagos' },
          ].map((modulo) => (
            <div
              key={modulo.nombre}
              className="bg-white rounded-xl p-3 sm:p-5 border border-slate-100 shadow-sm
                         flex items-center justify-between opacity-60 cursor-not-allowed"
            >
              <div>
                <p className="font-medium text-slate-700">{modulo.nombre}</p>
                <p className="text-xs text-slate-400 mt-0.5">{modulo.descripcion}</p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                Próximamente
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Inicio;
