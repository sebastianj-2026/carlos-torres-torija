import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Rol } from '../../types/auth.types';

interface RoleGuardProps {
  rolesPermitidos: Rol[];
  children: React.ReactNode;
}

// Componente que protege rutas por rol: redirige a /403 si el rol no tiene acceso
const RoleGuard: React.FC<RoleGuardProps> = ({ rolesPermitidos, children }) => {
  const { usuario } = useAuth();

  if (!usuario || !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
