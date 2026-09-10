import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  FileText,
  Wallet,
  Gavel,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Receipt,
  Banknote,
  HardHat,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ItemMenu {
  etiqueta: string;
  ruta: string;
  Icono: React.ElementType;
  soloAdmin?: boolean;
}

// soloAdmin: true → solo 'administrador' ve el ítem
// sin soloAdmin → ambos roles lo ven
const itemsMenu: ItemMenu[] = [
  { etiqueta: 'Dashboard',          ruta: '/dashboard',       Icono: LayoutDashboard, soloAdmin: true },
  { etiqueta: 'Clientes',           ruta: '/clientes',        Icono: Users                            },
  { etiqueta: 'Inversionistas',     ruta: '/inversionistas',  Icono: TrendingUp                       },
  { etiqueta: 'Referenciadores',    ruta: '/referenciadores', Icono: UserCog                          },
  { etiqueta: 'Préstamos',           ruta: '/prestamos',       Icono: FileText                         },
  { etiqueta: 'Caja Chica y Bancos', ruta: '/caja',           Icono: Wallet                           },
  { etiqueta: 'Gastos',             ruta: '/egresos',         Icono: Receipt                          },
  { etiqueta: 'Hub de Ingresos',    ruta: '/ingresos',        Icono: Banknote                         },
  { etiqueta: 'Nóminas',            ruta: '/nominas',         Icono: HardHat                          },
  { etiqueta: 'Juicios',            ruta: '/juicios',         Icono: Gavel,           soloAdmin: true },
];

interface SidebarProps {
  mobileAbierto: boolean;
  onCerrarMobile: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileAbierto, onCerrarMobile }) => {
  const [colapsado, setColapsado] = useState(false);
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'administrador';

  const itemsVisibles = itemsMenu.filter(item => !item.soloAdmin || esAdmin);

  const claseBase     = 'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium group';
  const claseInactivo = 'text-slate-400 hover:bg-slate-700/60 hover:text-white';
  const claseActivo   = 'bg-sky-500 text-white shadow-md shadow-sky-500/30';

  return (
    <>
      {mobileAbierto && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onCerrarMobile} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full max-h-screen overflow-y-auto z-30 flex flex-col
        bg-[#1E293B] transition-all duration-300 ease-in-out
        ${colapsado ? 'w-[68px]' : 'w-64'}
        ${mobileAbierto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-3 border-b border-slate-700/60 shrink-0">
          {!colapsado && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-black text-xs">PF</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-light text-slate-300 text-sm tracking-wide">Presta</span>
                <span className="font-black text-sky-400 text-sm tracking-wide">Fácil</span>
              </div>
            </div>
          )}
          {colapsado && (
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-black text-xs">PF</span>
            </div>
          )}
          {!colapsado && (
            <button onClick={onCerrarMobile} className="lg:hidden text-slate-400 hover:text-white p-1 rounded">
              <X size={18} />
            </button>
          )}
          <button
            onClick={() => setColapsado(!colapsado)}
            className={`hidden lg:flex items-center justify-center w-6 h-6 rounded-full
              bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors shrink-0
              ${colapsado ? 'mx-auto' : ''}`}
            title={colapsado ? 'Expandir menú' : 'Colapsar menú'}
          >
            {colapsado ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {itemsVisibles.map(item => (
            <NavLink
              key={item.ruta}
              to={item.ruta}
              onClick={onCerrarMobile}
              className={({ isActive }) => `${claseBase} ${isActive ? claseActivo : claseInactivo}`}
              title={colapsado ? item.etiqueta : undefined}
            >
              {({ isActive }) => (
                <>
                  <item.Icono size={18} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  {!colapsado && <span className="truncate">{item.etiqueta}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        {!colapsado && (
          <div className="px-3 py-4 border-t border-slate-700/60 shrink-0">
            <div className="flex items-center gap-2 px-3">
              <div className="w-7 h-7 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0">
                <span className="text-sky-400 text-xs font-bold uppercase">
                  {usuario?.nombre?.charAt(0) ?? 'U'}
                </span>
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-slate-300 truncate">{usuario?.nombre}</p>
                <p className="text-xs text-slate-500 capitalize">{usuario?.rol}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      <div className={`hidden lg:block shrink-0 transition-all duration-300 ${colapsado ? 'w-[68px]' : 'w-64'}`} />
    </>
  );
};

export const BotonMenuMobile: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg
               text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
    aria-label="Abrir menú"
  >
    <Menu size={20} />
  </button>
);

export default Sidebar;
