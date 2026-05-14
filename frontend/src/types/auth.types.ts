// Roles permitidos en el sistema
export type Rol = 'administrador' | 'oficinista';

// Datos del usuario autenticado (almacenados en contexto y JWT)
export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
}

// Payload que devuelve el endpoint de login
export interface LoginRespuesta {
  mensaje: string;
  token: string;
  usuario: Usuario;
}

// Campos del formulario de login
export interface LoginFormData {
  correo: string;
  password: string;
}

// Estado global del contexto de autenticación
export interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  cargando: boolean;
  login: (correo: string, password: string) => Promise<void>;
  logout: () => void;
  estaAutenticado: boolean;
}
