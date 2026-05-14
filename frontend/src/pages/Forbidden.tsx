import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Página 403 — Sin permisos de acceso
const Forbidden: React.FC = () => {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const handleVolver = () => {
    // Redirigir al inicio correcto según rol
    if (usuario?.rol === 'administrador') {
      navigate('/dashboard');
    } else {
      navigate('/inicio');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Ícono de error */}
        <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/20">
          <svg className="w-12 h-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Código de error */}
        <p className="text-orange-500 font-bold text-sm tracking-widest uppercase mb-2">
          Error 403
        </p>

        {/* Título */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Acceso Denegado
        </h1>

        {/* Mensaje */}
        <p className="text-slate-400 mb-8 leading-relaxed">
          No tienes acceso a esta sección. Si crees que esto es un error, contacta al administrador del sistema.
        </p>

        {/* Botón de regreso */}
        <button
          onClick={handleVolver}
          className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600
                     text-white font-semibold rounded-xl transition-colors duration-200 shadow-lg shadow-orange-500/20"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver al inicio
        </button>
      </div>
    </div>
  );
};

export default Forbidden;
