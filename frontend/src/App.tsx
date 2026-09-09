import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import RoleGuard from './components/shared/RoleGuard';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import Layout from './components/layout/Layout';

// Páginas públicas
import Login from './pages/Login';
import Forbidden from './pages/Forbidden';

// Páginas protegidas
import Dashboard from './pages/Dashboard';
import Inicio from './pages/Inicio';

// Módulo clientes
import ListaClientes from './pages/clientes/ListaClientes';
import FormularioCliente from './pages/clientes/FormularioCliente';
import ExpedienteCliente from './pages/clientes/ExpedienteCliente';

// Módulo inversionistas
import ListaReferenciadores from './pages/referenciadores/ListaReferenciadores';
import ListaInversionistas from './pages/inversionistas/ListaInversionistas';
import PerfilInversionista from './pages/inversionistas/PerfilInversionista';
import FormularioInversionista from './pages/inversionistas/FormularioInversionista';
import ImportarInversionistas from './pages/inversionistas/ImportarInversionistas';

// Módulo préstamos
import ListaPrestamos from './pages/prestamos/ListaPrestamos';
import ExpedientePrestamo from './pages/prestamos/ExpedientePrestamo';
import FormularioPrestamo from './pages/prestamos/FormularioPrestamo';
import AuditoriaPrestamos from './pages/prestamos/AuditoriaPrestamos';

// Módulo tesorería
import Tesoreria from './pages/tesoreria/Tesoreria';

// Módulo juicios
import ListaJuicios from './pages/juicios/ListaJuicios';
import ExpedienteJuicio from './pages/juicios/ExpedienteJuicio';

// Módulo egresos y deuda corporativa
import EgresosPage from './pages/egresos/EgresosPage';

// Hub de ingresos
import IngresosDashboard from './pages/ingresos/IngresosDashboard';

// Capital Humano y Nómina
import NominasPage from './pages/nominas/NominasPage';


const App: React.FC = () => {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/403" element={<Forbidden />} />

          {/* Rutas protegidas — envueltas en Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  {/* Contenido vacío; la raíz redirige abajo */}
                  <></>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Dashboard — solo administrador */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleGuard rolesPermitidos={['administrador']}>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Inicio — solo oficinista */}
          <Route
            path="/inicio"
            element={
              <ProtectedRoute>
                <RoleGuard rolesPermitidos={['oficinista']}>
                  <Layout>
                    <Inicio />
                  </Layout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Clientes — todos los roles */}
          <Route
            path="/clientes"
            element={
              <ProtectedRoute>
                <Layout>
                  <ListaClientes />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes/nuevo"
            element={
              <ProtectedRoute>
                <Layout>
                  <FormularioCliente />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExpedienteCliente />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes/:id/editar"
            element={
              <ProtectedRoute>
                <Layout>
                  <FormularioCliente />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Referenciadores — todos los roles */}
          <Route
            path="/referenciadores"
            element={
              <ProtectedRoute>
                <Layout>
                  <ListaReferenciadores />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Inversionistas — todos los roles */}
          <Route
            path="/inversionistas"
            element={
              <ProtectedRoute>
                <Layout>
                  <ListaInversionistas />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inversionistas/nuevo"
            element={
              <ProtectedRoute>
                <Layout>
                  <FormularioInversionista />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inversionistas/importar"
            element={
              <ProtectedRoute>
                <Layout>
                  <ImportarInversionistas />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inversionistas/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <PerfilInversionista />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inversionistas/:id/editar"
            element={
              <ProtectedRoute>
                <Layout>
                  <FormularioInversionista />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/prestamos"
            element={
              <ProtectedRoute>
                <Layout>
                  <ListaPrestamos />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/prestamos/auditoria"
            element={
              <ProtectedRoute>
                <Layout>
                  <AuditoriaPrestamos />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/prestamos/nuevo"
            element={
              <ProtectedRoute>
                <Layout>
                  <FormularioPrestamo />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/prestamos/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExpedientePrestamo />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/prestamos/:id/editar"
            element={
              <ProtectedRoute>
                <Layout>
                  <FormularioPrestamo />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/caja"
            element={
              <ProtectedRoute>
                <Layout>
                  <Tesoreria />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Egresos y Deuda Corporativa — ambos roles */}
          <Route
            path="/egresos"
            element={
              <ProtectedRoute>
                <Layout>
                  <EgresosPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Hub de Ingresos — ambos roles */}
          <Route
            path="/ingresos"
            element={
              <ProtectedRoute>
                <Layout>
                  <IngresosDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Capital Humano y Nómina — ambos roles */}
          <Route
            path="/nominas"
            element={
              <ProtectedRoute>
                <Layout>
                  <NominasPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Juicios — solo administrador */}
          <Route
            path="/juicios"
            element={
              <ProtectedRoute>
                <RoleGuard rolesPermitidos={['administrador']}>
                  <Layout>
                    <ListaJuicios />
                  </Layout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/juicios/:id"
            element={
              <ProtectedRoute>
                <RoleGuard rolesPermitidos={['administrador']}>
                  <Layout>
                    <ExpedienteJuicio />
                  </Layout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Raíz y rutas no definidas → login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
