# Decisiones · Redes sociales

## D1 · 17/11/2026 · Dashboard aparte dentro de Marketing (D-C)
"Redes sociales" es una opción propia del menú Marketing, no una pestaña de "Marketing por canales".
Carpetas propias: `docs/marketing-redes/`, `server/marketingRedes/`, `src/modulos/marketing/redes/`.
No se modificó el Flujo de ventas ni Marketing por canales (sus patrones se **copiaron**, no se importan).

## D2 · 17/11/2026 · Datared es una marca de El Salvador (D-A)
Datared es una empresa distinta a RED El Salvador. País = SV. Se muestra como marca separada; en
"Resultados por país", El Salvador suma RED El Salvador + Datared.

## D3 · 17/11/2026 · Rama `redes-sociales`
Todo el trabajo va en la rama `redes-sociales`, creada desde `main` actualizado (commit `4d9f400`).

## D4 · 17/11/2026 · Excel real en el repositorio público
El Excel de métricas se subió con el repo público por decisión de Keily (17/11/2026). Pendiente: evaluar pasar
el repo a privado (revisar antes el plan de Vercel: en Hobby no se puede publicar desde un repo privado de organización).

## D5 · 17/11/2026 · Fuente de datos intercambiable (D-D)
Sin botón de subir. HOY la fuente es la copia `server/marketingRedes/datos/metricas-rrss.xlsx` + `info.json`.
Todo acceso al archivo pasa por `obtenerArchivoRRSS()` (`server/marketingRedes/fuente.js`), que devuelve
`{ bytes, actualizado, origen }`. El lector, los cálculos y las pantallas no saben de dónde viene el archivo.
Mañana se reemplaza solo esa función por el servicio de Microsoft 365 (README, "Cómo conectar el servicio automático").
El archivo se incluye en la función de Vercel con `includeFiles` en `vercel.json`; se busca desde `process.cwd()`
para que funcione igual en local, Docker y Vercel.

## D6 · 17/11/2026 · Hojas → marca y país
"Métricas RRSS GT" = RED Guatemala (GT) · "Métricas RRSS SV" = RED El Salvador (SV) · "Métricas RRSS DATA RED" = Datared (SV).
Se buscan por nombre normalizado (sin mayúsculas, tildes ni espacios). Una hoja desconocida no se lee y se **avisa**.

## D7 · 17/11/2026 · Columnas por nombre, no por posición
Las 21 columnas se buscan por nombre normalizado. Si falta una, se toma como vacía y se avisa.

## D8 · 17/11/2026 · Red social
"instagram" / "Instagram " → Instagram (igual Facebook). Vacía → **"Sin red"** (hoy 20 filas, todas de SV ago–sep).
Cuentan para la meta, pero no entran en "Facebook vs. Instagram".

## D9 · 17/11/2026 · Limpieza de números
Una función con pruebas propias (`numeros.js`): "5,8 mil" → 5800 · "17,5mil" → 17500 · "$30,00" → 30 ·
"$10.00" → 10 · "6\n" → 6 · "12.400" → 12400 (punto + exactamente 3 dígitos al final = miles; si no, decimal).
Vacío, "-", "–", "—" → **sin dato (null), no cero**; un 0 escrito sí es 0. Lo que no se entiende queda sin dato y
se agrega a las advertencias de lectura.

## D10 · 17/11/2026 · Links
Las redirecciones `l.facebook.com/l.php?u=…` (hoy 17) se reemplazan por el link real del parámetro `u`.
Para comparar links se ignora lo que cambia en cada copia (fbclid, utm, locale) y se conserva lo que identifica
el post (story_fbid, fbid, id, v en Facebook; la ruta /p/… en Instagram).

## D11 · 17/11/2026 · Filas de TOTAL ignoradas
Cada hoja trae al final una fila de totales sin fecha, sin campaña y sin link. Regla: **toda fila sin fecha, sin
campaña y sin link se ignora** (si no, todo saldría doble). Sus valores se guardan solo para compararlos con la suma real.

## D12 · 17/11/2026 · Identificación de la publicación
Con id → marca + id. Sin id (GT desde agosto, 34 filas) → marca + fecha + campaña normalizada (sin mayúsculas,
tildes ni espacios dobles). Las filas FB e IG del mismo post = **1 publicación**. Una publicación puede tener una sola red.

## D13 · 17/11/2026 · Advertencias de datos (D-H)
Reglas automáticas (`advertencias.js`): calificados > leads · mismo link en publicaciones distintas · mismo link en
FB e IG de la misma publicación · link de otra red (no se repite si ya aplica la anterior) · fila sin red · costo del
Excel distinto al recalculado (con pista si "Costo x Lead" está dividido entre calificados) · fila de total que no
cuadra. **Solo** se muestran en el Informe detallado (⚠ en la fila, vista "⚠ A revisar", ficha y lista general).
En el Resumen no hay avisos amarillos.

## D14 · 17/11/2026 · Costos siempre recalculados
Costo por lead = pauta ÷ leads; por lead calificado = pauta ÷ calificados; por cliente = pauta ÷ cierres.
Divisor 0 → "—" (nunca Infinity/NaN). Las columnas de costo del Excel **no se usan** (solo se comparan para avisar).
No calificados = leads − calificados; si sale negativo se muestra con ⚠ y no se corrige.

## D15 · 17/11/2026 · Estados (D-B y D-F)
El Excel no tiene columna "Estado". Por fila: **Programada** = fecha posterior a hoy · **Sin métricas** = todas las
métricas vacías (la pauta no cuenta como métrica) · **Incompleta** = tiene alcance o visualizaciones pero Leads o
Lead calificado vacíos · **Publicada** = el resto.
**Estado por PUBLICACIÓN** (conteos, meta, botones "Sin métricas" e "Incompletas"; decisión de Keily, 17/11/2026):
Programada si alguna fila lo es; Sin métricas si todas sus filas lo son; **Publicada si al menos una de sus redes
tiene sus resultados** (leads y calificados cargados = esa fila está "Publicada"); si no, Incompleta.
**Estado por FILA** (tabla del Informe, ventanas y Excel): cada fila conserva su propio estado. Ejemplo: SV 24/06
"Radios inteligentes" → la fila de Facebook es Publicada, la de Instagram sigue "Incompletas" (en la tabla dice
"Incompletas · pub. publicada") y la publicación cuenta como Publicada. Resultado: **24** publicaciones incompletas.
Se explica en pantalla, en "Qué significa cada estado". Las vistas "Sin métricas" e "Incompletas" del Informe muestran
las FILAS con ese estado. El Excel exportado trae las dos columnas: estado de la fila y estado de la publicación.
Nota: "una red con leads **o** calificados con dato" al pie de la letra daría solo 6 incompletas, porque casi todas las
filas de GT ago–sep tienen leads = 0 escrito y calificados vacíos (en el mockup aprobado, GT 03/08 es "Incompletas");
por eso la regla exige que la red tenga sus dos resultados.
Todas cuentan para la meta; los resultados vacíos cuentan como 0.

## D16 · 17/11/2026 · Hechas y programadas
Hechas = publicaciones con fecha hasta hoy; Programadas = fecha posterior a hoy. "Hoy" es la fecha de quien mira el
dashboard (se calcula en el navegador, no al leer el Excel, para que la caché no lo deje atrasado).

## D17 · 17/11/2026 · Meta de 14 publicaciones por marca al mes (D-E, D-G)
Verde si ≥ 14 ("✓ cumplió"); amarillo si 1–13 ("faltan N"); gris si 0 ("sin posts").
Mes en curso: gris "en curso · van N" (no amarillo). Primer mes de cada marca (mes de su primera publicación, con todos
los datos, sin importar los filtros): gris "inicio · N", no cuenta como incumplido.
Columnas: todos los meses entre la primera y la última publicación del Excel, recortados por el filtro de Período.

## D18 · 17/11/2026 · "Pocos datos"
Con menos de 5 datos en un gráfico o tarjeta se muestra la etiqueta gris "pocos datos" (por ejemplo, el % de
calificados con menos de 5 leads, el costo por lead calificado con menos de 5 calificados).

## D19 · 17/11/2026 · Leads por mes "sin datos"
Un mes dice "sin datos" si ninguna fila del mes tiene sus resultados cargados (estado Publicada). Hoy: agosto y septiembre.

## D20 · 17/11/2026 · Colores y diseño
Tema oscuro del portal (misma paleta que el Flujo de ventas, copiada con prefijo `rds-`). Rojo solo para lo crítico;
amarillo = atención; verde = bien; azul/gris = neutro. Referencia: `mockup/Mockup-Dashboard-Redes-sociales.pdf`.

## D21 · 17/11/2026 · Excel exportado
Mismo método que el Flujo de ventas (ExcelJS 4.4.0 desde el CDN al pulsar, CSV de respaldo), copiado en
`pantalla/excel.js`. Hojas: Publicaciones (lo filtrado), Totales (mismos cálculos que el Resumen) y Filtros aplicados.

## D22 · 17/11/2026 · Menú: juntar `PortalLayout.tsx` al fusionar con Marketing por canales
"Redes sociales" se agregó al menú de Marketing en `src/components/layout/PortalLayout.tsx` (un elemento del menú y un `if`).
"Marketing por canales" vive en la rama `feature/marketing-mailing`, que todavía no está en `main` y también agrega
su opción en ese mismo archivo. **Al fusionar las dos ramas habrá que juntar a mano los dos cambios de `PortalLayout.tsx`**
(dejar las dos opciones del menú y los dos `if`).
