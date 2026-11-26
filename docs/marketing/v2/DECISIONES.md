# Decisiones · Marketing v2

Decisiones tomadas para el dashboard Canales de marketing, con fecha y quién decidió. Lo más reciente va arriba.
El detalle técnico de cada una está en [MAILING.md](MAILING.md) y su seguimiento en [PENDIENTES.md](PENDIENTES.md).

## 2026-11-25 · Se quita la pestaña «Otros»

- **Decisión de Keily:** Canales de marketing queda solo con **Mailing** y **Redes sociales**. La pestaña «Otros»
  (que solo decía «Próximamente») se quita por ahora.
- **Motivo:** en 2026 solo hubo **17 leads** calificados de orígenes que no son correo ni redes (PBX SV, Voicebot PBX
  SV, Página Web, contactanos y Lead Manual), y no hay datos de actividad de esos canales.
- **Cuándo retomarla:** si aparece una fuente con actividad (Analytics de la web, registros del PBX o referidos)
  (PENDIENTES). OTROS.md queda como referencia de las APIs de Prospekt.

## 2026-11-25 · Redes: cuenta publicitaria de Guatemala en US$ y costo por lead por país

- **Decisión de Keily:** se integra la cuenta publicitaria de Guatemala (`act_2226740844336751`, en quetzales) junto a
  la de El Salvador. Todo se muestra en **US$**: lo de GT se convierte con `TIPO_CAMBIO_GTQ_USD` (variable de
  servidor); por defecto **7.64 Q por US$** (referencia Banguat, 4/11/2026), **por confirmar con Isma o Contabilidad**
  (PENDIENTES). En el detalle se ve también el monto original en Q.
- **Costo por lead por país:** inversión de cada país ÷ sus leads (reemplaza «costo por lead solo con El Salvador» del
  24/11/2026: Guatemala ya tiene pauta conectada).
- Las campañas de reclutamiento de GT van aparte con la misma regla.

## 2026-11-23 · Guardar cargo y objetivo con clave de Marketing

- **Guardar cargo y objetivo protegido con clave de Marketing (sin inicio de sesión), por decisión de Keily,
  23/11/2026.**
- **Cómo:** la clave vive solo en el servidor (`MKT_CLAVE_EDICION`, sin `VITE_`; en `.env.example` solo el nombre).
  El servidor la valida (nunca el navegador), en tiempo constante, y devuelve un permiso firmado de 8 horas que no
  contiene la clave; la pestaña lo recuerda solo mientras esté abierta. Se pide también «Tu nombre», que queda como
  «por <nombre>».
- **Candados:** 5 claves incorrectas en 15 minutos desde la misma dirección bloquean 15 minutos (en Vercel el conteo es
  por instancia, no global; cada fallo además espera 1 segundo). Solo se escribe en `mkt_campana_cargo` del proyecto
  «Dashboard Canales de marketing»; nunca en Cumplimiento de Clientes ni en Brevo. Solo campañas que existen en Brevo.
- **Riesgo aceptado:** quien tenga la clave puede editar sin identificarse de verdad (el nombre lo escribe la persona).
  Para cambiar la clave basta con cambiar la variable (los permisos viejos dejan de valer).

## 2026-11-23 · Objetivo de cada campaña

- **Lista de objetivos creada por Keily (23/11/2026); Marketing puede confirmarlos o cambiarlos.** En este orden; gana
  la primera que coincide (sin mayúsculas ni tildes, por palabra completa y aceptando su plural):
  1. Promover el dashboard de rondas — dashboard, acceso, rondas, plataforma
  2. Control de turnos y personal — turno, supervisor, ronda, anoche, evidencia, guardia
  3. Reducir costos operativos — costo, costos, nómina, gasto, horas, pagando
  4. Mejorar la productividad — productividad, tiempo muerto, producción, a ciegas, operación
  5. Comunicación con radios PTT — PTT, comunicación, radio, radios, flota
  6. Logística y transporte — logística, transporte, ruta, rutas, entrega
  7. Planificación y crecimiento — ampliar, zonas, recursos, crecer, expansión
  8. Validar la base de contactos — validación, verificación, test entregabilidad
- **Cómo se sugiere (nunca vacío):** a) asunto; b) nombre de la campaña; c) contenido del correo (API de Brevo, solo
  lectura; el servidor solo manda el objetivo encontrado, nunca el contenido); d) si nada coincide, «Promoción general
  de RED» con estado «Revisar». Se muestra de dónde salió. Lo elegido a mano gana y queda «Confirmado».
- **Palabra completa:** se compara por palabra completa (con su plural) para que «entrega» no encuentre
  «entregabilidad» ni «entregamos».
- **«Con costo» / «sin costo» en el nombre se ignoran** (decisión de Keily, 23/11/2026): hablan del precio de la
  oferta, no de reducir costos. Esas campañas pasan al contenido del correo (y, si tampoco coincide, a «Revisar»). En
  el asunto, «costo» sigue contando.
- **Las palabras del cargo en el nombre también se ignoran** (decisión de Keily, 23/11/2026): son el destinatario, no
  el tema: gerente, general, financiero, finaciero, finanzas, operaciones, operativo, G.G, G.F, G.O, GG, GF, GO y
  «base completa». En el asunto siguen contando normal.
- El objetivo elegido a mano se guarda como texto libre (Marketing puede escribir otros). Seguimiento: revisar la
  lista con Ismael (PENDIENTES). Lógica en `src/modulos/marketing/marketing-v2/datos/objetivo.js`.

## 2026-11-23 · Cumplimiento de Clientes: solo lectura y posible cliente por dominio

- **Decisión de Keily (administradora de la app Cumplimiento de Clientes):** usar su base **solo para leer**, para
  llenar Cliente, País y Ejecutivo de cada correo. Nunca escribir, cambiar ni borrar nada en ese proyecto (regla en
  CLAUDE.md). Como Keily no tiene cuenta en ese Supabase, se usa la contraseña de la base (`CC_DB_PASSWORD`) en modo
  solo lectura; no se creó ningún usuario ni se cambió nada en la base.
- **Posible cliente por dominio:** para los correos sin coincidencia exacta, si el dominio coincide con un contacto de
  Cumplimiento se muestra como «Posible cliente (por dominio)», en otro color, nunca igual que una exacta; nunca con
  dominios de correo personal.
- Detalle en [MAILING.md](MAILING.md), sección 8.

## 2026-11-23 · Se muestran correos sin inicio de sesión

- **Decisión:** se muestran correos sin inicio de sesión en todos los ambientes, por decisión de Keily (23/11/2026).
- **Dónde:** «Correos por corregir» y «Detalle por correo» (ruta `GET /api/marketing/mailing/detalle`).
- **Por qué hace falta decirlo:** el inicio de sesión del portal hoy no se verifica en el servidor (acepta cualquier
  usuario), así que quien conozca la dirección de la ruta puede ver esos correos.
- **Interruptor:** variable de servidor `MKT_MOSTRAR_CORREOS`. Si no existe o vale «si», se muestran; con «no», la
  ruta devuelve solo el número de filas, sin correos. Para ocultarlos basta con poner «no» en Vercel.
- **Cuidados que se mantienen:** nunca se muestra el texto original del motivo del rebote (puede traer correos), la
  respuesta no se guarda en la caché de Vercel (`no-store`) y pide no indexarse.
- **Seguimiento:** informar a Eduardo (PENDIENTES). El inicio de sesión para Marketing (opción B) queda para después.

## 2026-11-24 · Campañas de prueba: solo con corchetes o explícitamente de prueba

- **Decisión de Keily:** la 77, 78 y 79 («2da Campaña Validación – GG/GF/GO – Nov19») **no son pruebas**: se enviaron a la
  base real. Se muestran siempre, con sus correos por corregir.
- **Regla nueva** (`esCampanaPrueba` en server/mailing/reglas.js), sin importar mayúsculas ni tildes y también en plural.
  Se oculta por defecto una campaña solo si su nombre tiene:
  - **[VALIDACIÓN], [TEST] o [PRUEBA] entre corchetes**, o
  - la palabra **TEST** o **PRUEBA** sola (explícitamente de prueba, por ejemplo «MARKETING TEST 1»).
  - «Validación» **sin** corchetes ya no oculta la campaña.
- **Ocultas con la regla nueva (24/11/2026): 21 de 55:** 80 («[PRUEBA] Webhook dashboard»), 72 («MARKETING TEST 1») y
  66, 64 a 48 y 45 («[VALIDACIÓN] … Test Entregabilidad»). Se ven con el interruptor «Campañas de prueba».
- La 70 («DASHBOARD CAMPAIGN OCT 23», 36 destinatarios) **no** queda oculta por la regla, pero su historial no se cargó
  hasta confirmar con Ismael si fue real (PENDIENTES).

## 2026-11-24 · Leads de Prospekt: cómo se atribuyen a las campañas

- **Decisión de Keily** (MAILING.md, sección 11.1):
  - **Exacta:** el correo del lead recibió la campaña, enviada antes del lead y **como máximo 30 días antes**. Si hay
    varias: clic > apertura > la más reciente. **Solo por correo**: no hay fuente de teléfonos de los destinatarios.
  - **Estimada:** origen «PostIAlo Mailing» sin exacta → la última campaña enviada antes, **dentro de 7 días**.
  - Varias campañas el mismo día: el lead va al **grupo**, en **una fila aparte** en Comparar campañas, **sin
    repartirlo** (opción a).
  - Las campañas de prueba no reciben leads. Cerrado = etapa 6 (por confirmar si es venta ganada).
- La tarjeta se muestra **aunque hoy dé 0 exactos y 0 estimados** (291 sin campaña): se llena con los leads nuevos.
- Nunca se muestran el correo ni el teléfono del lead.

## 2026-11-24 · Prospekt guarda la fecha y hora de creación en UTC

- **Confirmado por Keily:** `fecha_creado` y `hora_creado` están en **UTC** (así lo dice la API: «lead creado en
  UTC»; `fecha_agendada` y `hora_agendada` sí vienen en hora local del país).
- **Prueba:** los códigos de prospecto son consecutivos y solo cuadran en UTC (un calificado a las 02:08 UTC va antes
  que el código siguiente, no calificado, a las 04:22 UTC).
- Se compara en UTC con la hora de envío de Brevo y se muestra en hora de Guatemala. Se deja como está.

## 2026-11-24 · En Mailing solo se cuentan los leads de Mailing

- **Decisión de Keily:** la tarjeta Leads, la sub-pestaña Leads y Comparar muestran por defecto **solo** los leads con
  campaña asignada (exacta o estimada) o con origen «PostIAlo Mailing» (hoy 6 de 291). Redes, Web, PBX y Manual no se
  cuentan en Mailing.
- Interruptor **«Ver leads de todos los orígenes»**, apagado por defecto, para revisión.
- Nota de la tarjeta: «Leads de correo: X. Solo 29 de 291 leads de Prospekt traen correo» (con los números del día).

## 2026-11-24 · Redes: cuentas publicitarias y reclutamiento aparte

- **Cuentas (Keily):** solo `act_2035747430056013` (USD, «Negocio de Red Intelfon»). El gasto se reparte **por la
  página del anuncio** (Red Intelfon El Salvador → RED SV; DATA RED → DATA RED). RED GT se muestra «sin pauta en las
  cuentas que ve el token». El gasto sin página identificada va aparte. La cuenta GTQ (personal, sin anuncios de RED)
  queda fuera.
- **Reclutamiento (Keily):** las campañas cuyo nombre tenga `vacante`, `plaza`, `empleo`, `RH`, `reclutamiento`,
  `trabajo`, `contratación`, `contratando`, «ejecutivo de ventas» o «únete» (palabras y frases completas, sin
  mayúsculas ni tildes, también en plural; lista fácil de editar) se marcan **«Reclutamiento»**. **No
  cuentan** en inversión, mensajes ni costo por mensaje de marketing; se muestran aparte con su gasto.

## 2026-11-24 · Redes: datos completos de los leads en pantalla

- **Decisión de Keily:** en Redes sociales, la lista de leads y la ficha del cliente muestran los datos **completos**
  (nombre, teléfono, correo, asesor, etapa y gestiones), **sin clave ni inicio de sesión**. Empresa: Prospekt no la
  envía.
- **Antes de activarlo en producción hay que confirmarlo con Eduardo** (PENDIENTES): las rutas del dashboard están
  abiertas y el inicio de sesión del portal no verifica usuarios en el servidor.
- La ruta `/api/marketing/redes/leads` responde con `Cache-Control: no-store` y nunca escribe datos de clientes en
  los registros (logs) ni en los mensajes de error.

## 2026-11-24 · Redes: rediseño igual al mockup completo

- Versión profesional y compacta (letra 13 px, sin emojis ni íconos de colores en las tarjetas, números con ancho fijo).
- Todo lo que se puede tocar abre una **ventana de detalle** al centro (X, Esc o clic afuera).
- Leads de Redes: **exacto** = calificados con origen «PostIAlo Redes Sociales» por país y mes (UTC−6), sin LDTEST;
  **estimado por publicación** = cada lead una sola vez, a la publicación más reciente de su país en los 7 días
  anteriores (las del mismo día comparten fila). En El Salvador la marca sale de esa publicación; si no se puede
  saber, «sin marca». No calificados: solo el total.
- La meta de costo por mensaje sigue en un solo lugar (`META_COSTO_MENSAJE`, US$ 1.50) y dice «meta por confirmar».

## 2026-11-24 · Redes: costo por lead solo con El Salvador (reemplazada el 25/11/2026: ahora es por país)

- **Decisión de Keily:** la pauta es solo de la cuenta USD (El Salvador), así que el **costo por lead = inversión ÷
  leads de SV** (no de todos). Con el filtro en Guatemala (o RED GT) se muestra **«sin pauta»**. Aplica en Anuncios, en
  el bloque «Leads de Redes» y en la ventana de detalle.
- **Cerrados:** Prospekt no distingue ganados de perdidos; la pantalla dice «Cerrados (ganados o perdidos)» (PENDIENTES).
