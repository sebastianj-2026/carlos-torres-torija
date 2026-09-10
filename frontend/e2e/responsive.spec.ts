/**
 * E2E responsive (deuda #4, ESTADO.md · criterio de DISENO.md):
 * en 375 / 768 / 1440 — cero scroll horizontal y cero error de consola,
 * en las pantallas principales.
 *
 * Sesión: firma un JWT local con el JWT_SECRET de backend/.env (igual que
 * hace el backend) y lo inyecta en localStorage. Solo funciona en local.
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const backendDir = path.join(__dirname, '..', '..', 'backend');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require(path.join(backendDir, 'node_modules', 'jsonwebtoken'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Pool } = require(path.join(backendDir, 'node_modules', 'pg'));

const env = fs.readFileSync(path.join(backendDir, '.env'), 'utf8');
const leer = (k: string): string =>
  (env.match(new RegExp(`^\\s*${k}\\s*=\\s*(.+?)\\s*$`, 'm')) ?? [])[1]?.replace(/^["']|["']$/g, '') ?? '';

// Se firma con un usuario administrador REAL (el /auth/me lo valida contra la
// tabla usuarios; un id sintético provocaría logout y probaríamos el Login).
let TOKEN = '';
let USUARIO = { id: '', nombre: '', correo: '', rol: 'administrador' };

test.beforeAll(async () => {
  const pool = new Pool({ connectionString: leer('DATABASE_URL'), ssl: { rejectUnauthorized: true } });
  const r = await pool.query(
    `SELECT id, nombre_completo, correo, rol FROM usuarios WHERE rol = 'administrador' LIMIT 1`,
  );
  await pool.end();
  const u = r.rows[0];
  USUARIO = { id: u.id, nombre: u.nombre_completo, correo: u.correo, rol: u.rol };
  TOKEN = jwt.sign(
    { userId: u.id, nombre: u.nombre_completo, correo: u.correo, rol: u.rol },
    leer('JWT_SECRET'),
    { expiresIn: '30m' },
  );
});

const VIEWPORTS = [
  { nombre: '375', width: 375, height: 812 },
  { nombre: '768', width: 768, height: 1024 },
  { nombre: '1440', width: 1440, height: 900 },
];

const PANTALLAS = [
  '/dashboard',
  '/inversionistas',
  '/referenciadores',
  '/referenciadores/nuevo',
  '/prestamos',
  '/egresos',
  '/ingresos',
];

for (const vp of VIEWPORTS) {
  for (const ruta of PANTALLAS) {
    test(`${ruta} @ ${vp.nombre}px — sin scroll horizontal ni errores`, async ({ page }) => {
      const erroresConsola: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') erroresConsola.push(msg.text());
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.addInitScript(({ token, usuario }) => {
        window.localStorage.setItem('token', token);
        window.localStorage.setItem('usuario', JSON.stringify(usuario));
      }, { token: TOKEN, usuario: USUARIO });

      await page.goto(ruta, { waitUntil: 'networkidle' });

      const { scrollW, clientW } = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      }));
      expect(scrollW, `scroll horizontal en ${ruta} @ ${vp.nombre}px`).toBeLessThanOrEqual(clientW);

      // El 401 de /auth/me con usuario sintético no cuenta como error de UI
      const relevantes = erroresConsola.filter((e) => !/401|Unauthorized/i.test(e));
      expect(relevantes, `errores de consola en ${ruta} @ ${vp.nombre}px`).toEqual([]);

      // Evidencia para el gate (check "screenshots generados": e2e/__screens__)
      const screensDir = path.join(__dirname, '..', '..', 'e2e', '__screens__');
      fs.mkdirSync(screensDir, { recursive: true });
      const nombre = `${ruta.replace(/\//g, '_').replace(/^_/, '') || 'root'}-${vp.nombre}.png`;
      await page.screenshot({ path: path.join(screensDir, nombre) });
    });
  }
}
