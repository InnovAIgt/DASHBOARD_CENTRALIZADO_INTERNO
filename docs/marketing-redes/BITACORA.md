# Bitácora · Redes sociales

## 17/11/2026 · Primera versión del dashboard (rama `redes-sociales`)

### Cambios solicitados
- Nuevo dashboard **Redes sociales** en el área Marketing, aparte de "Marketing por canales" (D1).
- Datos ya cargados, sin botón de subir: copia del Excel en `server/marketingRedes/datos/` + `info.json` (D5).
  Excel copiado de Descargas: "Plantilla_Metricas_Publicaciones_RRSS (3) (1).xlsx".
- Fuente de datos intercambiable en una sola función, documentada para conectar Microsoft 365 después (README).
- Resumen (6 secciones) e Informe detallado según el mockup aprobado (copiado en `mockup/`).
- Advertencias de datos detectadas con reglas, solo en el Informe (D13).
- Costos recalculados con la pauta (D14), estados (D15), meta de 14 (D17).
- Excel exportado con el patrón del portal (D21).
- "Redes sociales" en el menú de Marketing (`PortalLayout.tsx`).

### Resultado
- Excel: 3 hojas · GT 81 + SV 74 + DATA RED 14 = **169 filas**; 3 filas de total ignoradas; 21 columnas encontradas.
- Todas las cifras de control cuadran (ver `real.test.js`). Las "Incompletas" daban 25 con la primera regla
  (SV 24/06 "Radios inteligentes"); Keily decidió el estado por publicación y por fila (D15) y quedan **24**.
- Hallazgos que no estaban en la lista inicial:
  - La fila de total de **Datared** también tiene la pauta mal ($0 vs $20 real).
  - **GT 01/08 Instagram** también usa el link de un post de SV (no solo la fila de Facebook).
  - 21 costos del Excel no coinciden con los recalculados; casi siempre "Costo x Lead" está dividido entre calificados.
- Pruebas: 34 pasan (`node --test "server/marketingRedes/**/*.test.js"`). Lint y build OK.

### Errores del Excel para Marketing (17/11/2026)
- SV 09/07 Facebook ("Donde el trabajo no se detiene"): 0 leads y 6 calificados.
- Links repetidos: Datared Instagram 16/07 y 22/07; **GT 01/08 Facebook e Instagram** con links de posts de SV;
  SV 30/04 con el link de Facebook también en la fila de Instagram.
- 20 filas de SV (ago–sep) sin red social.
- Fila de total con la pauta mal: GT $40 (real $70), SV $232.50 (real $352.50) y **Datared $0 (real $20)**.
  Excel no suma las celdas escritas como texto ("$20,00").
- **"Costo x Lead" está dividido entre los calificados**, no entre los leads (y varias filas tienen los costos en $0).
- Faltan resultados: 11 publicaciones sin métricas (SV ago–sep y GT 01/08) y 24 incompletas (GT 31/07, GT ago–sep,
  Datared jul); además la fila de Instagram de SV 24/06 está incompleta.
- GT desde agosto sin `id`; números escritos como texto ("5,8 mil", "$30,00").

### Pendientes
- Al fusionar con `feature/marketing-mailing`, juntar los cambios de `PortalLayout.tsx` (D22).
- Evaluar pasar el repositorio a privado (D4).
- Conectar el servicio de Microsoft 365 cuando TI dé los permisos (README).
