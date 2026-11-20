# Requisitos · Redes sociales

## Pedido del ingeniero (reunión del 11/11/2026)

Ver las **publicaciones de redes sociales hechas o programadas**:
- **por marca** (RED Guatemala, RED El Salvador, Datared) y **por país** (Guatemala, El Salvador);
- con sus resultados en **leads totales**, **leads no calificados** y **leads calificados**;
- contra la **meta de 14 publicaciones al mes** por marca.

## Requisitos acordados para la primera versión (17/11/2026)

1. Dashboard **aparte** dentro del área Marketing (no dentro de "Marketing por canales").
2. **Sin botón de subir**: el dashboard se ve terminado, con los datos ya cargados desde una copia del Excel en el proyecto.
3. La fuente del Excel debe poder cambiarse después (servicio de Microsoft 365) tocando **una sola función**.
4. Pestañas **Resumen** e **Informe detallado**, filtros Marca / País / Red / Período que afectan a las dos.
5. Resumen: 6 indicadores, meta de 14 al mes, leads por mes, resultados por país, por marca y Facebook vs. Instagram.
6. Informe: una fila por publicación y red, buscador, vistas por estado, "⚠ A revisar", paginación, Excel y ficha con el link real.
7. Advertencias de datos detectadas con reglas, **solo** en el Informe detallado.
8. Costos **recalculados** con la pauta (no se usan los del Excel).
9. Todo número cliqueable con su detalle; cada cálculo explicado en pantalla.
10. Colores: rojo solo para lo crítico; amarillo = atención; verde = bien; azul/gris = neutro.
11. Las mismas cifras en Resumen, Informe y Excel exportado.

## Cifras de control (Excel de noviembre 2026)

169 filas · 85 publicaciones (85 hechas · 0 programadas) · 548 leads · 169 calificados · 379 no calificados ·
30 cierres · 187 unidades · $442.50 de pauta · $2.62 por lead calificado. Detalle por marca, país, red y mes en
`server/marketingRedes/real.test.js`.
