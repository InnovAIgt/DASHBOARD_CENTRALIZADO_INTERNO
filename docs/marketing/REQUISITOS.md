# Requisitos del Flujo de ventas

Fuente: documento de observaciones y transcripción de la reunión
"Seguimiento de dashboard centralizado" (11/11/2026).

## Idea general del ingeniero

- **Marketing** y **Flujo de ventas** son cosas distintas y no se deben mezclar.
  - Marketing = de dónde salen los leads (redes sociales, mailing, otros).
  - Flujo de ventas = qué hace cada vendedor con los **leads calificados** que se le entregan.
- Un lead calificado es el que ya aceptó reunirse con un vendedor.
- El dashboard es una herramienta de **medición para dar coaching**: ver en qué etapa
  le va mal a cada vendedor y quién es el mejor en cada etapa.
- "Si los números no cuadran, el dashboard no sirve."

## Lista de requisitos

Leyenda: ✅ se puede con los datos actuales · ⚠️ se puede con ajustes · ❌ faltan datos · ⏳ por verificar

| # | Requisito | Estado | Nota |
|---|---|---|---|
| R1 | Quitar Redes sociales del Flujo de ventas (va en Marketing) | ✅ | La v2 no lo incluye |
| R2 | Quitar Datared (solo tenía datos de redes sociales) | ✅ | La v2 no lo incluye |
| R3 | Mostrar solo leads **calificados** | ⚠️ | La API trae calificados y no calificados; filtro por defecto "calificado" |
| R4 | Las 6 etapas: Asignación, Reunión, Demo, Envío de propuesta, Seguimiento, Cierre | ✅ | La API las trae (`opportunity_stage` 1 a 6) |
| R5 | Etapas como "cuadritos", tipo rastreo de pedido | ⚠️ | Es diseño de pantalla |
| R6 | **Tiempo** en cada etapa | ⏳ | La API da la etapa actual; revisar si `stage_feedback_json` trae fechas por etapa (Paso 2). Si no, guardar historial propio |
| R7 | Semáforo verde / amarillo / rojo por tiempo | ⏳ | Depende de R6 y de que se definan los días meta por etapa |
| R8 | Embudo por vendedor (dónde se le pierden los leads) | ✅ | Ficha de coaching por ejecutivo, con comparación frente al equipo |
| R9 | Quién es mejor en cada etapa | ✅ | Se conserva en el Recorrido de los leads; la ficha indica el paso débil del ejecutivo frente al equipo |
| R10 | Filtros por país y por vendedor | ✅ | |
| R11 | Abrir en el **mes actual**, con opción de cambiar fechas | ✅ | Hecho en el paso 3.4c: la v2 abre del día 1 del mes hasta hoy; el Período se puede cambiar o quitar |
| R12 | Las cifras deben cuadrar | ✅ | DashboardLeads ya verifica la partición de estados |
| R13 | Resultados por vendedor: citas cumplidas, cotizaciones enviadas, cierres | ✅ | Se muestran en la ficha; citas y propuestas salen de las etapas alcanzadas, cierres de ganados calificados |

## Definiciones pendientes (a confirmar con el ingeniero)

- Días meta por etapa para el semáforo (ej. Reunión = 2 días).
- Nombre para "venta ganada": DashboardLeads usa "Radicados", que se confunde con las
  radicaciones de Activaciones. Propuesta: **"Ganados"**.
- **(Paso 4)** Mostrar en pantalla un aviso de calidad de datos (leads perdidos sin motivo y
  leads abiertos con venta cerrada) y definir a quién se reportan. Ver BITACORA, paso 3.3.
