import axios from 'axios';
import { LoginRespuesta, Usuario } from '../types/auth.types';

// URL base de la API del backend
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// Crear instancia de axios con configuración base
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: adjuntar JWT en cada petición saliente
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor: redirigir a login solo si el token de sesión expiró (no en login fallido)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Iniciar sesión con correo y contraseña
export const iniciarSesion = async (
  correo: string,
  password: string
): Promise<LoginRespuesta> => {
  const respuesta = await apiClient.post<LoginRespuesta>('/auth/login', {
    correo,
    password,
  });
  return respuesta.data;
};

// Cerrar sesión en el backend y limpiar localStorage
export const cerrarSesion = async (): Promise<void> => {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  }
};

// Obtener datos actualizados del usuario autenticado
export const obtenerPerfil = async (): Promise<Usuario> => {
  const respuesta = await apiClient.get<Usuario>('/auth/me');
  return respuesta.data;
};

export default apiClient;
