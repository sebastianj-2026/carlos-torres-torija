import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Usuario, AuthContextType } from '../types/auth.types';
import { iniciarSesion, cerrarSesion, obtenerPerfil } from '../services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Tiempo de inactividad máximo antes de cerrar sesión automáticamente (4 horas en ms)
const TIEMPO_INACTIVIDAD_MS = 4 * 60 * 60 * 1000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const timerInactividad = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cerrar sesión (limpia estado y localStorage)
  const logout = useCallback(() => {
    cerrarSesion().finally(() => {
      setUsuario(null);
      setToken(null);
      if (timerInactividad.current) clearTimeout(timerInactividad.current);
    });
  }, []);

  // Reiniciar el temporizador de inactividad con cada interacción del usuario
  const reiniciarTimerInactividad = useCallback(() => {
    if (timerInactividad.current) clearTimeout(timerInactividad.current);
    timerInactividad.current = setTimeout(() => {
      logout();
    }, TIEMPO_INACTIVIDAD_MS);
  }, [logout]);

  // Escuchar eventos de actividad del usuario para reiniciar el timer
  useEffect(() => {
    if (!token) return;

    const eventos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    eventos.forEach((evento) => window.addEventListener(evento, reiniciarTimerInactividad));
    reiniciarTimerInactividad();

    return () => {
      eventos.forEach((evento) => window.removeEventListener(evento, reiniciarTimerInactividad));
      if (timerInactividad.current) clearTimeout(timerInactividad.current);
    };
  }, [token, reiniciarTimerInactividad]);

  // Al montar: restaurar sesión desde localStorage si existe un token válido
  useEffect(() => {
    const tokenGuardado = localStorage.getItem('token');
    const usuarioGuardado = localStorage.getItem('usuario');

    if (tokenGuardado && usuarioGuardado) {
      try {
        const usuarioParsed: Usuario = JSON.parse(usuarioGuardado);
        setToken(tokenGuardado);
        setUsuario(usuarioParsed);

        // Verificar que el token siga siendo válido en el backend
        obtenerPerfil()
          .then((perfil) => {
            setUsuario(perfil);
          })
          .catch(() => {
            // Token expirado o inválido: limpiar sesión
            setToken(null);
            setUsuario(null);
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
          })
          .finally(() => setCargando(false));
      } catch {
        setCargando(false);
      }
    } else {
      setCargando(false);
    }
  }, []);

  // Función de login: llama al servicio y persiste en localStorage
 const login = async (correo: string, password: string): Promise<void> => {
  // Limpiar sesión anterior antes de intentar
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  setToken(null);
  setUsuario(null);
  
  const respuesta = await iniciarSesion(correo, password);
  const { token: nuevoToken, usuario: nuevoUsuario } = respuesta;
  localStorage.setItem('token', nuevoToken);
  localStorage.setItem('usuario', JSON.stringify(nuevoUsuario));
  setToken(nuevoToken);
  setUsuario(nuevoUsuario);
};

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        cargando,
        login,
        logout,
        estaAutenticado: !!token && !!usuario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para consumir el contexto de autenticación
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
