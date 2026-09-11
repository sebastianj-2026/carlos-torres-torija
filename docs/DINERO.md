# Reglas de dinero — transversales al backend

> Especificadas con Sebastian el 2026-09-11 (peloteo, 5 preguntas).
> Cierran la deuda "~45 fórmulas con `toFixed`". Alcance: **backend completo**.
> La aritmética canónica es `backend/src/lib/dinero.ts` (centavos BigInt);
> el motor de comisiones ya la usa (M16) y estas reglas la extienden al legacy.

## Reglas

### D1 · Half-up parejo, en todo
Todo monto que el sistema calcula se redondea a **2 decimales half-up**
($175.0175 → $175.02; $1.005 → $1.01). Aplica igual al cobrar que al pagar:
la regla es de la aritmética, no de quién recibe el centavo. Consistente con
R24 del motor.
**Queda prohibido `toFixed` sobre dinero**: redondea según el binario del
double, no half-up — `(1.005).toFixed(2) === "1.00"`.

### D2 · Un solo redondeo, al resultado final
Los pasos intermedios se calculan exactos (centavos BigInt o enteros); solo el
monto final se redondea. Nada de redondear la tarifa por hora o el sueldo
diario antes de multiplicar — el error intermedio se multiplica por las horas
o los días.

### D3 · Recálculo retroactivo total (decisión pre-producción)
Lo persistido con la regla vieja se **recalcula todo**, incluido lo ya
cobrado/pagado. ⚠️ Esta decisión es válida **solo porque no hay producción**
(DB de desarrollo con seed demo, 2026-09-11). Si el sistema ya estuviera vivo
con dinero real de clientes, reabrir montos pagados exigiría re-especificar:
la retroactividad NO se hereda a producción como precedente.

### D4 · Una sola aritmética, display incluido
Los ~60 sitios que solo formatean respuesta (dashboard, agregados de ingresos,
tesorería) también migran: ningún total mostrado puede diferir de la suma de
sus renglones persistidos. `toFixed` desaparece del código de dinero; queda
permitido solo para porcentajes/ratios de display (ocupación, variación %),
que no son dinero.

## Qué NO hace
- No toca el **frontend** (su formateo de display es tema aparte).
- No cambia tasas, fórmulas de negocio ni bases — solo el redondeo.
- No introduce dependencia nueva: `lib/dinero.ts` (BigInt) es suficiente.
- No decide nada de producción: D3 es explícitamente pre-producción.

## Casos resueltos (al centavo)

### C1 · Normal — cierra exacto
Saldo $20,000.00 × tasa 1.50% = **$300.00**. Igual con la regla vieja.

### C2 · Borde — fracción de centavo
Saldo $10,001.00 × tasa 1.75% = $175.0175 → **$175.02** (half-up).
Con `toFixed` el resultado depende del binario (puede dar $175.01).
En centavos: 1000100 × 175 = 175017500; ÷10000 = 17501.75 → 17502 ¢.

### C3 · El que rompe — empate .005
Monto $100.50 × tasa 1.00% = $1.005 → **$1.01** (half-up).
`(1.005).toFixed(2) === "1.00"` — este es el bug que motiva D1.

### C4 · Nómina — un solo redondeo (D2)
Sueldo $100.20, 1 hora extra Normal (×1): tarifa exacta = 100.20 ÷ 40 =
$2.505 → monto **$2.51** (half-up al final).
Regla vieja: `(2.505).toFixed(2) === "2.50"` — un centavo abajo.

### C5 · Nómina — el intermedio no se redondea (D2)
Sueldo $1,000.00, prima vacacional 3 días: (1000 ÷ 6) × 3 × 0.25 =
$125.00 exacto. El cálculo corre como 1000×3×25 ÷ 600 en enteros y se
redondea una sola vez — nunca como round(166.6667) × 3 × 0.25.

## Dependencias
- `backend/src/lib/dinero.ts` — se extiende con `porcentajeHalfUp(base, tasa)`
  y `dividirHalfUp` (tests primero, casos C1–C5).
- La migración de recálculo (D3) depende de que TODOS los controllers ya
  escriban con la regla nueva — es la última tarea, con respaldo `_respaldo_*`.

## Tareas derivadas
M38–M44 en `docs/BACKLOG.md` § Dinero half-up. Orden obligatorio:
helpers (M38) → controllers (M39–M42, uno por módulo) → display (M43) →
recálculo retroactivo (M44, `data`, al final).
