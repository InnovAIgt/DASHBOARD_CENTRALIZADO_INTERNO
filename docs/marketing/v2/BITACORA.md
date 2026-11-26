# Bitácora · Marketing v2

Diario del trabajo del dashboard nuevo de Marketing. Lo más reciente va arriba.

## 2026-11-25 · Se quitó la pestaña «Otros»

- Canales de marketing queda con 2 pestañas: Mailing y Redes sociales. Se quitó el botón «Otros» y su aviso
  «Próximamente (PBX, web, etc.)» de `MarketingV2.jsx`; el subtítulo pasa a «Campañas de correo y redes sociales ·
  Guatemala y El Salvador». Si alguien tenía «Otros» recordada, se abre Mailing.
- Motivo: 17 leads en 2026 y sin datos de actividad (DECISIONES). Se retoma si aparece una fuente (Analytics, PBX o
  referidos) (PENDIENTES). OTROS.md se queda como referencia de las APIs de Prospekt. No se tocó la lógica de leads.

## 2026-11-25 · Redes: cuenta publicitaria de Guatemala integrada

- `act_2226740844336751` (GTQ) junto a la de SV en Anuncios, Presupuestos, Plataformas, Segmentaciones, meses de 2026 y
  Año; todo en US$ con `TIPO_CAMBIO_GTQ_USD` (por defecto 7.64, por confirmar) y el monto original en Q en el detalle.
  Reclutamiento de GT aparte. Leads de GT repartidos por campaña; costo por lead por país. Sin anuncios de DATA RED en
  esa cuenta. Gasto comercial GT: junio a noviembre (noviembre: 3 campañas, Q 1,130.00 · US$ 147.92). REDES.md, 7.10.
- El webhook de Brevo ya apunta a producción (confirmado en Brevo): se quitó de PENDIENTES; el bypass de Vercel ya se
  puede borrar.

## 2026-11-25 · Pendientes resueltos (revisado contra origin/main)

- Merge a `main` aprobado y hecho: `origin/main` (53306da) ya tiene `api/marketing/canales.js` y el cron de
  `/api/marketing/mantener-supabase` (0 12 * * *, 6:00 a. m. UTC−6) en vercel.json, y ya no lee
  `GOOGLE_SERVICE_ACCOUNT_JSON`, `MARKETING_DRIVE_FOLDER_ID` ni `MARKETING_LOCAL_CSV_DIR`.
- `PROSPEKT_API_KEY` y `CRON_SECRET` puestas en Vercel Production. Revisión de la campaña 80 hecha (el SQL 005 ya se
  puede correr: hoy tiene 11 eventos).
- Leads por campaña en Anuncios: hecho (entrada «leads estimados por campaña»).
- Corrección: el informe anterior se basó en el `main` local desactualizado (a9aebe0).

## 2026-11-25 · Redes: PDF con leads y tarjetas compactas

- El PDF de Redes incluye el bloque Leads de Redes (embudo y tarjetas), la columna de leads por país y marca, los leads
  estimados por campaña y las 3 tarjetas compactas de Anuncios con su lectura. Sin datos de clientes. Revisado al ancho
  de carta; la herramienta compartida descarga en A4 horizontal (no se tocó). REDES.md, 7.9.

## 2026-11-25 · Redes: leads estimados por campaña

- Tabla de campañas y ventana de cada campaña: leads estimados (mismo país y día; varias campañas a la vez → según sus
  mensajes) y costo por lead, con etiqueta «estimado» y la regla en el globo. Consulta nueva a Meta por campaña y día.
  Se quitó la columna de leads por anuncio. Guatemala: «sin campaña conectada». Noviembre: 13 de SV repartidos, 7 de GT
  sin campaña. REDES.md, 7.8.

## 2026-11-25 · Redes: todos los meses de 2026 y vista «Año»

- Filtro de Mes de enero 2026 al actual; cada mes se pide al elegirlo; caché 24 h meses cerrados y 30 min el actual
  (2 min si hubo aviso o vino vacío). Cada consulta falla sola. «Sin datos para este mes». Comparación con el mes
  anterior solo si tiene datos. «Año 2026» en Resumen (ruta liviana nueva, solo al elegirla).
- Arreglo: Instagram no filtra por fecha; enero salía sin las publicaciones de Instagram de RED SV (ahora 62 = año).
- Tiempos: enero 12.2 s, junio 9.4 s, noviembre 9.7 s la primera vez; 0.03 s desde caché. Año: ~20 s y luego al
  instante. REDES.md, 7.7.

## 2026-11-25 · Redes: tarjetas compactas en Anuncios

- Presupuestos, ¿Dónde se vieron y escribieron? y Segmentaciones ganadoras rediseñadas como el
  mockup_anuncios_compacto: compactas, con línea de color, ícono, píldoras de costo, barras finas, lectura en 1 línea
  con «Ver más» y la misma altura. Lo secundario pasó a «Ver reparto» y a las ventanas de detalle. WhatsApp y Otras van
  juntas si las dos tienen menos de 5 mensajes (su fila abre «Ver reparto»). Lectura nueva en Segmentaciones.
- Títulos en mayúsculas y minúsculas normales, con la lista editable `datos/palabrasTalCual.js` (siglas y nombres que
  se quedan como están). Sin consultas nuevas a Meta. Revisado a 1050, 1366 y 1920 px. REDES.md, 7.4.
- Ajustes: «Black Friday», «Cyber Monday» y «RH» agregados a la lista; las tablas de las ventanas de Redes usan la
  misma letra que el resto con tabular-nums (Mailing sin cambios).

## 2026-11-25 · Redes: ¿dónde se vieron y dónde escribieron?

- Igual al mockup_plataformas: pestañas para la dona (Mensajes, Impresiones, Inversión), tabla por plataforma
  (impresiones, CTR, mensajes y costo por mensaje en verde/ámbar o «pocos datos»), «¿Lo que se vio trajo mensajes?»
  (barras apiladas) y lectura calculada. Clic en una plataforma = ventana con resultado (inversión, impresiones, CTR y
  CPC, mensajes, costo vs promedio), ubicaciones con «qué es» y recomendación (solo si hay una ubicación con 5+
  mensajes). Sin consultas nuevas a Meta: se suman los clics que ya traía la consulta de ubicaciones. Sin desglose
  por campaña ni por edad (ya están en otras tarjetas) y sin el top 5 de ubicaciones en la tarjeta. Noviembre: 4
  plataformas, 15 ubicaciones (12 con clics). REDES.md, 7.4.

## 2026-11-25 · Redes: presupuestos más efectivos y campañas nombradas por su texto

- Igual al mockup_presupuestos: resumen arriba (total, mejor campaña 5+, promedio y meta), barras con inversión →
  mensajes, costo y estado frente a la meta, pocos datos plegados, «¿A dónde fue el dinero y qué trajo?» y lectura
  calculada. Clic = ventana de la campaña (resultado, presupuesto del mes, por semana con aviso de cansancio,
  comparación, anuncios y recomendación). Una consulta nueva a Meta (por semana), solo GET, con caché, sin
  reclutamiento. Noviembre: 5 campañas, 2 con 5+ mensajes, 3 con pocos datos.
- Cada campaña se nombra por su texto promocionado; debajo «Campaña: … · objetivo». Se quitan los comodines de Meta
  (`{{user_first_name}}`). REDES.md, 7.4.

## 2026-11-25 · Redes: ventana de detalle de cada segmentación

- Igual al mockup_detalle_segmentacion: encabezado (campaña, conjunto, marca, objetivo, estado, fechas, presupuesto),
  resultados del público (inversión y mensajes con su parte del mes, costo vs promedio, alcance, frecuencia, CTR, CPC,
  leads estimados y costo por lead), lectura para Marketing (3 frases calculadas), público configurado y comparación
  con los otros públicos y la meta, mensajes por edad y sexo, plataforma y momento del día, anuncios del conjunto y
  recomendación calculada (solo con 5+ mensajes). Dos consultas nuevas a Meta por conjunto (resultados y horas del
  mes), solo GET, con caché. REDES.md, 7.4.

## 2026-11-25 · Redes: segmentaciones con el nombre de la campaña

- Cada fila de «Segmentaciones ganadoras» dice la campaña (nombre limpio); debajo, «Conjunto: …» si se llama distinto,
  el público, el texto de la publicación promocionada y mensajes y gasto. Clic = detalle con campaña, conjunto, público y
  sus anuncios. Noviembre: 5 segmentaciones, 8 anuncios, 4 con texto, 2 con conjunto de nombre distinto.

## 2026-11-25 · Redes: detalle de anuncios más liviano y resistente

- En producción, /anuncios-detalle daba error de Meta código 2 («error inesperado, reintente») y TODOS los recuadros
  fallaban: las 8 consultas iban a la vez y, si una fallaba, se perdía todo el detalle.
- Ahora: consultas de a 2; reintento con espera (1 s y 3 s) para los códigos 1, 2, 4 y 17; horarios por campaña día
  por día (menos filas) con límite de 20 s; límite total de 45 s; caché por consulta (lo que cargó se reusa); si una
  consulta falla, solo su recuadro muestra el error. Con Meta real: 10.7 s la primera vez, 4 ms desde la caché.

## 2026-11-24 · Vercel: una sola función para Canales de marketing

- El deploy fallaba: el plan Hobby permite máximo 12 funciones y había 19. Las 13 de Mailing, Redes, webhook de Brevo
  y tarea diaria de Supabase quedan en una sola (api/marketing/canales.js → server/marketingCanales.js), con un rewrite
  en vercel.json; las URLs no cambian. Reuniones (Flujo de ventas) y los otros dashboards no se tocaron. Quedan 7.

## 2026-11-24 · Redes: costo por lead de El Salvador y cerrados

- Costo por lead = inversión ÷ leads de SV (noviembre US$ 12.40); en Guatemala, «sin pauta». En Anuncios, Leads de
  Redes y la ventana de detalle.
- Prospekt no separa ganados de perdidos: «Cerrados (ganados o perdidos)»; pregunta en PENDIENTES.

## 2026-11-24 · Redes: rediseño completo y leads de Prospekt

- Estilo compacto y profesional (mejoras de redes-mejoras.css + capa compacta), ventana de detalle en todo lo que se
  puede tocar, Resumen en el orden del mockup con Leads de Redes, Anuncios con barras de costo y meta, ¿Dónde se
  vieron?, ¿Cuándo nos escriben?, pirámide de edad y sexo y campañas con objetivo y texto.
- Leads de Redes desde Prospekt (exacto por origen, estimado por publicación, ficha del cliente con datos completos
  por decisión de Keily; confirmar con Eduardo antes de producción). REDES.md 7.5 y 7.6; PENDIENTES actualizado.

## 2026-11-24 · Redes: Anuncios fase 2 con datos reales

- Ruta nueva /api/marketing/redes/anuncios-detalle (por anuncio, sin reclutamiento, mes del filtro): edad y sexo,
  plataforma y ubicación, horarios (zona de la cuenta America/El_Salvador, UTC−6), segmentaciones, presupuestos y
  conteo de formularios (4 en noviembre, 5 en octubre).
- Pantalla sin etiquetas «Ejemplo»; «pocos datos» con menos de 5 mensajes, nunca ganador. Detalle en REDES.md, 7.4.

## 2026-11-24 · Redes, Tarea 2: pantalla conectada a Meta

- Servidor: cuadro de marcas lleno, métricas v25 de cuenta y de publicación, anuncios por página del anuncio,
  reclutamiento aparte, fechas en UTC−6, caché y errores; prueba de que no se filtran secretos.
- Pantalla: siempre Meta (error con «Reintentar»), tabla de hechas y programadas por país y marca, «Instagram no
  permite ver programadas», alcance como suma de alcance diario, vistas y clics en Publicaciones, PDF igual.
- Con datos reales: 25 publicaciones en noviembre, 0 programadas, inversión de marketing US$ 142.84 y reclutamiento
  US$ 77.25. Detalle en REDES.md, 7.3. Pendiente nuevo: permiso para comentarios de Facebook.

## 2026-11-24 · Redes: consultas 10 y 11 con el token nuevo

- `ads_posts` sigue con 403. `promotion_status` dice `inactive` en casi todo, también en publicaciones que sí están en
  anuncios de la cuenta USD: no sirve. No se puede confirmar con el token si RED GT pauta desde otra cuenta.

## 2026-11-24 · Redes: token nuevo con read_insights

- Keily agregó el caso de uso «Administrar todos los aspectos de tu página» y generó un token nuevo (7 permisos).
  `/me/permissions` confirma read_insights concedido.
- Las estadísticas de Facebook de página y de publicación ya responden en las 3 páginas (REDES.md, 7.2 y tabla 2.1).
  Se quita el pendiente de «Facebook vacío».

## 2026-11-24 · Redes: consulta 10 (ads_posts)

- `ads_posts` da error 403 (código 200, falta permiso) en las 3 páginas: no se puede saber con el token si RED GT
  pauta desde otra cuenta. Queda la pregunta a Marketing en PENDIENTES.

## 2026-11-24 · Redes: consulta 9 y lista de reclutamiento

- El usuario del token tiene ANALYZE en las 3 páginas, pero las estadísticas de Facebook (página y publicación)
  siguen vacías en RED SV y DATA RED, también con fechas de hace más de 3 días: no es demora; falta revisar
  read_insights o el token del usuario del sistema.
- Reclutamiento: se agregan «ejecutivo de ventas», «contratación», «contratando» y «únete» (frase completa).

## 2026-11-24 · Redes: cuentas aprobadas y reclutamiento aparte

- Keily aprueba la propuesta de cuentas (solo la USD, gasto por página del anuncio, RED GT «sin pauta», GTQ fuera).
- Reclutamiento se separa por palabras en el nombre de la campaña (DECISIONES.md; REDES.md, 7.2).
- PENDIENTES: de dónde sale la pauta de RED GT (cuenta del negocio GT o cuenta personal que el token no ve).

## 2026-11-24 · Redes: cuentas publicitarias y estadísticas con el token

- Cuenta USD (act_2035747430056013): del «Negocio de Red Intelfon», US$ 1,697.67 en total y US$ 666.55 en 90 días,
  78 campañas; promociona RED SV (81 anuncios) y DATA RED (2). Ningún anuncio de RED GT. Hay campañas de reclutamiento.
- Cuenta GTQ (act_1657231285337963): personal, sin anuncios de RED (sin gasto ni campañas): queda fuera.
- Negocio «RED Intelfon Guatemala»: sin cuentas publicitarias ni páginas; sin error de permiso.
- Estadísticas v25: Instagram (publicación y cuenta) responde; Facebook (página y publicación) responde vacío.
- Propuesta de cuentas y detalle en REDES.md, 7.2 (y tabla 2.1 con los nombres de v25); pendientes nuevos.

## 2026-11-24 · Redes, parte (1): qué ve el token de Meta

- Token de usuario (app «Automatizacion RRSS RED»), API v25.0. Siete consultas GET firmadas con appsecret_proof.
  El primer intento falló (código 190, token mal formado: faltaba la «E» inicial); Keily lo corrigió en .env.local.
- Ve las 3 páginas (DATA RED, RED SV, RED GT) con sus 3 Instagram, 2 negocios y 2 cuentas publicitarias (USD y GTQ).
- `scheduled_posts` se puede leer en las 3 páginas (hoy 0 programadas). Las estadísticas de página de prueba
  responden sin error pero vacías. Detalle en REDES.md, 7.1; pendientes nuevos en PENDIENTES.md. Pantalla sin cambios.
- Decisión de Keily: por ahora solo la cuenta publicitaria act_2035747430056013 (USD); la GTQ queda fuera hasta que
  Marketing confirme si es de la empresa.

## 2026-11-24 · Mailing cuenta solo los leads de Mailing

- Pedido de Keily: tarjeta, sub-pestaña Leads y Comparar muestran por defecto solo los leads con campaña asignada o
  con origen «PostIAlo Mailing» (hoy 6 de 291, todos sin campaña y 2 cerrados). Interruptor «Ver leads de todos los
  orígenes» apagado por defecto. Nota nueva: «Leads de correo: 6. Solo 29 de 291 leads de Prospekt traen correo».
  DECISIONES.md y MAILING.md, 11.3.

## 2026-11-24 · Leads de Prospekt en Mailing

- Pedido del ingeniero: apertura, lectura y leads calificados y no calificados de las campañas, también por territorio.
  Plan aprobado por Keily; reglas de atribución en DECISIONES.md y MAILING.md, sección 11.
- Parte 1 (servidor): lectura de `/api/external/leads-calificados` con `PROSPEKT_API_KEY` (solo GET), sin repetidos por
  código; atribución exacta / estimada / sin campaña; cruce asesor ↔ ejecutivo; ruta `GET /api/marketing/mailing/leads`
  con caché y errores que no detienen Mailing. Nunca devuelve correo ni teléfono.
- Prueba de lectura (solo conteos, con permiso para leer Prospekt y `mkt_brevo_eventos`): 291 leads únicos, 0 exactos,
  0 estimados, 291 sin campaña, 186 cerrados. Solo 29 traen correo; los que coinciden se crearon antes de las campañas;
  los «PostIAlo Mailing» de junio y julio son anteriores a las campañas de esta cuenta. Preguntas a Ismael en PENDIENTES.
- Keily confirmó que la hora de creación de Prospekt está en UTC (DECISIONES.md).
- Partes 3 y 4 (pantalla): tarjeta Leads en Resultados generales, columnas Leads / Cerrados / Conversión y grupos en
  Comparar campañas, «Leads por ejecutivo y territorio» y la sub-pestaña Leads, con los filtros de Mailing.
  Cruce de asesores con Cumplimiento (solo lectura, con permiso): 110 exactos, 135 posibles y 46 sin cruce.
- Parte 5: MAILING.md (sección 11), DECISIONES, PENDIENTES, PRODUCCION (`PROSPEKT_API_KEY`), README y OTROS.md (nuevo).

## 2026-11-24 · Historial 77, 78, 79, 71, 68 y 66 cargado y nueva regla de campañas de prueba

- Prueba en seco y carga (con el «sí» de Keily) de los CSV «por contacto»: nuevos 809 de 817 (77), 574 de 581 (78),
  523 de 529 (79), 313 de 313 (71), 317 de 317 (68) y 350 de 350 (66). Los que se saltaron ya habían llegado por el
  webhook: la huella evita duplicados entre webhook e historial. Detalle y diferencias con Brevo en MAILING.md, 10.3.
- La 70 no se cargó (parece prueba interna): se confirma con Ismael (PENDIENTES).
- Regla de campañas de prueba cambiada (DECISIONES.md): solo [VALIDACIÓN], [TEST] o [PRUEBA] entre corchetes, o TEST /
  PRUEBA sola. La 77, 78 y 79 ahora se ven siempre, con sus correos por corregir. Ocultas: 21 de 55.

## 2026-11-24 · Redes sociales: partes (2) a (5) y Anuncios, con datos de ejemplo (sin token)

- **(2) Rutas** `/api/marketing/redes/{cuentas,publicaciones,programadas,anuncios}` (server/redes/): solo lectura de Meta,
  firma appsecret_proof, token de página, errores claros (token vencido, permiso, límite), aviso por cuenta que falla y
  caché de 30 min. Sin `META_TOKEN` responden «sin_token» y la pantalla usa ejemplo. El cuadro de marcas
  (server/redes/cuadroMarcas.js) está vacío hasta la parte (1). Probado con respuestas inventadas; no se llamó a Meta.
- **(3) Resumen y Publicaciones** como el mockup v6 (lo esencial, pedido del ingeniero): 6 tarjetas, «Lo importante del
  mes», 3 donas que filtran, programado vs publicado por marca, alcance por semana, ¿qué marca va mejor? (vs mismo
  período del mes anterior), top 5 / no salieron, pauta; calendario, mejor día y tabla ordenable.
- **(4) Programadas en 3 casos** (datos/redesProgramadas.js). Ejemplo: noviembre = A (plan), octubre = B (Facebook),
  septiembre = C (sin programadas). El cumplimiento cuenta solo lo programado; lo publicado fuera del plan suma aparte.
- **(5) PDF** con la misma herramienta de Mailing (Resumen, Publicaciones, Anuncios).
- **Anuncios (fase 2):** indicadores, presupuestos y tabla con forma real; horarios, edad y sexo, segmentaciones,
  ubicación y formularios marcados «Ejemplo».
- **Cómo revisarlo en local:** `npm run dev` → http://localhost:3000 → Marketing → Canales de marketing → Redes
  sociales. Cambiar el mes (Septiembre / Octubre / Noviembre) para ver los casos C, B y A; tocar las donas (filtran y
  llevan a Publicaciones), el calendario (marca la fila), los encabezados de la tabla y el botón PDF. En Production la
  pestaña sigue en «Próximamente».

## 2026-11-24 · Redes sociales: plan v2 (como Mailing)

- REDES.md reescrito por partes: objetivo (fase 1: hechas y programadas por marca y país; leads y lo de Ismael en
  fase 2), fuentes con las consultas y campos exactos de Meta que se pedirán, qué no da Meta, programadas en 3 casos
  (Facebook por API, Instagram no existe, «Plan del mes» solo si Marketing tiene plan), cómo se ve «¿Cumplimos lo
  programado?» en cada caso, moneda por cuenta y tasas calculadas en el dashboard, rutas con errores de Meta y las 6
  partes. Se conserva lo válido del plan del 23/11 (acceso, permisos, leads).
- Falta el mockup v4 en `Descargas\datos-marketing\plantilla\` (solo está el v3). Sin código todavía: espera el «sí».

## 2026-11-23 · Mailing preparado para producción (sin push)

- Redes sociales: en Vercel Production muestra «Próximamente» y en Preview / local la pantalla de ejemplo; se decide
  al armar la página con VERCEL_ENV y `MKT_REDES_VISIBLE` (si/no) la fuerza. En Production los datos de ejemplo no
  entran en la página (comprobado armando la página como Production y como Preview).
- Cron diario de Vercel (`vercel.json`, 12:00 UTC) → `/api/marketing/mantener-supabase`: exige
  `Authorization: Bearer CRON_SECRET` y hace una sola lectura mínima en el Supabase de Marketing (no escribe).
- Nueva guía [PRODUCCION.md](PRODUCCION.md): variables de Production (falta `CRON_SECRET`), checklist de pruebas
  después del merge (incluye pasar el webhook de Brevo a producción y borrar el bypass) y borrador del mensaje a
  Eduardo. `.env.example` suma `CRON_SECRET` y `MKT_REDES_VISIBLE` (vacías).

## 2026-11-23 · Menú lateral escondido en Canales de marketing y ventanas encima del menú

- Como en Flujo de ventas: en Canales de marketing el menú del portal se esconde, se asoma al acercar el mouse al
  borde izquierdo (marca discreta) y el dashboard usa todo el ancho. Cambio de una línea en PortalLayout.tsx (solo
  para la página marketing-v2); no se tocaron los archivos de Flujo de ventas ni los demás dashboards.
- Las ventanas de Mailing (ejecutivo, correo con diseño, ficha) quedan por encima del menú: antes el menú las
  tapaba por la izquierda. El globo de valores también va encima de las ventanas.
- Ajuste: en Canales de marketing, al asomarse el menú el dashboard se corre a la derecha (280 px) y se acomoda al
  espacio que queda; el menú ya no tapa nada. Al alejar el mouse, el menú se esconde y el dashboard vuelve a todo el
  ancho. Flujo de ventas sigue como estaba.

## 2026-11-23 · Detalle por correo: aperturas de Apple

- Antes, `proxy_open` (webhook) no se tomaba en cuenta en la columna Apertura (solo se veía en la ficha) y no había
  marca cuando un correo tenía apertura real y de Apple. Ahora `proxy_open` cuenta como apertura automática de Apple
  (igual que `apple_mpp` del historial), la apertura lleva la marca «Apple» y hay un filtro «Tipo de apertura»: solo
  reales o solo de Apple (también en el Excel). Solo lectura: no cambia nada en Brevo ni en Supabase.

## 2026-11-23 · Mailing terminado

- **Revisión de todas las vistas:** asunto como título y «#id · nombre real» abajo, Comparar como la maqueta, barra de
  filtros tipo Facturación con PDF y tarjetas compactas ya estaban en Resultados generales y Comparar. Faltaban las
  tarjetas compactas en Detalle por correo, Relación con clientes y Cargo y objetivo: listas (la tarjeta marca el
  filtro puesto).
- **Paso 5 del rediseño:** Detalle por correo y Relación con clientes con títulos de bloque y tarjetas como el resto.
  Los **motivos técnicos** pasaron a Detalle por correo: «Motivos de CORREGIR» y «Motivos de MANTENER», cada motivo
  filtra la tabla y el Excel dice qué motivo se eligió.
- **Pedido del ingeniero:**
  - **Por ejecutivo y territorio** (en Comparar campañas): una tarjeta por país (clic = filtro País) y una fila por
    ejecutivo + país del cliente en Cumplimiento de Clientes (solo lectura), con cartera, clientes alcanzados,
    destinatarios, entrega con semáforo, apertura registrada, clic y por corregir. Clic en una fila abre su cartera.
  - **Campañas programadas** (Resultados generales): las campañas en cola de Brevo (solo lectura), con asunto,
    nombre, cargo y fecha de envío; hoy no hay ninguna.
  - **Lectura estimada** (Resultados generales): aperturas de Brevo (incluyen automáticas) menos aperturas Apple MPP,
    campaña por campaña y nunca menos de 0, ÷ entregados. En los CSV del historial se comprobó (solo conteos) que
    Apple MPP va incluido en el total de aperturas y que la fecha de apertura solo aparece cuando hubo una apertura
    no automática. Falta que el ingeniero confirme la definición.
- **SQL 005** (`sql/005_borrar_campana_prueba_80.sql`): primero un SELECT con el conteo de la campaña [PRUEBA] 80 y
  después el borrado, que solo se hace si el total coincide. Lo corre Keily después de la segunda revisión.
- **PENDIENTES** quedó solo con lo que depende de otros o de producción. Salieron:
  - Resueltos (ya anotados en esta bitácora): código de Brevo, programadas en la API, motivo del rebote, dónde se
    guardan los eventos, webhook creado, SQL 001, 002 y 004, prueba local, proyecto de Vercel, error 429, encabezado
    del webhook, `CC_DB_PASSWORD` y `BREVO_API_KEY` en Preview, `globalStats`, permiso de Cumplimiento, enlace «IR A
    CORREGIR», dónde se guarda el cargo (`mkt_campana_cargo`) y el rediseño de Mailing.
  - **Tareas de Keily** (ya no dependen de otros):
    - Segunda revisión de la campaña [PRUEBA] 80 (clics y `proxy_open`) y luego correr el SQL 005.
    - Exportar los CSV de las campañas 1, 2, 3, 68 y 71 (MAILING.md, 10.3) y después 70, 42, 41, 40, 39, 38, 37,
      36, 35, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21 y 20.
    - Poner `MKT_CLAVE_EDICION` en `.env.local` y en Vercel Preview (Production va en PENDIENTES, al publicar).
    - Revisar el borrador del aviso por correo a cada ejecutivo (ventana y correo con diseño, sin envío automático).
    - Decidir más adelante: respaldo de los eventos del webhook, limpieza de eventos de más de 12 meses, inicio de
      sesión real del portal y la opción B (sesión para Marketing).
    - Borrar `.git/worktrees/wt` con `git worktree prune` cuando OneDrive lo libere (no afecta la rama).
  - Informativo (queda en MAILING.md, 10.3): el hueco de aperturas y clics entre el CSV (16/11) y el webhook (23/11).

## 2026-11-23 · Redes: DATA RED es de El Salvador

- Confirmado: DATA RED es de El Salvador (país SV en filtros y resúmenes); se quitó de pendientes.
- La parte (1) de Redes listará primero las páginas, cuentas de Instagram y cuentas de anuncios que vea el token,
  para confirmar con Marketing que no falte ninguna.

## 2026-11-23 · Redes sociales: plan aprobado

- Keily aprobó el plan de la pestaña Redes sociales por partes (REDES.md): acceso a Meta (Erick agrega a Keily al
  Business Manager; Keily crea la app tipo Empresa, el usuario del sistema de solo lectura y el token), qué da la API y
  qué no (leads calificados, programadas de Instagram), rutas con caché, pantalla con el estilo de Mailing y, para
  después, «Plan del mes» con la clave de Marketing. Variables: META_TOKEN, META_APP_SECRET y META_API_VERSION.
- La parte (1) (prueba de solo lectura) espera el token de Meta. Todavía no hay código de Redes.

## 2026-11-23 · «Cargo y objetivo»: Guardar con clave de Marketing

- Ruta `POST/DELETE /api/marketing/mailing/cargo`: «entrar» valida la clave de Marketing en el servidor
  (`MKT_CLAVE_EDICION`) y da un permiso firmado de 8 h; «guardar» y «volver a lo sugerido» lo exigen. Límite de 5
  claves incorrectas en 15 min. Solo escribe en `mkt_campana_cargo`; la campaña se valida contra la lista en memoria
  o leyendo Brevo solo para leer.
- Pantalla: cargo y objetivo editables, ventana «Clave de Marketing» + «Tu nombre» la primera vez, Guardar (también
  confirma lo sugerido tal cual), «Volver a lo sugerido» y «Confirmado · por <nombre> · <fecha>». Lo guardado se aplica
  al instante en todo el dashboard.

## 2026-11-23 · Palabras del cargo fuera del nombre de la campaña

- En el NOMBRE de la campaña también se ignoran las palabras del cargo (gerente, general, financiero, finaciero,
  finanzas, operaciones, operativo, G.G, G.F, G.O, GG, GF, GO, base completa); en el asunto siguen contando. De 31
  campañas reales solo cambió la #21: de «Mejorar la productividad» (por el nombre) a «Promover el dashboard de
  rondas» (por el contenido del correo).

## 2026-11-23 · SQL 004 corrido y «con costo» / «sin costo» fuera del nombre

- Keily corrió el SQL 004: «objetivo» (texto libre) y «objetivo_asignado_en» creados y el cargo ya es opcional. El
  servidor lee la columna (consulta con objetivo: HTTP 200); la tabla aún no tiene filas.
- En el NOMBRE de la campaña se ignoran «con costo» y «sin costo» (precio de la oferta). De las 7 campañas que caían en
  «Reducir costos operativos»: #32, #31, #26, #25, #24 y #23 pasan al contenido del correo («Promover el dashboard de
  rondas»); la #21 queda por su nombre («GERENTE DE OPERACIONES» → «Mejorar la productividad»).

## 2026-11-23 · Campañas, parte 4: «Cargo y objetivo»

- La sub-pestaña «Asignar cargo» pasa a «Cargo y objetivo»: cargo (sugerido por el nombre) y objetivo (los 8 de Keily
  + «Promoción general de RED», y se puede escribir uno nuevo), cada uno con su estado Sugerido / Revisar /
  Confirmado; lo elegido a mano gana. «Guardar» sigue deshabilitado hasta el inicio de sesión real.
- SQL 004 (`docs/marketing/v2/sql/004_objetivo_campana.sql`, lo corre Keily): objetivo como TEXTO LIBRE, cargo deja de
  ser obligatorio y cada fila debe tener cargo u objetivo. El servidor ya lee el objetivo y, mientras el SQL no se
  corra, sigue leyendo solo el cargo.
- Revisión con los datos reales (31 campañas enviadas, sin pruebas): 22 objetivos salen del asunto y 9 del nombre;
  ninguna necesitó el contenido ni quedó en «Revisar». Los nombres con «CON COSTO» / «SIN COSTO» caen en «Reducir
  costos operativos» cuando el asunto no coincide (por revisar con Ismael).

## 2026-11-23 · Campañas, parte 3: detalle de un ejecutivo

- Acordeón de «Por comercial» como la maqueta del ejecutivo desplegado: 4 números (enviados a su cartera, entrega,
  apertura, por corregir); «🔥 Clientes interesados» (dieron clic, con el asunto de esa campaña, o abrieron 2+
  campañas) con «Llamar»; «No reciben» (rebotaron, con motivo y «Corregir») y «Nunca abren» (0 de N) lado a lado;
  «Sus campañas» con el asunto de título y «#id NOMBRE · cargo · fecha» debajo, entrega (semáforo) y apertura de su
  cartera; fila del aviso con el correo del ejecutivo (de correos_usuarios o el guardado en el navegador), «Aviso
  48 h» (la misma vista previa del correo con diseño; nunca se envía solo) y «Ver cartera completa» (Relación con
  clientes filtrada por ese ejecutivo); «Leads de su cartera: próximamente».

## 2026-11-23 · Campañas, parte 2: detalle de una campaña con su objetivo

- Objetivo de cada campaña con la lista de 8 de Keily (DECISIONES.md): se sugiere por el asunto, el nombre o el
  contenido del correo (la API de Brevo sí lo trae; el servidor solo manda el objetivo encontrado) y, si nada
  coincide, «Promoción general de RED» para revisar. Se muestra el estado y de dónde salió.
- Acordeón de la campaña: objetivo, asunto/fecha/cargo, recorrido (Brevo), dónde dieron clic (personas por destino),
  rebotes y por corregir con motivos, comerciales con clientes en esa campaña, «Ver correos de esta campaña», «Ver solo
  esta en Resumen» y «Leads: próximamente». El detalle de la campaña no se filtra por país.

## 2026-11-23 · Campañas, parte 1: «Por campaña» y «Por comercial» lado a lado

- Consulta nueva de SOLO LECTURA a Cumplimiento, aprobada por Keily: clientes por ejecutivo y país (solo conteos y el
  nombre del ejecutivo). Resultado: 668 clientes (303 GT, 365 SV) en 17 ejecutivos con cartera. Misma copia de 30
  minutos y mismos candados; la prueba de solo lectura la incluye.
- Sub-pestaña Campañas: dos gráficas con el mismo estilo de tarjetas y un solo selector de métrica. «Por campaña»
  (totales de Brevo, no se separan por país; título «#id · NOMBRE» y el asunto pequeño, sin emojis) y «Por comercial»
  (detalle por persona cruzado con Cumplimiento, solo coincidencia exacta; «Sin identificar» al final en gris;
  «Cartera de N clientes», país y enviados). Cada una con su conclusión y su fuente.
- Acordeón: el detalle se abre debajo de la tarjeta, unido con borde dorado; uno abierto por gráfica (el contenido
  completo llega en las partes 2 y 3).

## 2026-11-23 · Mailing: filtro de País solo donde se puede separar

- Revisión (solo conteos): #75 y #76 se mandaron a GT y SV juntos (≈ un tercio GT, dos tercios SV); la #74 es casi
  solo de El Salvador (146 SV, 2 GT); entre 11 % y 16 % de cada campaña real queda sin identificar (sin país).
- El filtro de País queda activo solo en Correos por corregir, Detalle por correo, Relación con clientes y Campañas
  (para «Por comercial»); en Resultados generales y Cargo y objetivo se ve desactivado con el globo «Los totales de
  Brevo no se separan por país» y lo elegido se conserva. Nota bajo el filtro: los correos sin identificar no tienen
  país. Los posibles por dominio siguen entrando al filtrar (en ámbar), por decisión de Keily.

## 2026-11-23 · Mailing: barra de filtros como Facturación, PDF y tarjetas compactas

- Barra de filtros con el estilo de la de Facturación (`facturacion-linea.html`, solo se leyó; es una página suelta, no
  un componente que se pueda importar; la `BarraFiltros` de Flujo de ventas está atada a sus filtros de leads):
  País cliente (Todos · GT · SV con banderas), Período (desde–hasta + ↺), «Filtros ▾» (Campaña, Cargo, Asunto, Buscar
  empresa/cliente y campañas de prueba), PDF y ↺ redondo para limpiar todo. Sin tipo de cambio. Reemplaza a Filtros.jsx.
- PDF de la vista actual con la herramienta compartida del portal (`/assets/js/dashboard-pdf.js`, sin modificarla):
  módulos Resultados generales, Resultado por campaña, Comparar campañas y Correos por corregir (con direcciones,
  decisión de Keily), con los filtros aplicados.
- Sub-pestañas con el estilo de los botones «Facturación / Informe detallado» (activa en rojo) y «Filtrado por: …»
  debajo, ahora para cualquier filtro activo.
- Tarjetas compactas como la maqueta: las 6 principales a la mitad de alto (título corto, «?» con la explicación,
  número de 27 px, barrita delgada, ↗) y la fila de calidad en tarjetas bajitas.

## 2026-11-23 · Mailing: asunto arriba y nombre real abajo; Comparar como la maqueta

- Regla de Keily para toda la pestaña: cada campaña se muestra con su ASUNTO como título y debajo «#id · NOMBRE REAL de
  Brevo · fecha» (con el cargo en la ficha). Una sola pieza (`TituloCampana` + `datos/campana.js`) en Resultado por
  campaña, Comparar, Correos por corregir (listado con una sola columna «Campaña» y ventana del ejecutivo), Detalle,
  ficha, Relación con clientes, Asignar cargo, filtro Campaña, «Filtrado por», globos, correo al ejecutivo («asunto
  (#74)») y CSV/Excel («Campaña (#)», «Asunto», «Nombre de campaña»). Sin asunto: el nombre es el título.
- Comparar campañas como la maqueta: título con la ganadora, botones de métrica, una tarjeta por campaña con medalla en
  las 3 primeras, meta 90 % en entrega, solo campañas de 20+ envíos por defecto (`MINIMO_ENVIOS`, interruptor «Incluir
  campañas pequeñas»), 10 a la vista y «Ver todas», «pocos datos» con menos de 5 entregados (nunca gana) y 3 cuadritos.
- La campaña #9 que Keily vio en una captura vieja no existe en Brevo (consulta de solo lectura: 404).

## 2026-11-23 · Rediseño de Mailing: Correos por corregir y Comparar iguales a la referencia

- Regla de Keily: misma estructura, columnas, textos y botones que la referencia visual, con nuestro tema negro.
- Correos por corregir: solo la franja «N correos requieren corrección o verificación» con «Exportar lista CSV» (los
  motivos CORREGIR / MANTENER pasan a Detalle por correo en el paso 5). Ejecutivos en tarjetas cerradas de 3 columnas
  (coincidencia exacta · posible por dominio en ámbar · sin identificar) que abren una ventana emergente con el correo
  del ejecutivo (de `correos_usuarios`, editable y recordado en el navegador), «Correo con diseño», «Correo simple» y
  «Exportar lista CSV». El correo con diseño (enlace https://cumplimientoclientes-88n2.onrender.com) se copia con
  formato o se baja como borrador .eml; nunca se envía solo. En el grupo posible dice «confirmar antes de corregir».
- Listado: una fila por correo + campaña con las columnas de la referencia y «Ver eventos», que abre la misma ficha de
  Detalle por correo (ahora con «Campaña #id · asunto · cargo», «Ejecutivo de ventas», «Motivo técnico (Brevo)», la
  indicación y la nota de apertura). Sin filtros de Motivo ni Origen: solo el buscador.
- Comparar campañas: recuadro y aviso iniciales, barras «#id · asunto» con el cargo debajo y color según la métrica,
  resultados por cargo con semáforo y meta de 90 %, y comparación detallada con las columnas de la referencia.

## 2026-11-23 · Rediseño de Mailing, paso 2 de 5 (gráficas dinámicas)

- Paso 1 aprobado por Keily (commit sin push). Aclarado el «0 campañas con detalle»: era el filtro de la campaña #73
  (sin historial); por eso ahora se ve arriba «Filtrado por: … ✕».
- Recorrido con barras gruesas de color que crecen y, entre etapas, el % que pasa a la siguiente; dona SVG con
  separación entre sectores, que aparece girando y muestra en el centro el estado bajo el mouse; leyenda en cajitas.
- Análisis por cargo con semáforo, línea punteada en la meta de 90 % y su leyenda; cifras de las tablas que abren
  Detalle por correo; Resultado por campaña con mini barra de apertura y «Descargar resumen CSV».
- Globo con el valor exacto en tarjetas, barras, sectores y cifras; números y barras se animan hacia el valor nuevo al
  cambiar un filtro (sin animación con «reducir movimiento»).
- Arreglos pedidos por Keily: el servidor ya no guarda una respuesta vacía del resumen ni del detalle (vuelve a leer
  Supabase), y los avisos de error del resumen y del detalle tienen botón «Reintentar».

## 2026-11-23 · Rediseño de Mailing, paso 1 de 5 (tema negro y tarjetas)

- Keily pidió que la pestaña Mailing se vea y funcione como la referencia visual negra (solo se lee; no entra al repo
  porque trae correos de clientes). Plan en 5 pasos, aprobado con 4 decisiones: cruce real con Cumplimiento («Sin
  identificar» solo para no encontrados; «Pendiente del cruce» solo si Cumplimiento no responde), grupo aparte
  «Posible (por dominio)» en ámbar, enlace https://cumplimientoclientes-88n2.onrender.com y se quedan el título y las
  pestañas generales.
- Paso 1: tema negro solo dentro de Mailing; sub-pestaña activa en rojo; contadores en «Correos por corregir»
  (direcciones únicas) y «Relación con clientes» (filas correo + campaña); sin recuadros de presentación; 6 tarjetas
  con ícono, color por significado, barrita y «Ver destinatarios ↗»; bloque de calidad con tasa de entrega en
  semáforo y correos por corregir en rojo (direcciones únicas + casos). Animaciones suaves que respetan «reducir
  movimiento».

## 2026-11-23 · Destino y fecha real de los clics

- SQL 003 (corrido por Keily): columna `url` en `mkt_brevo_eventos`. El webhook guarda el destino del clic limpio
  (sin «?» ni «#»; enlaces de baja como `ENLACE_DE_BAJA`); excepción aprobada por Keily: en YouTube solo el ID del
  video (`v`), sin el «=» que agrega Brevo.
- En el CSV de Brevo cada enlace es una columna con la fecha del clic: los 12 clics de 74, 75 y 76 pasaron a su
  **fecha real** (sin «aproximada») y a su destino, con huella nueva (segunda corrida: 0 cambios).
- El importador quedó en el repo (`scripts/importar-historial-brevo.mjs` + `server/mailing/historialCsv.js`, con
  pruebas): con `--cargar` sobre 74, 75 y 76 agrega 0 de 1 076, así que las cargas futuras no duplican.
- `/detalle` trae la secuencia de eventos de cada correo; Cumplimiento aporta el nombre del contacto (solo coincidencia
  exacta) y el correo del ejecutivo (10 de 13 lo tienen en `correos_usuarios`).

## 2026-11-23 · Cruce con Cumplimiento de Clientes (solo lectura)

- Regla nueva en CLAUDE.md: «Cumplimiento de Clientes: SOLO LECTURA. Nunca escribir, cambiar ni borrar nada en ese
  proyecto». Repo de la app clonado fuera de este proyecto, solo para leer su código (tablas `clientes`, `contactos`,
  `ejecutivos`).
- La llave anon no sirve (estaba incompleta y, además, el candado RLS solo deja leer a usuarios de la app). Conexión
  con la contraseña de la base (`CC_DB_PASSWORD`), pooler `aws-0-us-east-1` puerto 6543 (encontrado probando solo
  conexiones, sin consultas), en modo solo lectura (`default_transaction_read_only`, `BEGIN READ ONLY`,
  `statement_timeout`, siempre ROLLBACK) y prueba automática que falla ante cualquier escritura (comprobado con un
  archivo trampa temporal).
- Primera consulta (solo conteos): 668 clientes, 27 ejecutivos, 2 004 contactos, 1 988 con correo.
- Cruce (solo conteos): de 547 correos de campañas reales, 405 con coincidencia exacta (18 en varias empresas) y 142
  sin ella; con la mejora de Keily (posible por dominio, sin correos personales) 35 de esos 142 y 19 de los 85 por
  corregir quedan como posibles.
- Pantalla: Cliente, País y Ejecutivo en Correos por corregir y Detalle por correo (exacta / posible en ámbar / sin
  identificar); bloque por ejecutivo separado en coincidencia exacta y posible; Relación con clientes con 5 tarjetas y
  tabla; filtros País y Cliente activos para las vistas por correo.
- `pg` instalado; Vercel instala con bun: `bun.lock` actualizado solo con `pg`. Conflicto vite/esbuild con npm
  anotado en PENDIENTES. 109 pruebas, lint y build OK.

## 2026-11-23 · Detalle por correo con correos (sin inicio de sesión)

- Decisión de Keily: se muestran correos sin inicio de sesión en todos los ambientes (DECISIONES.md). Interruptor
  `MKT_MOSTRAR_CORREOS`, por defecto «si».
- Parte 1: ruta `GET /api/marketing/mailing/detalle` (una fila por correo y campaña con estado, CORREGIR / MANTENER,
  motivo técnico, indicación, apertura, clic, baja, spam y origen; nunca el texto original del motivo).
- Parte 2: «Correos por corregir» (una fila por dirección única) y «Detalle por correo» con tabla real, buscador,
  filtros, páginas y Exportar a Excel. Cliente y Ejecutivo: «Pendiente del cruce».
- Revisión real (solo conteos): 861 filas; en 74, 75 y 76 hay 101 filas CORREGIR y 91 direcciones únicas por corregir
  (algunas fallaron en más de una campaña). Campaña [PRUEBA] 80: entregados 2, soft 1 (Buzón lleno), hard 1 (Cuenta
  destinataria inexistente → CORREGIR), aperturas de 2 personas, clics de 1 persona (Brevo cuenta 2), sin proxy_open.
- 88 pruebas, lint y build OK.

## 2026-11-23 · Campaña [PRUEBA] Webhook dashboard (id 80): primera revisión

- Keily envió la campaña autorizada por Ismael a 4 destinatarios internos (1 dirección inexistente a propósito) y
  pidió abrirla y dar clic. Revisión de solo lectura a los ~8 minutos (solo conteos, correos tapados).
- Brevo: enviados 4 · entregados 2 · soft 1 · hard 1 · aperturas 2 (Apple MPP 0) · clics 2.
- Tabla (todo con `origen = 'webhook'`): 9 eventos de 4 destinatarios — entregados 2, soft 1, hard 1, aperturas
  3 eventos de 2 personas, clics 2 eventos de **1** persona. Demora entre el evento y su llegada: 2 a 9 segundos.
- Motivos reales (correo tapado): hard «550 5.1.1 [correo] does not exist» → CORREGIR · Cuenta destinataria
  inexistente; soft «452-4.2.2 … inbox is out of storage space … OverQuotaTemp … gsmtp» → MANTENER · Buzón lleno.
  Las reglas clasifican bien los dos. Confirma que el texto del motivo **puede traer el correo**: en pantalla solo
  se muestra el motivo técnico.
- `proxy_open`: no llegó ninguno.
- Diferencia por revisar mañana: Brevo cuenta 2 personas con clic; en la tabla los 2 clics son de la misma persona.

## 2026-11-23 · Webhook de marketing creado en Brevo y primera revisión

- Keily creó el webhook en Brevo: nombre «Dashboard Canales de marketing», tipo Marketing email, activo. Dirección:
  la versión de prueba de la rama en `dashboard.centralizado.interno`, **sin claves en la dirección**. Autenticación
  Básica (usuario «brevo», contraseña = `BREVO_WEBHOOK_SECRET`) y encabezado `x-vercel-protection-bypass` con el
  código de bypass. Eventos: entregadas, abierto, clicado, soft bounce, hard bounce, queja, suscripción cancelada y
  cargado por proxy (sin los de contactos). Avisó a Ismael.
- Revisión de solo lectura (~15 min después, solo conteos): llegó **1 evento real** por el webhook, una apertura de la
  campaña 79 (2da Campaña Validación - GO), guardada con `origen = 'webhook'`. Todavía no llegó ningún `proxy_open`.
  El resto de la tabla es el historial importado de 74, 75 y 76.
- Siguiente: campaña [PRUEBA] Webhook dashboard – 2026-11-23 (autorizada por Ismael) para ver entregas, rebotes con
  motivo, aperturas, clics y qué es `proxy_open`.

## 2026-11-23 · Carga inicial del historial: campañas 74, 75 y 76

- Keily corrió `sql/002_historial_importado.sql`: columnas `origen`, `cantidad` y `fecha_aproximada`.
- Los 3 CSV de Brevo (fuera del repo) traen motivo de rebote y aperturas Apple MPP por persona; fechas en hora de
  Guatemala. No traen la fecha del clic (se importa con fecha aproximada, decisión de Keily).
- Prueba en seco y carga real con un script temporal fuera del repo (ya borrado; los CSV nunca entraron al repo):
  **1 076 eventos** guardados con `origen = 'historial'`; la segunda corrida agregó **0**.
- Revisión (solo conteos): estado final igual a Brevo (74: 157 / 12 / 0 · 75: 308 / 37 / 26 · 76: 254 / 33 / 27);
  CORREGIR 6 + 49 + 46 = **101**; apertura registrada 28 / 62 / 57 y automática (Apple) 10 / 17 / 16. La ruta de
  resumen responde sin `@`. Hubo además **1 evento real del webhook** (apertura de la campaña 79).
- Código: la ruta de resumen cuenta la apertura automática (`apple_mpp` sin `opened`) y el origen de los eventos;
  lecturas de Supabase con 20 s de espera (la primera consulta, con el proyecto «dormido», pasó de 8 s).
  Textos de la pantalla: «historial importado o webhook». 78 pruebas, lint y build OK.
- Campañas 77, 78 y 79 siguen como prueba hasta que Ismael confirme si fueron a clientes reales (PENDIENTES).

## 2026-11-23 · Datos reales de Mailing · Paso 4: filtros y Resultados generales

- Consulta de solo lectura: en `origin/main` ningún código lee `BREVO_API_KEY`; solo aparece como nombre
  (`.env.example`, `Dockerfile`, `docker-compose.yml`, documentación vieja y un texto de `SecretsModal.tsx`). En Vercel
  hay una `BREVO_API_KEY` vieja (Production y Preview) que no puso Keily; la nueva está solo para la rama
  `feature/marketing-v2` (PENDIENTES).
- Pantalla (`pantalla/Mailing.jsx`): filtros que funcionan (Campaña, Cargo, Asunto, Desde/Hasta en hora de Guatemala y
  «Mostrar campañas de prueba», apagado por defecto); País y Cliente apagados hasta el cruce con clientes.
- «Resultados generales» con datos reales: franja de 6 indicadores, recorrido, incidencias (4 estados), tasa de
  entrega con semáforo, correos por corregir (solo con datos del webhook), análisis por cargo, tabla por campaña y
  aviso «disponible para campañas enviadas después de activar el webhook». Aperturas «incluye automáticas» con Apple
  MPP aparte.
- Datos: `datos/useMailingDatos.js` (pide a nuestras rutas) y `datos/calculos.js` (filtros y sumas; usa las reglas de
  `server/mailing/reglas.js`, una sola fuente). Estilo: piezas de Flujo de ventas solo importadas (franja, paneles,
  tablas, insignias, dona, barras) + clases `mkv2-` nuevas en `marketing-v2.css`, solo con variables `--fv2-*`.
- 8 pruebas nuevas de los cálculos con campañas inventadas (73 en total), lint y build OK.
- **Rediseño pedido por Keily (antes del commit; adelanta los pasos 5 y 6):**
  - Forma visual tomada de la plantilla de Mailing de Marketing (solo como referencia de tarjetas, títulos y
    gráficos; la plantilla **no** se copió al repo porque trae datos de clientes), con los colores del portal.
  - Indicadores como tarjetas separadas (número grande, nombre corto, nota), cuadrícula 6 / 3 / 2 según el ancho.
    Indicadores secundarios: Sin confirmación, Correos por corregir, Bajas y Marcados como spam (`unsubscriptions` y
    `complaints` de Brevo, agregados a `totalesDesdeBrevo`).
  - Las 6 sub-pestañas se abren y muestran contenido: Comparar campañas (barras por métrica y tabla ordenable con
    datos reales), Asignar cargo (lista real con cargo sugerido; Guardar deshabilitado), Correos por corregir y
    Detalle por correo (estructura completa con conteos del webhook, nunca correos; «—» mientras no haya datos) y
    Relación con clientes (estructura con el aviso del cruce pendiente). Ningún número inventado.
  - Código en `pantalla/mailing/` (piezas, Filtros, Generales, Comparar, Correos, Clientes, Cargos); `Mailing.jsx`
    solo arma la pantalla. Revisado fuera del portal con capturas (sin iniciar sesión).
  - 75 pruebas en total (server y cálculos de la pantalla), lint y build OK.
- **Segundo ajuste (dinámico como la plantilla):**
  - Tarjetas como las de la plantilla: título en mayúsculas, número grande, porcentaje con su base, línea que explica
    qué es y enlace «Ver destinatarios» / «Ver rebotes» / «Ver lista». Bloques con título («Entregas, rebotes y
    calidad de contactos», «Recorrido e incidencias», «Cargos y campañas»).
  - Todo clicable: cada tarjeta, etapa del recorrido, estado de incidencias y la dona abren la sub-pestaña que
    corresponde ya enfocada (franja «Detalle del indicador · …» con «Ver todos» y «Volver a resultados»). Clic en un
    cargo o una campaña de las tablas filtra todo el dashboard. «Detalle por correo» muestra el total de Brevo del
    estado elegido y el conteo del webhook; nunca correos.
  - Los filtros cambian todas las tarjetas, gráficos y tablas al momento, en todas las sub-pestañas.
  - «Entregados» en color fijo (el semáforo solo en la tasa de entrega); «—» siempre en gris; número y «%» sin
    separarse; «Sin confirmación» avisa cuando con los totales de Brevo no se puede calcular exacto.
  - Prueba de clics automática y temporal sobre la pantalla real con datos reales (archivos de prueba borrados, sin
    iniciar sesión): todos los clics llevan a donde deben, el filtro Cargo = GG cambia las tarjetas (335 enviados),
    sin `@` en pantalla y sin «—» en rojo. 77 pruebas, lint y build OK.

## 2026-11-23 · Datos reales de Mailing · Paso 3: ruta de resumen de los eventos del webhook

- Ruta `GET /api/marketing/mailing/resumen` (`server/mailing/resumen.js`, `api/marketing/mailing/resumen.js`,
  `server.ts`), con `?campanas=` opcional. Lee `mkt_brevo_eventos` página por página (`leerEventos` en
  `server/mktSupabase.js`), agrupa por destinatario dentro del servidor y devuelve **solo conteos**: estados finales,
  CORREGIR / MANTENER con motivos técnicos, apertura registrada, `proxy_open` aparte, clic, spam, bajas y eventos
  nuevos. Nunca correos. Caché de 2 min; copia anterior con aviso si Supabase falla.
- 9 pruebas nuevas con eventos inventados (65 en total en `server/`), lint y build OK.
- Revisión real (portal local): con la tabla vacía responde 200 «Sin datos del webhook todavía.»; POST 405;
  parámetro inválido 400.
- Keily pone `BREVO_API_KEY` en Vercel solo en Preview. Las 4 campañas reales «Sin clasificar» se asignarán a mano.

## 2026-11-23 · Datos reales de Mailing · Paso 2: ruta de campañas con totales de Brevo

- Ajustes al paso 1 (decisión de Keily): «GERENTE FINACIERO» → GF y «GERENTE OPERACIONES» → GO. Apertura con totales:
  `uniqueViews` = «Aperturas (incluye automáticas)», con «Apple MPP» aparte y sin restar (Keily comparó la campaña 74
  en Brevo: Entregados 157, Aperturas 45, Apple MPP 11, Total de aperturas 62, Clics 3).
- Revisión de solo lectura: la **lista** de campañas trae `globalStats` en una sola llamada. La API **no trae** los
  motivos de rebote agrupados por campaña que muestra la pantalla de Brevo: para campañas viejas solo la carga inicial
  del historial podrá traerlos.
- Ruta `GET /api/marketing/mailing/campanas` (`server/mailing/campanas.js`, `api/marketing/mailing/campanas.js`,
  `server.ts`): enviadas y programadas, cargo manual desde `mkt_campana_cargo`, caché de 10 min, copia anterior si
  Brevo falla, sin datos personales. `vercel.json`: 60 s de tiempo máximo.
- 11 pruebas nuevas con datos inventados (56 en total en `server/`), lint y build OK.
- Revisión real (portal local, solo conteos): 54 campañas enviadas y 0 programadas; 23 de prueba y 31 reales
  (9 GG, 9 GF, 9 GO, 4 «Sin clasificar»); semáforo 15 verde, 13 amarillo, 26 rojo; campaña 74 igual a la pantalla de
  Brevo; respuesta sin `@`. Primera carga 9,5 s; con caché 0,1 s.

## 2026-11-23 · Datos reales de Mailing · Paso 1: reglas oficiales en código

- Plan aprobado por Keily: conectar Mailing en 6 pasos (reglas, ruta de campañas, ruta de resumen, Resultados
  generales, Comparar y Asignar cargo, Correos por corregir y Detalle), un commit por paso.
- `server/mailing/reglas.js` (sin conexiones): cargo y sector desde el nombre, cargo final (a mano gana), campañas de
  prueba, estado final, CORREGIR / MANTENER con la tabla de motivos, apertura y clic, porcentajes, totales desde
  `globalStats`, tasas y semáforo de entrega.
- Decisiones de Keily: el cargo también se deduce de «GERENTE DE FINANZAS», «GERENTE FINANZAS», «G.G», «G.F», «G.O» y
  «- GG -» / «- GF -» / «- GO -»; lo demás queda «Sin clasificar». Apertura con totales = `uniqueViews` «por
  confirmar». Campañas de prueba: TEST, VALIDACIÓN o PRUEBA, ocultas por defecto. Las rutas de totales pueden quedar
  abiertas por ahora (confirmar con Eduardo antes de publicar).
- El semáforo usa los números exactos (no el porcentaje redondeado).
- 20 pruebas nuevas con datos inventados (45 en total en `server/`), lint y build OK.

## 2026-11-23 · Webhook funcionando en la versión de prueba (dashboard.centralizado.interno)

- Causa del 429 anterior: `MKT_SUPABASE_URL` y `MKT_SUPABASE_SECRET_KEY` estaban en Production y no en Preview. Keily
  las pasó a solo Preview e hizo Redeploy.
- Prueba repetida (campaña inventada 999999003, correos de example.com):
  - Sin bypass de Vercel: 302. Con bypass y sin nuestra clave: **401** ✔.
  - Con la clave correcta y 2 eventos (`delivered` y `hard_bounce` con motivo): **200, 2 guardados** ✔.
  - El mismo envío otra vez: 200, 0 guardados y 2 ignorados (la huella evita duplicados) ✔.
  - En la tabla: 2 filas, 1 con motivo. Borradas (204); la tabla quedó en 0.
- Script temporal borrado; no se mostraron correos ni llaves.
- Siguiente: crear el webhook en Brevo (Keily, avisando a Ismael) apuntando a la versión de prueba y mandar una
  campaña de prueba.

## 2026-11-23 · Prueba del webhook en la versión de prueba de Vercel (resultado parcial)

- La prueba se hace en el proyecto de Vercel **`dashboard.centralizado.interno`**: ahí están las 3 variables de Preview
  y el código de bypass «prueba-webhook-brevo» (guardado por Keily en `.env.local` como `VERCEL_BYPASS_SECRET`; nunca
  se mostró). El otro proyecto, `dashboard.centralizado`, también arma versiones de este repo: hay que preguntarle a
  Eduardo para qué es.
- Resultado (campaña inventada 999999002, correos de example.com):
  - Sin bypass de Vercel: 302 (inicio de sesión de Vercel). Con bypass: GET 405.
  - POST sin nuestra clave y con clave incorrecta: **401** ✔.
  - POST con la clave correcta y 2 eventos: **429** «No se pudo guardar». La clave de Preview coincide, pero el
    guardado en Supabase falló. En la tabla quedaron 0 filas (se corrió el borrado igual: 204, tabla en 0).
  - Los valores de `.env.local` están bien escritos (sin comillas ni espacios): la causa más probable está en cómo
    quedaron `MKT_SUPABASE_URL` o `MKT_SUPABASE_SECRET_KEY` en Preview. Se revisa con el registro de Vercel.
- Script temporal borrado; no se mostraron correos ni llaves.

## 2026-11-20 · Rama en GitHub y versión de prueba en Vercel

- Revisiones antes del push: `.env.example` sin valores; `.env.local`, `.claude/`, `.vscode/` y `.kiro/` ignorados;
  ningún CSV, Excel ni JSON de llaves agregado; sin llaves en el código nuevo. Los commits viejos de la rama traen el
  `.env.example` con los mismos valores que ya están en `origin/main` (nada nuevo expuesto).
- Push solo de `feature/marketing-v2` (sigue a `origin/feature/marketing-v2`); `main` sin cambios y sin PR.
- Keily puso en Vercel, solo en Preview y como Secret, `BREVO_WEBHOOK_SECRET`, `MKT_SUPABASE_URL` y
  `MKT_SUPABASE_SECRET_KEY`.
- Vercel armó la versión de prueba en 2 proyectos (`dashboard.centralizado` y `dashboard.centralizado.interno`). Las 2
  tienen protección: sin iniciar sesión responden 302 hacia el inicio de sesión de Vercel, así que Brevo no podría
  llamar al webhook. Decisión: opción A («Protection Bypass for Automation»), solo para la prueba y borrarlo al final.
- La tarea diaria (Vercel cron) se programa después de probar el webhook: Vercel solo corre crons en producción.

## 2026-11-20 · Tablas creadas y prueba local del webhook

- Keily corrió `sql/001_tablas_webhook.sql` en el proyecto «Dashboard Canales de marketing»: las 2 tablas con RLS
  activado (`relrowsecurity = true`).
- Revisión de solo lectura: `mkt_brevo_eventos` y `mkt_campana_cargo` responden 200 (0 filas) con la llave secreta y
  **401 sin llave**.
- Prueba local (servidor en otro puerto, campaña inventada 999999001, correos de example.com):
  - 2 eventos inventados (`delivered` y `soft_bounce` con motivo) → 200, 2 guardados.
  - El mismo envío otra vez → 200, 0 guardados y 2 ignorados (la huella evita duplicados).
  - En la tabla: 2 filas, 1 con motivo. Se borraron (204) y la tabla quedó con 0 filas.
- Script temporal borrado; no se mostraron correos ni llaves.

## 2026-11-20 · .env.example sin valores reales

- Se encontraron 37 valores reales en `.env.example` (también en `origin/main` y en el historial del repo): SAP,
  Workflow, contraseñas maestras, webhooks de Make y llaves públicas de Supabase/Firebase. Ningún valor se anotó.
- En esta rama se dejaron vacíos (solo los nombres). No se trajeron commits de main.
- PENDIENTES: TI debe cambiarlos (Eduardo / TI). CLAUDE.md: revisar `.env.example` antes de cualquier push.

## 2026-11-20 · Ruta del webhook de Brevo (código y pruebas, sin Supabase)

- Ruta `POST /api/marketing/brevo-webhook` (local en `server.ts`, Vercel en `api/marketing/brevo-webhook.js`), con la
  lógica en `server/brevoWebhook.js` y el guardado en `server/mktSupabase.js` (API REST de Supabase, sin paquetes
  nuevos).
- Clave en `BREVO_WEBHOOK_SECRET` (solo servidor; agregada al azar en `.env.local`, nunca mostrada). Se acepta en el
  encabezado `x-webhook-token` o como usuario:clave en la dirección (Basic auth), según lo que permita la pantalla de
  Brevo.
- Respuestas: 405 si no es POST, 401 sin clave correcta (no guarda nada), 400 contenido inválido, 413 demasiado grande,
  429 si falta configuración o Supabase falla (para que Brevo reintente), 200 con conteos. Nunca devuelve correos.
- Huella SHA-256 (evento|campaña|correo|fecha) para ignorar duplicados; eventos de contactos (sin campaña) se ignoran;
  nombres de evento nuevos se guardan igual. No se guarda la URL del clic, la IP, segmentos ni listas.
- 18 pruebas nuevas con datos inventados (25 en total en `server/`), lint y build OK. Prueba local en otro puerto solo
  con peticiones rechazadas (405 y 401): no se llamó a Supabase.
- `.env.example`: nombres vacíos `BREVO_WEBHOOK_SECRET`, `MKT_SUPABASE_URL` y `MKT_SUPABASE_SECRET_KEY`.

## 2026-11-20 · Proyecto Supabase y diseño de las tablas del webhook

- Keily creó el proyecto Supabase «Dashboard Canales de marketing», solo para este dashboard (plan Free: se pausa tras
  una semana sin actividad y no tiene respaldos). Variables de servidor: `MKT_SUPABASE_URL` y `MKT_SUPABASE_SECRET_KEY`.
- Archivo `docs/marketing/v2/sql/001_tablas_webhook.sql` con las tablas `mkt_brevo_eventos` y `mkt_campana_cargo`,
  RLS activado sin reglas y sin permisos públicos. La columna `evento` no se limita (decisión de Keily: un evento con
  otro nombre se guarda igual y se filtra después). Lo corre Keily en el SQL Editor.
- Decisiones: tarea diaria (Vercel cron con `CRON_SECRET`) para que el proyecto no se pause; respaldo por definir;
  eventos 12 meses con limpieza mensual más adelante; datos de prueba en las mismas tablas y borrados al terminar;
  sin URL del clic; rutas con correos solo con totales hasta que haya inicio de sesión real.
- Keily aprobó el plan del webhook (MAILING.md, 10.1 y 10.2).

## 2026-11-20 · Detalle por correo: se usarán los webhooks de Brevo

- Prueba de exportación de destinatarios (`POST /v3/emailCampaigns/74/exportRecipients`, solo rebotes temporales):
  **403 permission_denied** — la llave de solo lectura no permite exportar. No se creó ningún proceso ni se descargó
  nada. Script temporal borrado.
- Decisión de Keily: el detalle por correo (motivo del rebote, CORREGIR / MANTENER) vendrá de los **webhooks de
  marketing** de Brevo, **solo para campañas nuevas**. Las campañas anteriores se mostrarán solo con totales. La llave
  con permiso de escritura queda descartada.
- El webhook lo creará Keily en Brevo, avisando a Ismael.
- PENDIENTES: exportación manual de la campaña 74 (solo nombres de columnas), dónde se guardan los eventos y crear el
  webhook.

## 2026-11-20 · Llave de Brevo y primera prueba de la API

- Se creó la llave dashboard-marketing-lectura (solo lectura: campañas de email y contactos, caduca 2027-11-20). Se
  desactivó en Brevo el bloqueo de IP para claves API porque Vercel cambia de IP; las 6 IP ya autorizadas se dejaron
  igual.
- La llave va en `.env.local` como `BREVO_API_KEY` (solo servidor). Prueba hecha con un script temporal fuera del repo,
  ya borrado; no se guardaron correos ni datos de clientes.
- Resultado:
  - 59 campañas de email: 54 enviadas (`sent`) y 5 borradores (`draft`). Programadas (`queued`): 0 hoy.
  - Las estadísticas por campaña funcionan (`globalStats`, `campaignStats`, enlaces, dominio, dispositivo, navegador).
  - El detalle por contacto trae envío, entrega, rebotes, aperturas y clics con fecha, pero **no el motivo del rebote
    ni la marca de apertura automática de Apple**.
  - 403 esperado en `/v3/smtp/statistics/events` (correos transaccionales, fuera del permiso de la llave).
- Decisión: por ahora se usan los números de `globalStats`; Keily compara la campaña 74 en la pantalla de Brevo.
- Detalle en MAILING.md, sección 10.1.

## 2026-11-20 · Parte 2: sexta sub-pestaña de Mailing «Asignar cargo a campañas»

- Pedida por Eduardo, para Marketing (Ismael): cada campaña de Brevo (nombre, asunto, fecha) con un menú GG / GF / GO
  y un botón Guardar. Solo estructura vacía: aviso «Pendiente de conexión con Brevo», nota «Pendiente: definir dónde
  se guarda la selección» y nota de que solo personas autorizadas podrán guardar. Sin base de datos ni Supabase.
- Regla confirmada por Keily: lo elegido a mano gana sobre lo sugerido por el nombre; sin ninguno, «Sin clasificar».
- PENDIENTES: dónde se guarda el cargo elegido, quién puede editarlo y preguntar a Eduardo por «Sin confirmación».

## 2026-11-20 · Parte 2: estructura del dashboard Canales de marketing (3 pestañas, sin datos)

- Menú: **Marketing → Flujo de ventas · Canales de marketing** (id `marketing-v2`).
- Subtítulo: «Campañas de correo, redes sociales y otros canales · Guatemala y El Salvador».
- **Mailing:** barra de filtros globales deshabilitada (Campaña, Cargo, Asunto, País, Cliente, Desde/Hasta), las 5
  sub-pestañas con sus paneles y tablas vacías («—»), el aviso «Pendiente de conexión con Brevo», el aviso 🔒 de inicio
  de sesión en Correos por corregir, Detalle por correo y Relación con clientes, y el panel «Leads · Próximamente» solo
  en Resultados generales.
- **Redes sociales:** aviso «Pendiente de conexión con Meta». **Otros:** aviso «Próximamente (PBX, web, etc.)».
- Reutiliza los estilos de Flujo de ventas sin modificarlos. Sin datos reales ni inventados, sin llamadas a APIs, sin
  rutas de servidor ni `api/` (eso es la Parte 3).
- Archivos nuevos en `src/modulos/marketing/marketing-v2/`; editado `PortalLayout.tsx`.

## 2026-11-20 · Protección en .gitignore

- Se protegieron en `.gitignore` los Excel, los JSON de llaves y las carpetas locales de editores:
  `*.xlsx` / `*.xls` (y en mayúsculas), `*service-account*.json`, `*credentials*.json`, `*-key*.json`,
  `client_secret*.json`, `.claude/`, `.vscode/` y `.kiro/`. No se usa `*.json` (rompería `package.json` y otros).
- Se comprobó que ningún archivo necesario del proyecto coincide con esos patrones (274 archivos de todas las ramas).

## 2026-11-20 · Reglas permanentes del repositorio

- Se creó `CLAUDE.md` en la raíz con las reglas permanentes: español y explicaciones sencillas, plan y «sí» antes de
  cambiar, Git (sin `main`, sin push/merge/PR sin pedirlo, sin `-D`/`reset --hard`/borrar stash), Supabase solo con
  permiso, llaves y datos privados, qué no tocar y cómo documentar Marketing v2.

## 2026-11-20 · MAILING.md contra los criterios oficiales

- Se comparó MAILING.md con los criterios oficiales (`criterios_mailing.txt`) y con la plantilla HTML anterior
  (`dashboard_mailing_plantilla.html`). Ninguno de los dos se sube al repo (la plantilla trae datos de clientes).
- **Se decidió seguir los criterios en lugar de la plantilla** (Keily): «no such user» pasa a CORREGIR; bloqueos,
  antispam, tiempo de espera, relay, autenticación SMTP, buzón lleno y «message delivery failed» quedan MANTENER
  aunque el rebote sea permanente; se usa el motivo del rebote final (por confirmar con datos reales de Brevo).
- MAILING.md se completó: estado final (empate = «Sin confirmación»), tabla completa de motivos, aperturas, clics
  («CLIC AUTOMÁTICO» no aplica en esta versión), indicadores, semáforo, filtros, las 5 pestañas, cruce con clientes y
  aviso a ejecutivos. Las 3 diferencias con la plantilla quedaron explicadas para Marketing (sección 9).

## 2026-11-20 · Limpieza y rama nueva

### Ramas
- Se borraron **en local** las ramas `feature/marketing-mailing` y `redes-sociales` (`git branch -D`, autorizado por
  Keily). En GitHub ya no existían. Su contenido ya estaba en `main`: los PR #6 y #7 se unieron con *squash*, por eso
  git no las reconocía como unidas y `-d` no las borraba. Se comprobó archivo por archivo antes de borrarlas.
- `retirar-flujo-ventas-viejo`: se le quitó la conexión a `origin/main` (`git branch --unset-upstream`) para que un
  push desde ella no pueda ir a `main`. **No se borró.** Su contenido ya está en `main` (PR #2).
- Se creó `feature/marketing-v2` desde `main` (`a9aebe0`), **sin** seguir a `origin/main`.

### Commit `9d08356` · limpieza
Se quitó todo lo de los 3 dashboards que reemplaza este (ver [README](README.md#qué-reemplazó)).

**74 archivos borrados:**
- Marketing por canales: `src/modulos/marketing/canales/`, `server/marketingCanales/`, `server/marketingMailing.js`,
  `server/marketingMailingDetalle.js` (+ prueba), `api/marketing/mailing.js`, `api/marketing/mailing-detalle.js` y
  `docs/marketing-canales/`.
- Redes sociales: `src/modulos/marketing/redes/`, `server/marketingRedes.js`, `server/marketingRedes/` (con el Excel y
  sus pruebas), `api/marketing/redes.js` y `docs/marketing-redes/`.
- Campañas de correo: `public/dashboards/marketing/mailing-campanas.html` y `public/assets/css/mailingCampanas.css`.

**5 archivos editados:**
- `src/components/layout/PortalLayout.tsx`: el menú de Marketing queda solo con **Flujo de ventas**. El portal
  ahora abre en **Ingresos acumulados** (antes abría en «Campañas de correo», que ya no existe).
- `server.ts`: sin las rutas `/api/marketing/mailing`, `/api/marketing/mailing-detalle` y `/api/marketing/redes`.
- `vercel.json`: sin el `includeFiles` de redes.
- `.env.example`: sin `MARKETING_LOCAL_CSV_DIR`, `GOOGLE_SERVICE_ACCOUNT_JSON` y `MARKETING_DRIVE_FOLDER_ID`.
- `public/assets/js/dashboards.js`: sin la entrada `mailing-semanal`.

**No se tocó lo compartido:** `estandar.css`, `dashboard.css`, `flujoVentas.css`, `estandar.js`, `reporte-pdf.js`,
los paquetes `xlsx` / `lucide-react` / `react` y `docs/marketing/` (Flujo de ventas).

**Comprobado:** pruebas, lint y build OK. En local cargan Servicio al Cliente, Flash de altas, Bodega y la API de
Flujo de ventas (Prospekt).

### Variables de Vercel que se quitarán al publicar (solo nombres)
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `MARKETING_DRIVE_FOLDER_ID`
- `MARKETING_LOCAL_CSV_DIR`
- `MARKETING_DETALLE_CLAVE` (si todavía existe; el código ya no la usaba)

Se **quedan**: `BREVO_API_KEY` (la usará Mailing) y `RED_API_KEY` (Flujo de ventas).

### Documentación
- Se creó esta carpeta `docs/marketing/v2/` con README, BITACORA, MAILING, REDES y PENDIENTES.
