import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

// Layout principal que envuelve todas las páginas protegidas.
// Combina el Sidebar fijo a la izquierda, el Header fijo arriba
// y el área de contenido principal a la derecha.
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [menuMobileAbierto, setMenuMobileAbierto] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar — pasa el estado del menú mobile */}
      <Sidebar
        mobileAbierto={menuMobileAbierto}
        onCerrarMobile={() => setMenuMobileAbierto(false)}
      />

      {/* Columna principal: header + contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header fijo arriba */}
        <Header onAbrirMenuMobile={() => setMenuMobileAbierto(true)} />

        {/* Contenido de la página — margen superior para compensar el header fijo */}
        <main className="flex-1 mt-16 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
