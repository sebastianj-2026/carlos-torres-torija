import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LoginFormData } from '../../types/auth.types';

const LoginForm: React.FC = () => {
  const { login, usuario } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormData>({ correo: '', password: '' });
  const [error, setError] = useState<string>('');
  const [bloqueado, setBloqueado] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(false);
  const [mostrarPassword, setMostrarPassword] = useState<boolean>(false);
  const [loginExitoso, setLoginExitoso] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cargando || bloqueado) return;
    setCargando(true);
    setError('');
    try {
      await login(formData.correo, formData.password);
      setLoginExitoso(true);
    } catch (err: any) {
      const esBloqueado = err.response?.data?.bloqueado === true;
      const mensajeBackend = err.response?.data?.mensaje;
      setLoginExitoso(false);
      if (esBloqueado) {
        setBloqueado(true);
        setError(mensajeBackend || 'Cuenta bloqueada temporalmente. Intente en 15 minutos.');
      } else {
        setError('Correo o contraseña incorrectos, intente de nuevo.');
      }
      setFormData(prev => ({ ...prev, password: '' }));
    } finally {
      setCargando(false);
    }
  };

  // Solo redirigir si el login fue exitoso en ESTA sesión
  React.useEffect(() => {
    if (loginExitoso && usuario) {
      if (usuario.rol === 'administrador') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/inicio', { replace: true });
      }
    }
  }, [loginExitoso, usuario, navigate]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Campo correo electrónico */}
      <div>
        <label htmlFor="correo" className="block text-sm font-medium text-slate-600 mb-1.5">
          Correo electrónico
        </label>
        <input
          id="correo"
          name="correo"
          type="email"
          autoComplete="email"
          required
          value={formData.correo}
          onChange={handleChange}
          disabled={bloqueado}
          placeholder="usuario@ejemplo.com"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800
                     placeholder-slate-400 text-sm
                     focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
        />
      </div>

      {/* Campo contraseña */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-600 mb-1.5">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={mostrarPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={formData.password}
            onChange={handleChange}
            disabled={bloqueado}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-800
                       placeholder-slate-400 text-sm
                       focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          />
          <button
            type="button"
            onClick={() => setMostrarPassword(!mostrarPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
          >
            {mostrarPassword ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mensaje de error — siempre visible hasta que se corrija */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200">
          <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-red-700 leading-snug">{error}</p>
        </div>
      )}

      {/* Botón de login */}
      <button
        type="submit"
        disabled={cargando || bloqueado || !formData.correo || !formData.password}
        className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm
                   bg-orange-500 hover:bg-orange-600 active:bg-orange-700
                   focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200 shadow-sm hover:shadow-md"
      >
        {cargando ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Iniciando sesión...
          </span>
        ) : (
          'Iniciar Sesión'
        )}
      </button>
    </form>
  );
};

export default LoginForm;