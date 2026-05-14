import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import clientesRoutes from './routes/clientes.routes';
import { inversionistasRouter, inversionesRouter } from './routes/inversionistas.routes';
import { prestamosRouter, moratoriosRouter } from './routes/prestamos.routes';
import { cobrosRouter } from './routes/cobros.routes';
import tesoreriaRoutes from './routes/tesoreria.routes';
import { juiciosRouter } from './routes/juicios.routes';
import egresosRoutes from './routes/egresos.routes';
import inmueblesRoutes from './routes/inmuebles.routes';
import ingresosRoutes  from './routes/ingresos.routes';
import pagosRoutes     from './routes/pagos.routes';
import nominasRoutes   from './routes/nominas.routes';
import dashboardRoutes from './routes/dashboard.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
];

const vercelPattern = /^https:\/\/financiera-sistema[-a-z0-9]*\.vercel\.app$/;

const envOrigins: string[] = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim().replace(/\/$/, ''))
  : [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (vercelPattern.test(origin)) return callback(null, true);
    if (envOrigins.includes(origin)) return callback(null, true);
    console.error(`CORS bloqueó el origen: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));
app.use(express.json());

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Rutas de clientes
app.use('/api/clientes', clientesRoutes);

// Rutas de inversionistas e inversiones
app.use('/api/inversionistas', inversionistasRouter);
app.use('/api/inversiones', inversionesRouter);

// Rutas de préstamos y moratorios
app.use('/api/prestamos', prestamosRouter);
app.use('/api/moratorios', moratoriosRouter);
app.use('/api/cobros', cobrosRouter);
app.use('/api/tesoreria', tesoreriaRoutes);
app.use('/api/juicios', juiciosRouter);
app.use('/api/egresos', egresosRoutes);
app.use('/api/inmuebles', inmueblesRoutes);
app.use('/api/ingresos',  ingresosRoutes);
app.use('/api/pagos',    pagosRoutes);
app.use('/api/nominas',    nominasRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Ruta de health check
app.get('/', (_req, res) => {
  res.json({ mensaje: 'API Financiera OFICINA TS funcionando ✅' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

export default app;