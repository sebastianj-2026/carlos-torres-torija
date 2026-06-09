# QA Seguridad y Calidad Técnica — Notas de Corrección

Auditoría por 5 subagentes en paralelo: auth/JWT, SQL/input, uploads/CORS/secretos, calidad backend, seguridad/calidad frontend.
**No se aplicó ningún cambio.** Esto es solo el inventario.

---

## 🔴 CRÍTICO — Arreglar antes de tocar producción

| # | Categoría | Archivo:Línea | Problema | Fix |
|---|---|---|---|---|
| 1 | Secretos | `backend/.env` (commiteado en el repo) | `JWT_SECRET=FinancieraPrivada@2024#Secure` predecible + `DATABASE_URL` de Neon en plano | Rotar JWT_SECRET a `openssl rand -base64 64`. Rotar credenciales Neon. Mover a env de Vercel/Railway. Confirmar `.env` no esté en git history (`git log --all --full-history -- backend/.env`) |
| 2 | Auth | `backend/src/middlewares/auth.middleware.ts:37` | `jwt.verify(token, secreto)` sin `algorithms` — acepta `alg: none` | `jwt.verify(token, secreto, { algorithms: ['HS256'] })` |
| 3 | TLS | `backend/src/config/database.ts:8` | `ssl: { rejectUnauthorized: false }` permite MITM en Neon | `ssl: { rejectUnauthorized: true, ca: ... }` o al menos `rejectUnauthorized: process.env.NODE_ENV === 'production'` |
| 4 | SQL injection | `backend/src/controllers/egresos.controller.ts:551` | Template literal con input: `AND cpp.centro_costo = '${centro_costo}'` (whitelist insuficiente cuando se concatena) | Pasar centro_costo como parámetro `$N` |
| 5 | Transacción | `backend/src/controllers/prestamos.controller.ts:423-621` (`crearPrestamo`) | Multi-INSERT (prestamo + participantes + movimientos + historial) sin `BEGIN/COMMIT/ROLLBACK` | `client.connect()` + `BEGIN` + `client.query` + `COMMIT`/`ROLLBACK` en catch |
| 6 | Race condition | `backend/src/controllers/prestamos.controller.ts:461-603` | SELECT capital_disponible → validar → UPDATE sin `FOR UPDATE`. Dos requests pueden oversellar el capital de un inversionista | `SELECT ... FOR UPDATE` dentro de transacción |
| 7 | Transacción | `backend/src/controllers/prestamos.controller.ts:705-790` (`editarPrestamo`) | Restaura capital y limpia movimientos sin rollback en error medio | Una sola transacción |
| 8 | CORS | `backend/src/index.ts:29` | Regex `/^https:\/\/financiera-sistema[-a-z0-9]*\.vercel\.app$/` permite `financiera-sistema-evil.vercel.app` (typosquatting) | Whitelist exacta de dominios; usar `VERCEL_GIT_REPO_*` env si previews |
| 9 | Frontend XSS | `frontend/src/services/authService.ts:18` + `AuthContext.tsx:49` | JWT en `localStorage` — cualquier XSS roba el token | Mover a httpOnly cookie (requiere backend) o aceptar el riesgo y endurecer CSP |
| 10 | JWT lifecycle | `backend/src/controllers/auth.controller.ts:124` + `auth.middleware.ts:37` | Logout no invalida token; sin refresh tokens; token robado dura 8h | Blacklist en Redis/DB de `jti` revocados o expiración corta + refresh |

---

## 🟠 ALTO — Riesgos de seguridad y robustez

| # | Categoría | Archivo:Línea | Problema | Fix |
|---|---|---|---|---|
| 11 | IDOR | `backend/src/routes/clientes.routes.ts:34`, `prestamos.routes.ts:50`, `inversionistas.routes.ts:31` | `GET/PUT /api/X/:id` sin verificar ownership/rol | Middleware que valide `req.usuario.rol === 'administrador'` o `registrado_por = userId` |
| 12 | Rate limiting | `backend/src/controllers/auth.controller.ts:8-11` | Rate limit en memoria (reset al reiniciar). Sin escalada | `express-rate-limit` con store (Redis o memoria persistente) |
| 13 | Headers | `backend/src/index.ts` | Sin helmet — falta X-Frame-Options, CSP, HSTS, nosniff | `npm i helmet` + `app.use(helmet())` |
| 14 | LIKE injection | `clientes.controller.ts:79`, `prestamos.controller.ts:278`, `juicios.controller.ts:83` | `ILIKE %${buscar}%` — `%` y `_` del input matchean como wildcards | `.replace(/[%_\\]/g, '\\$&')` + `ESCAPE '\\'` |
| 15 | ORDER BY injection | `backend/src/controllers/prestamos.controller.ts:269` | `ORDER BY ${columna} ${direccion}` — `direccion` no validado contra enum | Validar `direccion in ['ASC','DESC']` antes de concatenar |
| 16 | Multer | `backend/src/routes/prestamos.routes.ts:27`, `juicios.routes.ts:20` | Confía en MIME `application/pdf`, no valida magic bytes (`%PDF`) | Usar `file-type` para validar primeros bytes |
| 17 | Storage | mismo (uploads → BYTEA) | Archivos grandes en columna BYTEA sin cuota → DoS por llenar DB | Migrar a Supabase Storage (ya configurado en frontend) o S3 |
| 18 | Transacción | `backend/src/controllers/prestamos.controller.ts:841-928` (renovarPrestamo) | Crear nuevo + liquidar anterior + historial sin transacción | Envolver en BEGIN/COMMIT/ROLLBACK |
| 19 | N+1 | `backend/src/controllers/clientes.controller.ts:290-296` (crearCliente) | Loop `for (tipo of tiposDocumento)` → INSERT por iteración | Single INSERT `VALUES (...), (...), ...` |
| 20 | N+1 | `backend/src/controllers/clientes.controller.ts:468-487` (actualizarDocumentos) | Loop con `await pool.query` por documento | Batch upsert |
| 21 | Enumeration | `backend/src/controllers/auth.controller.ts:75-76` | "Cuenta bloqueada por 15 min" confirma que el usuario existe | Mensaje genérico "Credenciales incorrectas" |
| 22 | Endpoint expuesto | `backend/src/controllers/auth.controller.ts:180-190` (`/api/auth/usuarios`) | Lista de usuarios accesible a `oficinista` | Restringir a `administrador` |
| 23 | CORS+credentials | `backend/src/index.ts:44` | `credentials: true` con el regex laxo de #8 | Resolver #8 primero |
| 24 | Frontend timeout | `frontend/src/services/authService.ts:8-12` (y otros services) | `axios.create` sin `timeout` — requests cuelgan | `timeout: 30000` |
| 25 | Frontend errors | `frontend/src/pages/clientes/ListaClientes.tsx:51`, `components/pagos/PanelDeudaCliente.tsx:44` | `.catch(() => {})` silencia errores | Loguear + toast/setError |
| 26 | Logout | `frontend/src/services/authService.ts:53-60` | `finally` borra token aunque server no confirme | Distinguir error de red vs OK; reintentar |

---

## 🟡 MEDIO — Calidad y robustez

| # | Categoría | Archivo:Línea | Problema | Fix |
|---|---|---|---|---|
| 27 | Validación UUID | TODOS los controllers que usan `req.params.id` | UUID inválido causa 500 en lugar de 404 | Middleware `validateUuid('id')` o regex en handler |
| 28 | parseInt sin radix | `backend/src/controllers/cobros.controller.ts:206, 231` | `parseInt(periodo_mes)` sin radix 10 | `parseInt(x, 10)` |
| 29 | parseFloat NaN | `backend/src/controllers/cobros.controller.ts:133`, `pagos.controller.ts:27` | `parseFloat(...)` sin verificar NaN/Infinity | `if (!Number.isFinite(v)) return 400` |
| 30 | Money precision | múltiples (`prestamos.ts:487`, `cobros.ts:162`) | `parseFloat` para montos → IEEE 754 drift | Calcular en SQL con `NUMERIC`; nunca volver a `Number` para sumar |
| 31 | Sin paginación | `backend/src/controllers/prestamos.controller.ts:49-73` (auditoriaCapital) | `SELECT *` sin LIMIT | Paginar |
| 32 | TOCTOU | `backend/src/controllers/prestamos.controller.ts:461-476, 740-752` | SELECT capital + IF + UPDATE sin lock | `FOR UPDATE` y transacción |
| 33 | Mass assignment | `backend/src/controllers/inmuebles.controller.ts:626` | `detalles_servicios` JSON sin validar schema | Zod/Joi schema |
| 34 | JSON sin cap | `backend/src/controllers/cuentas_pagar.controller.ts:19`, `inmuebles.controller.ts:186` | `JSON.stringify(detalle)` sin tamaño máximo | `.substring(0, 5000)` o validar antes |
| 35 | CHECK no validado en API | varios | API confía en CHECK de Postgres; si DB cambia, API filtra basura | Validar enums en handler (`if (!CENTROS_VALIDOS.includes(x)) return 400`) |
| 36 | Stack a cliente | `backend/src/controllers/inversionistas.controller.ts:69` | `String(e)` en response | `{ mensaje: 'Error ...' }` genérico; log server-side |
| 37 | Errores swallowed | catch blocks sin re-throw ni response | Algunos catch solo `console.error` sin responder | Asegurar response en todos los catch |
| 38 | Frontend useEffect | `frontend/src/context/AuthContext.tsx:38-44` | 5 event listeners de inactividad, posible re-registro si callback cambia | `useCallback` con deps vacías |
| 39 | Frontend race | `frontend/src/context/AuthContext.tsx:59-70` | `obtenerPerfil()` sin AbortController; setState post-unmount | `AbortController` + cleanup |
| 40 | Frontend JSON | `frontend/src/context/AuthContext.tsx:54` | `JSON.parse(usuarioGuardado)` sin try/catch loggeado | Try/catch con clear de sesión |
| 41 | Source maps prod | `frontend/craco.config.js` | Build incluye `.map` files | `GENERATE_SOURCEMAP=false` en build |
| 42 | Error boundary | `frontend/src/App.tsx` | Sin `<ErrorBoundary>` global | Wrappear `<Routes>` |
| 43 | Logging | controllers con `console.error(error)` | Stack traces en logs de prod (Railway logs públicos) | Logger que sanitiza en `NODE_ENV=production` |
| 44 | Password policy | no hay endpoint de registro | Si llegan a agregar, sin validación min length/complejidad | bcrypt rounds ≥ 12 + reglas |
| 45 | Rate limit pagos | `backend/src/controllers/cobros.controller.ts:119`, `pagos.controller.ts:14` | Sin throttling en endpoints de registro de pago | `express-rate-limit` por usuario |
| 46 | Fechas TZ | varios `new Date(req.body.fecha)` | Shift de timezone implícito en strings ISO | Usar UTC explícito o pasar `DATE` directo a Postgres |
| 47 | Pool config | `backend/src/config/database.ts:11` | `max: 5` puede ser bajo con uploads concurrentes | Monitorear y ajustar; agregar `application_name` |

---

## 🟢 BAJO — Mejoras y hardening defensivo

| # | Categoría | Archivo:Línea | Problema | Fix |
|---|---|---|---|---|
| 48 | Audit log | sin tabla central de auditoría | No se loguea cambio de rol, creación de usuario admin | Tabla `audit_log` + middleware |
| 49 | Frontend roles | rol guardado en localStorage solo para esconder UI | Defense in depth: backend ya valida (esto está OK) | Documentar; no es vulnerabilidad |
| 50 | req.usuario | controllers usan `req.usuario?.userId` | Asume middleware corre; si no, `userId = undefined` y se inserta NULL | Asegurar middleware en todas las rutas y tipar como required |
| 51 | Status codes | varios endpoints | 200 cuando debería ser 201 (POST create), 404 cuando 403 (no auth) | Auditar códigos |
| 52 | console.log sensible | revisar logs | Posibles `console.log(req.body)` con datos sensibles | Grep y limpiar |
| 53 | Hardcoded localhost | services frontend | `'http://localhost:4000/api'` como fallback | OK solo en dev; documentar `REACT_APP_API_URL` requerido en prod |
| 54 | Path traversal | uploads | Multer `memoryStorage` lo evita, pero si cambia a disk, validar nombre | Mantener memoryStorage o sanitizar `filename` |
| 55 | Validación frontend duplicada | LoginForm:59-77 vs backend | Esto está bien (UX) | Mantener |
| 56 | .env.example | `backend/.env.example:9` | Placeholder dice `cambiame` pero no advierte fuertemente | Comentario `# NUNCA usar este valor — generar con openssl rand` |

---

## Resumen ejecutivo

| Severidad | Cantidad |
|---|---|
| 🔴 Crítico | 10 |
| 🟠 Alto | 16 |
| 🟡 Medio | 21 |
| 🟢 Bajo | 9 |
| **Total** | **56** |

## Top 3 acciones inmediatas (antes de cualquier producción)

1. **Rotar `JWT_SECRET` y credenciales de Neon** + verificar `git log --all -- backend/.env`. Asumir que las creds actuales están comprometidas porque están en el repo.
2. **Fijar `algorithms: ['HS256']`** en `jwt.verify` y `rejectUnauthorized: true` en pg pool.
3. **Envolver `crearPrestamo`, `editarPrestamo`, `renovarPrestamo` en transacciones** con `FOR UPDATE` en la lectura de `capital_disponible`. Esto previene corrupción de saldos por oversell.

## Patrones repetidos (atacar globalmente)

1. **Falta de transacciones** en operaciones multi-write → revisar todo controller que haga más de 1 INSERT/UPDATE
2. **`pool.query` directo** vs `client` con `BEGIN/COMMIT` → estandarizar helper `withTransaction`
3. **Sin validación de UUID** en `:id` params → middleware genérico
4. **`parseFloat`/`parseInt` sin validación** → helper `parseMoney(value)` y `parseIntStrict(value)`
5. **`.catch(() => {})` en frontend** → grep y reemplazar por logger + toast
6. **`console.error(err)` filtra stack en prod** → logger sanitizador

## Orden sugerido de ataque

1. **Sprint 0 (24h, sin código nuevo):** rotar secretos, helmet, `algorithms`, `rejectUnauthorized` ⇒ issues 1, 2, 3, 13
2. **Sprint 1 (1 semana):** transacciones + FOR UPDATE en módulo préstamos ⇒ issues 5, 6, 7, 18, 32
3. **Sprint 2 (1 semana):** SQL/input hardening ⇒ issues 4, 8, 14, 15, 27, 33
4. **Sprint 3 (1 semana):** uploads + storage externo + headers ⇒ issues 16, 17
5. **Sprint 4:** frontend timeout + error handling + error boundary + cookies httpOnly ⇒ issues 9, 24, 25, 26, 38-42
