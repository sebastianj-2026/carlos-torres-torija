# Definición de Listo — compuerta de especificación

> El gate verifica **código**. Esto verifica **especificación**.
> Se aplica en el chat donde defines el módulo, ANTES de que exista una tarea.
>
> Sin esta compuerta, el chat produce documentos que *parecen* completos —
> y un doc que parece completo es peor que uno visiblemente incompleto,
> porque nadie lo cuestiona.

Un módulo entra al backlog cuando cumple **las 8**:

- [ ] `REGLAS.md` sin una sola marca `⛔ REGLA NO DEFINIDA`
- [ ] Cada regla de cálculo tiene **≥3 casos resueltos con números reales**
- [ ] Los casos incluyen: el normal, el borde, y el que rompe
- [ ] Cada caso trae la salida esperada **al centavo** y el *por qué*
- [ ] Las pantallas tienen columnas, filtros y acciones **enumeradas**
- [ ] Las entidades tienen campos y tipos
- [ ] Está escrito **qué NO hace** el módulo
- [ ] El módulo tiene sus dependencias declaradas en `ESTADO.md`

## Las tres preguntas que revientan una especificación floja

1. *¿Qué pasa si el pago no alcanza para cubrir el primer concepto de la cascada?*
2. *¿Qué pasa si esto se recalcula a mitad del periodo?*
3. *¿Quién se queda con el centavo del redondeo?*

Si alguna no tiene respuesta con número, el módulo no está listo.
