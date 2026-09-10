import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BotonMenuMobile } from './Sidebar';

interface HeaderProps {
  onAbrirMenuMobile: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAbrirMenuMobile }) => {
  const { usuario, logout } = useAuth();

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-0 h-16 z-10
                       bg-white border-b border-slate-100 shadow-sm
                       flex items-center justify-between px-4 sm:px-6">

      {/* Botón hamburguesa (solo mobile) */}
      <BotonMenuMobile onClick={onAbrirMenuMobile} />

      {/* Espaciador vacío para centrar contenido en desktop */}
      <div className="hidden lg:block" />

      {/* Información del usuario y cerrar sesión */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Nombre y rol */}
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-sm font-semibold text-slate-800 leading-tight">
            {usuario?.nombre}
          </span>
          <span className="text-xs text-slate-400 capitalize leading-tight">
            {usuario?.rol}
          </span>
        </div>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
          <span className="text-sky-600 font-bold text-sm uppercase">
            {usuario?.nombre?.charAt(0) ?? 'U'}
          </span>
        </div>

        {/* Botón cerrar sesión */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium
                     bg-sky-500 text-white hover:bg-sky-600
                     transition-colors duration-150 shrink-0"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
