# Bitácora · Flash de altas

## 18/11/2026 · Orden, seguridad, «En proceso» y Ventas (rama `ventas-flash-altas`)

### Cambios solicitados
- A. Gráficas de vendedores primero (pantalla y PDF).
- B. Quitar la llave de Workflow de `flash-altas.html` y `activaciones.html`; ruta del servidor para las preofertas;
  quitar la copia de respaldo con nombres de clientes; anotar `datos.json` público como pendiente.
- C. «En proceso» igual que el correo del 16/11 (anexos, sin renovaciones).
- D. Medidas Ventas / Anexos / Unidades (Ventas provisional).
- E. Pruebas con copia fija de `datos.json`. F. Documentación.

### Resultado
- A, C y D hechos (DECISIONES D1, D3, D4).
- B: llave fuera de los dos HTML, de `SecretsModal.tsx` y de `.env.example`; ruta `/api/workflow/preofertas` (D2).
  La variable es **`WORKFLOW_API_KEY`** (ya existía; se reutiliza).
- La copia de respaldo (05/10/2026, con nombres de clientes) se quitó después de confirmar con Keily (D5).
- Datos del 18/11 (copia fija): 4,366 filas de SAN; sin las 4 líneas BACKUP quedan 4,362 filas · 506 ventas ·
  4,321 anexos · 4,110 unidades (GT 1,995 · 245 · 1,954 · 1,843 / SV 2,367 · 261 · 2,367 · 2,267).
- Preofertas en vivo (18/11): la ruta devuelve lo mismo que la llamada directa (399 preofertas). «En proceso» pasó de
  13 solicitudes a 5 solicitudes = 26 anexos (8 renovaciones fuera).
- 66 pruebas de `server/` pasan; lint y build OK.

### Ajustes del mismo día (confirmados por Keily)
- Copia de respaldo quitada: si `datos.json` no responde, "No se pudieron cargar las altas. Intenta más tarde." (D5).
- Semáforo sin color con Ventas: se queda así; pendiente "Ventas debe definir la meta por ventas".

## 18/11/2026 · Diseño aprobado y pantalla completa

### Cambios solicitados
- Que el Flash se vea como las capturas aprobadas (prototipo `Prototipado_Dashboard_Intelfon`, cambios del 18/11), con la
  lógica y la información correctas del portal.
- Que se vea bien en toda la pantalla (se cortaba).

### Resultado
- Orden del diseño aprobado (D1); Ingreso promedio por unidad con dona, barras y tablas (D6); ejecutivos en 0 (D7);
  etiquetas «ventas · equipos eq.» en las barras; tablas completas y ajustes para laptop (D8).
- Se mantuvo la lógica del portal: Ventas / Anexos / Unidades, En proceso en anexos sin renovaciones, sin llave de
  Workflow y sin la copia de respaldo. Del prototipo NO se trajo «Altas (anexos)» (contaba filas).
- 67 pruebas pasan (nueva: cifras del ingreso promedio). Lint y build OK.

### Ajustes del mismo día (Keily)
- Colores del semáforo en Ejecutivo × mes como en la foto: el dashboard abre en **Anexos** (D4) y los números van
  en verde / amarillo / rojo.
- Clic en la dona, las barras o las tablas del ingreso promedio → ventana con el detalle exacto (D9).
- El Período abre del día 1 del mes actual a hoy (D10).
- 68 pruebas, lint y build OK.
