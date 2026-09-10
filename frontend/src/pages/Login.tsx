import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/auth/LoginForm';

// Logo SVG del sistema "PrestaFácil"
const Logo: React.FC = () => (
  <div className="flex flex-col items-center gap-3">
    {/* Ícono geométrico */}
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl shadow-lg shadow-sky-500/30 rotate-6" />
      <div className="absolute inset-0 bg-slate-900 rounded-2xl flex items-center justify-center">
        <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
          {/* Hexágono estilizado */}
          <path
            d="M24 4L42 14V34L24 44L6 34V14L24 4Z"
            fill="none"
            stroke="#0EA5E9"
            strokeWidth="2.5"
          />
          {/* Letra O estilizada con detalle interior */}
          <circle cx="24" cy="24" r="8" fill="none" stroke="#0EA5E9" strokeWidth="2.5" />
          <circle cx="24" cy="24" r="3" fill="#0EA5E9" />
        </svg>
      </div>
    </div>

    {/* Nombre del sistema */}
    <div className="text-center leading-none">
      <span className="text-2xl font-light tracking-[0.15em] text-slate-300">
        Presta
      </span>
      <span className="text-2xl font-black tracking-wide text-sky-500 ml-1">
        Fácil
      </span>
    </div>

    <p className="text-xs text-slate-500 tracking-widest uppercase font-medium">
      Sistema Financiero
    </p>
  </div>
);

const Login: React.FC = () => {
  const { estaAutenticado, usuario, cargando } = useAuth();

  // Esperar a que AuthContext termine de verificar la sesión antes de redirigir
  if (!cargando && estaAutenticado && usuario) {
    return (
      <Navigate
        to={usuario.rol === 'administrador' ? '/dashboard' : '/ingresos'}
        replace
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
      {/* Efectos de fondo decorativos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/3 rounded-full blur-3xl" />
      </div>

      {/* Card principal */}
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
          {/* Franja superior naranja */}
          <div className="h-1.5 bg-gradient-to-r from-sky-500 to-sky-400" />

          <div className="px-4 sm:px-8 py-6 sm:py-10">
            {/* Logo */}
            <div className="mb-8">
              <Logo />
            </div>

            {/* Título de sección */}
            <div className="mb-7 text-center">
              <h1 className="text-xl font-semibold text-slate-800">Iniciar Sesión</h1>
              <p className="text-sm text-slate-400 mt-1">
                Ingresa tus credenciales para continuar
              </p>
            </div>

            {/* Formulario */}
            <LoginForm />
          </div>

          {/* Pie de la card */}
          <div className="px-8 py-4 bg-slate-50 border-t border-slate-100">
            <p className="text-center text-xs text-slate-400">
              Acceso restringido al personal autorizado
            </p>
          </div>
        </div>

        {/* Versión */}
        <p className="text-center text-xs text-slate-600 mt-4">
          PrestaFácil &copy; {new Date().getFullYear()} — v1.0.0
        </p>
      </div>
    </div>
  );
};

export default Login;
