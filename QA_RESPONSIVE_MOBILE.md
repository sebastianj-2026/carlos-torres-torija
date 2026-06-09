# QA Responsive Mobile — Notas de Corrección

Auditoría de UI a 320–480px (teléfono). TailwindCSS, breakpoints `sm:640 / md:768 / lg:1024`.
**No se aplicó ningún cambio.** Esto es solo el inventario para arreglar después.

---

## 🔴 CRÍTICO — Tablas que se desbordan / Modales que no caben

| # | Archivo:Línea | Problema | Fix |
|---|---|---|---|
| 1 | `components/prestamos/TablaPrestamos.tsx:88` | 11 columnas sin `overflow-x-auto` en contenedor | Wrapper `overflow-x-auto` + `hidden sm:table-cell` en columnas no críticas |
| 2 | `components/clientes/TablaClientes.tsx:62` | 9 columnas; Deuda total e Interés mensual no caben | `hidden sm:table-cell` o vista de tarjetas en móvil |
| 3 | `components/inversionistas/TablaInversionistas.tsx:84` | 9 columnas, solo `overflow-x-auto` | `hidden sm:table` + grid de tarjetas `sm:hidden` |
| 4 | `pages/inmuebles/FichaInmueble.tsx:209` | Tabla de cobros sin breakpoints | `hidden sm:block` + grid `grid-cols-1 sm:table` |
| 5 | `components/inversionistas/ImportarInversionistas.tsx:175` | Preview Excel con 7 columnas | `hidden sm:block` + variante móvil |
| 6 | `pages/egresos/tabs/CuentasPorPagarTab.tsx:292` | 7 columnas sin scroll adaptado | Wrapper `overflow-x-auto` + ocultar columnas |
| 7 | `pages/egresos/tabs/ProveedoresTab.tsx:59` | 6 columnas sin scroll | Wrapper o vista tarjetas |
| 8 | `pages/tesoreria/SeccionTraspasos.tsx` (~150) | Tabla sin `overflow-x-auto` | Agregar wrapper |
| 9 | `pages/ingresos/tabs/DashboardCentralTab.tsx:341` | Tabla "Movimientos" 6 cols, `px-4` aplasta a 320px | `text-xs` en celdas + accordeón o cards apiladas en móvil |
| 10 | `pages/ingresos/tabs/CxCPrestamosTab.tsx:298` | Proyección de Cobros 6 cols | `hidden sm:table-cell` en columna Capital |
| 11 | `components/pagos/PanelDeudaCliente.tsx:122` | "Préstamos con saldo activo" 5 cols | `max-w-full` + wrap o cards móvil |
| 12 | `pages/juicios/ExpedienteJuicio.tsx:304` | Tabla "Gastos Legales" en modal | Responsive table pattern |
| 13 | `pages/juicios/ExpedienteJuicio.tsx:487` | Tabla "Archivero" 5 cols | Igual al anterior |
| 14 | `pages/prestamos/AuditoriaPrestamos.tsx:406` | Audit 6 cols sin overflow | Wrapper `overflow-x-auto` |
| 15 | `components/prestamos/ModalRegistrarPago.tsx:98` | `max-w-md` (28rem) se corta en 320px | `max-w-[90vw] sm:max-w-md` + `p-3 sm:p-4` |
| 16 | `pages/egresos/tabs/CuentasPorPagarTab.tsx:427, 454, 481` | Modal con `grid-cols-2` SIN breakpoint sm | `grid-cols-1 sm:grid-cols-2` |
| 17 | `pages/egresos/tabs/CuentasPorPagarTab.tsx:531, 553` | Modal serie con `grid-cols-2/3` sin sm | `grid-cols-1 sm:grid-cols-2/3` |
| 18 | `pages/Dashboard.tsx:276` | `w-36 h-36` fijo en DonutChart dentro de flex | `w-24 h-24 sm:w-36 sm:h-36` + `flex-col sm:flex-row` |

---

## 🟠 ALTO — Grids KPI, formularios y botones que se aplastan

| # | Archivo:Línea | Problema | Fix |
|---|---|---|---|
| 19 | `components/egresos/ExpensesKPIDashboard.tsx:17` | `grid-cols-2 lg:grid-cols-4` sin sm | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| 20 | `pages/egresos/tabs/DashboardTab.tsx:47` | Igual al anterior | Igual |
| 21 | `pages/tesoreria/SeccionFlujoCaja.tsx:65` | `grid-cols-1 sm:grid-cols-3` con montos grandes | Reducir padding/font en sm |
| 22 | `pages/ingresos/tabs/DashboardCentralTab.tsx:149` | KPIs `grid-cols-2 lg:grid-cols-4` con `p-5` + `text-2xl`, badge se desborda | `sm:grid-cols-3` + `p-3` en móvil |
| 23 | `pages/juicios/ExpedienteJuicio.tsx:728` | Financial strip `grid-cols-2 md:grid-cols-4` con `text-xl font-black` | `text-lg` móvil + `px-3` |
| 24 | `pages/prestamos/FormularioPrestamo.tsx:1040` | `grid grid-cols-1 sm:grid-cols-3` deducciones con `gap-4` apretado | `gap-2 sm:gap-4` |
| 25 | `pages/clientes/FormularioCliente.tsx:359` | `grid-cols-1 sm:grid-cols-2` con `gap-4` | `gap-2 sm:gap-4` |
| 26 | `components/inversionistas/ContratosTab.tsx:241` | `grid grid-cols-2` Inmueble/Inquilino sin sm | `grid-cols-1 sm:grid-cols-2` |
| 27 | `components/inversionistas/ContratosTab.tsx:344` | Grid servicios `grid-cols-12 gap-2` imposible en 320px | `grid-cols-1 sm:grid-cols-12` o reestructurar filas |
| 28 | `pages/prestamos/ExpedientePrestamo.tsx:165` | 3 botones (Estatus/Editar/Pagar) en fila sin wrap | `flex-col sm:flex-row` o `flex-wrap` |
| 29 | `components/prestamos/ModalRegistrarPago.tsx:178` | `grid-cols-2` para inputs en modal angosto | `grid-cols-1 sm:grid-cols-2` |
| 30 | `pages/tesoreria/Tesoreria.tsx:29` | Tab bar `w-fit` 4 tabs + iconos = ~350px | `overflow-x-auto` o `flex-wrap` con icon-only en móvil |
| 31 | `pages/ingresos/IngresosDashboard.tsx:46` | Tabs `flex flex-wrap gap-1` con labels largos ("Dashboard Central", "CxC Préstamos") | `flex-nowrap overflow-x-auto scrollbar-hide` o solo iconos en sm: |
| 32 | `pages/juicios/ExpedienteJuicio.tsx:768` | Tabs `flex gap-1 w-fit` se salen del viewport | Scroll horizontal |
| 33 | `components/layout/Sidebar.tsx:68` | Sin `max-h-screen overflow-y-auto` (teclado abierto rompe layout) | Agregar al `<aside>` |
| 34 | `pages/Login.tsx:72` | `px-8 py-10` agresivo en 320px | `px-4 sm:px-8 py-6 sm:py-10` |
| 35 | `pages/Dashboard.tsx:275, 300` | `text-3xl` sin breakpoint sm | `text-xl sm:text-3xl` |

---

## 🟡 MEDIO — Spacing, modales, inputs, headers

| # | Archivo:Línea | Problema | Fix |
|---|---|---|---|
| 36 | `pages/ingresos/IngresosDashboard.tsx:38` | `p-6 lg:p-8` deja 272px útiles a 320px | `p-3 sm:p-6` |
| 37 | `pages/egresos/EgresosPage.tsx:54` | `NavigadorTemporal` (mes/año) sin verificación responsive | Revisar componente para sm: |
| 38 | `pages/tesoreria/SeccionCuentas.tsx:268` | Encabezado descripción + botón "Nueva cuenta" en una fila | `flex-col sm:flex-row` con gap |
| 39 | `pages/egresos/tabs/CuentasPorPagarTab.tsx:271` | Contador + 2 botones en fila | `flex-col gap-2 sm:flex-row sm:justify-between` |
| 40 | `components/pagos/ModalPagoFlash.tsx:62` | `max-w-md` fijo, `mx-4` no es suficiente en 320px | `max-w-sm md:max-w-md` |
| 41 | `components/pagos/ModalCobroPrestamo.tsx:73` | Igual al anterior | Igual |
| 42 | `pages/juicios/ExpedienteJuicio.tsx:688` | Header card `flex flex-wrap` con `text-2xl` cliente + folio + etapa | `flex-col sm:flex-row` + `text-xl sm:text-2xl` |
| 43 | `components/pagos/ModalPagoFlash.tsx:107` | Input monto `text-sm` muy chico con teclado abierto | `text-base` + `py-3` |
| 44 | `pages/ingresos/tabs/CxCPrestamosTab.tsx:96, 106` | Inputs interés/capital `py-2 text-sm` | `py-2.5 text-base` |
| 45 | `components/inversionistas/CardInversion.tsx:69` | `grid grid-cols-2` sin variante móvil | `grid-cols-1 sm:grid-cols-2` |
| 46 | `components/inversionistas/PerfilInversionista.tsx:510` | `grid-cols-1 sm:grid-cols-2` cards ~90px ancho a 320px | Mantener `grid-cols-1` hasta sm:640 |
| 47 | `pages/inversionistas/ListaInversionistas.tsx:112` | Stats `grid-cols-2 lg:grid-cols-4` con `p-4` apretado | `p-3 sm:p-4` |
| 48 | `pages/Inicio.tsx:55` | Tarjetas con `p-5` excesivo en 320px | `p-3 sm:p-5` |
| 49 | `components/layout/Layout.tsx:29` | `mt-16` fijo asume header desktop | `sm:mt-12` o equivalente si header colapsa |
| 50 | `pages/Dashboard.tsx:216` | KPI `grid-cols-2 lg:grid-cols-4` con `text-2xl` numbers no truncan | Considerar `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| 51 | `components/pagos/FileDropZone.tsx:82` | Drop zone `h-20` muy pequeño para touch | `h-24 sm:h-20` + button más prominente |
| 52 | `components/pagos/FileDropZone.tsx:91` | Texto largo "Arrastra o haz clic · PDF / JPG / PNG" se parte en 3 líneas | Solo "Seleccionar archivo" en móvil |
| 53 | `pages/clientes/ExpedienteCliente.tsx:202` | Ya tiene `flex-col sm:flex-row` pero sin `w-full` en avatar/info móvil | Agregar `w-full` en móvil |
| 54 | `pages/ingresos/tabs/DashboardCentralTab.tsx:176` | Títulos "Pensiones Estacionamiento" no rompen línea | `word-break: break-word` o `text-sm` móvil |
| 55 | `pages/ingresos/tabs/DashboardCentralTab.tsx:232` | Labels "Deuda total del cliente" largos sin ajuste | `truncate` o `text-xs` móvil |

---

## 🟢 BAJO — Cosmética / Truncado / Tooltips

| # | Archivo:Línea | Problema | Fix |
|---|---|---|---|
| 56 | `components/clientes/TablaClientes.tsx:84` | Nombre con `truncate max-w-0` sin tooltip | Agregar `title={...}` |
| 57 | `components/prestamos/TablaPrestamos.tsx:131` | Cliente con `max-w-[160px] truncate` sin tooltip | `title={p.cliente_nombre}` |
| 58 | `pages/inmuebles/FichaInmueble.tsx:116` | Dashboard cards `p-5` en móvil | `p-4 sm:p-5` |
| 59 | `pages/tesoreria/SeccionCuentas.tsx:65` | BankCard `aspect-[86/54]` con textos truncados a 300px | `text-xs sm:text-sm` |
| 60 | `pages/ingresos/tabs/DashboardCentralTab.tsx:293` | "Mejor día" `flex flex-wrap gap-4` | `grid grid-cols-1 sm:grid-cols-2` |
| 61 | `pages/juicios/ExpedienteJuicio.tsx:597` | Timeline `ml-3` y `ml-6` muy grandes en 320px | `ml-2` móvil |
| 62 | `pages/prestamos/ListaPrestamos.tsx:176` | Filtros `flex-wrap` sin gap móvil | `gap-1 sm:gap-2` |
| 63 | `components/layout/Header.tsx:44` | Botón LogOut `px-3 py-2` se comprime, icono chico a 320px | `text-xs sm:text-sm` |

---

## Resumen ejecutivo

| Severidad | Issues |
|---|---|
| 🔴 Crítico | 18 (tablas + modales con grids sin sm) |
| 🟠 Alto | 17 (grids KPI, tabs, formularios, botones) |
| 🟡 Medio | 20 (spacing, modales, inputs) |
| 🟢 Bajo | 8 (cosmética) |
| **Total** | **63** |

## Patrones repetidos (arreglar globalmente)

1. **`grid-cols-N` sin variante sm** — Hay ~15 lugares. Regla: cualquier grid >= 2 cols en modal/formulario debe ser `grid-cols-1 sm:grid-cols-N`.
2. **Tablas con muchas columnas sin `overflow-x-auto`** — Hay ~8 tablas. Wrapper estándar:
   ```tsx
   <div className="overflow-x-auto -mx-3 sm:mx-0">
     <table className="min-w-full">...</table>
   </div>
   ```
   y `hidden sm:table-cell` en columnas no críticas.
3. **Tabs `flex` sin scroll horizontal** — Hay ~5 lugares. Usar `flex-nowrap overflow-x-auto scrollbar-hide`.
4. **Modales `max-w-md` sin margin móvil** — `max-w-[90vw] sm:max-w-md` + `p-3 sm:p-4`.
5. **`text-xl`/`text-2xl`/`text-3xl` sin variante sm** — Bajar un tamaño en móvil.
6. **Padding `p-5`/`p-6`/`p-8`** en cards/contenedores — Bajar a `p-3 sm:p-X`.

## Recomendación de orden de ataque

1. **Sprint 1 (crítico):** Issues 1–18. Tablas + modales. Es lo que rompe usabilidad completa.
2. **Sprint 2 (alto):** Issues 19–35. KPIs, tabs, formularios. Mejora flujo principal.
3. **Sprint 3 (medio + bajo):** Issues 36–63. Pulido fino.
