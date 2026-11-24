# Pestaña Mailing (borrador)

> Borrador. Lo marcado «por confirmar» todavía no está decidido. Estado de los accesos: [PENDIENTES.md](PENDIENTES.md).
>
> **Fuente de los criterios:** documento «Criterios de clasificación y análisis de campañas de Brevo» de RED Intelfon
> (`criterios_mailing.txt`, revisado el 20/11/2026). No se sube al repo. Donde el dashboard nuevo se aparta de la
> plantilla HTML anterior, se explica en la sección 9.

## 1. Qué pidió el ingeniero

- Campañas **hechas** y **programadas**.
- Vista **general** y **por territorio de cada comercial**.
- Indicadores: **entrega**, **apertura**, **lectura** y **leads**.

## 2. Regla de nombres de campaña

```
código correlativo - cargo - sector - asunto
```

| Parte | Qué es | Valores |
|---|---|---|
| Código correlativo | Número de la campaña, con ceros a la izquierda | `001`, `002`, … |
| Cargo | A quién va dirigida | `GG` = Gerente General · `GF` = Gerente Financiero · `GO` = Gerente de Operaciones |
| Sector | Sector de las empresas | Texto en mayúsculas, p. ej. `SEGURIDAD` |
| Asunto | Asunto del correo | Texto libre |

Ejemplo: **`001-GG-SEGURIDAD-Asunto`**. El dashboard saca el **cargo** y el **sector** del nombre de la campaña.

**Campañas viejas que no cumplen la regla** (por ejemplo «GERENTE GENERAL NOVIEMBRE 5»). El cargo se **deduce del
nombre** solo con estas formas (sin importar mayúsculas ni tildes; ampliado por Keily el 23/11/2026):

| Forma en el nombre | Cargo |
|---|---|
| «GERENTE GENERAL», «G.G», «- GG -» | GG |
| «GERENTE FINANCIERO», «GERENTE FINACIERO» (mal escrito en Brevo), «GERENTE DE FINANZAS», «GERENTE FINANZAS», «G.F», «- GF -» | GF |
| «GERENTE OPERATIVO», «GERENTE DE OPERACIONES», «GERENTE OPERACIONES», «G.O», «- GO -» | GO |

- Si no encaja en ninguna forma, o si el nombre trae **dos cargos distintos**, el cargo queda **«Sin clasificar»**.
  El sector solo sale de la regla oficial; en las campañas viejas queda «Sin clasificar».
- No se adivina nada más del nombre: lo que no encaja se asigna a mano.
- Resultado con las 54 campañas enviadas (23/11/2026): 31 reales (9 GG, 9 GF, 9 GO y 4 «Sin clasificar») y 23 de
  prueba. Ninguna sigue todavía la regla oficial.
- Código: `server/mailing/reglas.js` (`cargoDesdeNombre`, `cargoFinal`).

La regla se le entrega a Marketing para las campañas nuevas (PENDIENTES). Si el nombre no sigue la regla, Marketing
puede asignar el cargo en la sub-pestaña **Cargo y objetivo** (sección 7.1).

## 3. Qué pasó con cada envío: estado final

Cada destinatario queda en **uno solo** de estos 4 estados. Son excluyentes: suman el total de enviados.

| Estado final | Cuándo |
|---|---|
| **Entregado** | La fecha de entrega es el último evento (entre entrega, rebote temporal y rebote permanente). |
| **Rebote temporal** | La fecha de rebote temporal es el último evento. |
| **Rebote permanente** | La fecha de rebote permanente es el último evento. |
| **Sin confirmación** | No hay fecha de entrega ni de rebote. |

- Gana el **último evento con fecha y hora**. Ej.: entregado y después rebote temporal → Rebote temporal; rebote
  temporal y después entregado → Entregado.
- **Empate:** si dos resultados distintos tienen exactamente la misma fecha y hora, queda **«Sin confirmación»**. No se
  inventa cuál pasó primero. (Conviene distinguirlo de «sin ningún evento» en una versión futura.)

## 4. Qué hacer con la dirección: Status de correo (CORREGIR / MANTENER)

**Estado final** dice qué pasó con el envío. **Status de correo** dice qué debe hacer RED con la dirección. Son
campos distintos: un correo puede rebotar y quedar **MANTENER CORREO** si el motivo no demuestra que la dirección esté mal.

**CORREGIR CORREO** es una instrucción de **revisión de datos**, no una prueba de que la cuenta no existe. Puede
significar: pedir la dirección correcta, confirmar la escritura del dominio, revisar un dominio sin MX o investigar un
rebote permanente sin detalle. **Nunca** se corrige un correo automáticamente ni se cambia un dominio porque «se parece».

### 4.1 Reglas del dashboard nuevo (decisión del 20/11/2026: seguir la tabla de criterios)

Se aplican en este orden; gana la primera que se cumple:

1. Estado final **Entregado** o **Sin confirmación** → **MANTENER CORREO**.
2. El motivo del rebote indica **error de dirección** → **CORREGIR CORREO**.
3. El motivo indica **bloqueo, capacidad, conectividad, autenticación, antispam o fallo sin causa** → **MANTENER CORREO**.
4. **Rebote permanente** sin causa reconocida (genérico) → **CORREGIR CORREO**.
5. Cualquier otro caso (rebote temporal sin causa reconocida) → **MANTENER CORREO**.

Se usa el **motivo del rebote final** (el del rebote temporal si el estado final es Rebote temporal, el del permanente
si es Rebote permanente). **Por confirmar con datos reales de la API de Brevo** (cómo entrega Brevo cada motivo).

> **Aviso (prueba del 20/11/2026):** la API de lectura **no trae el motivo del rebote por destinatario** (sección
> 10.1). Sin el motivo, las reglas 2 a 5 no se pueden aplicar. **Decisión del 20/11/2026:** el motivo llegará por los
> webhooks de marketing de Brevo, solo para campañas nuevas; las campañas anteriores se muestran solo con totales.

La comparación del motivo no distingue mayúsculas. El mensaje original se guarda para auditoría y en pantalla se
muestra un **motivo técnico** corto (máximo 5 palabras).

### 4.2 Tabla de motivos

| Texto en el motivo de Brevo | Motivo técnico | Categoría | Acción |
|---|---|---|---|
| Unable to find MX of domain | Dominio sin registros MX | Dominio o DNS | CORREGIR |
| 550 5.1.1 / 5.1.1 | Cuenta destinataria inexistente | Rechazo de destinatario | CORREGIR |
| User unknown | Usuario desconocido | Destinatario no reconocido | CORREGIR |
| Does not exist | Cuenta no encontrada | Destinatario inexistente | CORREGIR |
| No such user | Usuario inexistente | Rechazo de destinatario | CORREGIR |
| No mailbox by that name | Buzón no encontrado | Destinatario inexistente | CORREGIR |
| Mailbox unavailable | Buzón no disponible | Rechazo de buzón | CORREGIR (ver nota) |
| Hard bounce sin detalle | Rebote permanente sin detalle | Rebote permanente genérico | CORREGIR |
| Connection timeout / Timed out | Tiempo de espera agotado | Conectividad | MANTENER |
| 452 4.2.2 / Out of storage space / OverQuota / Mailbox full | Buzón lleno | Capacidad de buzón | MANTENER |
| SMTP Authentication | Servidor exige autenticación SMTP | Autenticación | MANTENER |
| Not permitted to relay | Retransmisión SMTP no autorizada | Restricción de servidor | MANTENER |
| Access denied | Acceso denegado por servidor | Bloqueo de recepción | MANTENER |
| Blocked | Bloqueado por servidor | Restricción de seguridad | MANTENER |
| OXSUS | Bloqueo del servidor receptor | Restricción de seguridad | MANTENER |
| 5.4.1 | Rechazo por política o ruta | Restricción de entrega | MANTENER |
| Spam | Rechazo por filtro antispam | Bloqueo de seguridad | MANTENER |
| Message delivery failed | Fallo de entrega reportado | Causa no especificada | MANTENER |
| Otro rechazo no reconocido | Rechazo sin causa específica | Diagnóstico pendiente | MANTENER, salvo rebote permanente genérico (regla 4) |

**Nota:** «Mailbox unavailable» puede tener varias causas SMTP; se marca CORREGIR como **revisión**, no como prueba
de que la cuenta no existe.

### 4.3 Cuándo NO corresponde corregir la dirección

| Situación | Dónde investigar | Acción |
|---|---|---|
| Firewall bloquea la conexión | Infraestructura del destinatario | Pedir revisión de reglas de seguridad |
| Antispam bloquea el mensaje | Servidor o filtro del destinatario | Revisar autenticación, reputación y filtros |
| Buzón sin espacio | Buzón del destinatario | Pedir que libere espacio y reintentar |
| Servidor sin respuesta | Red o servidor de destino | Reintentar después |
| Relay no permitido | Configuración SMTP | Revisar autenticación y permisos |
| Error DNS / MX del dominio | Configuración del dominio | Verificar DNS y confirmar la dirección |

No se culpa automáticamente al cliente ni a RED: el mensaje SMTP dice dónde investigar, no siempre quién es responsable.

## 5. Aperturas, clics y lectura

**Apertura** (una sola por destinatario):

| Estado | Regla |
|---|---|
| **APERTURA REGISTRADA** | Tiene fecha de apertura. |
| **APERTURA AUTOMÁTICA** | Sin fecha de apertura, pero con aperturas automáticas de Apple (Mail Privacy Protection) mayores que cero. |
| **NO REGISTRADA** | Ni fecha ni señal automática. |

- Si tiene fecha **y** contador automático, gana **APERTURA REGISTRADA** (el contador se guarda aparte).
- Nunca se inventa una fecha de apertura cuando solo hay contador automático.
- La apertura automática **no** cuenta en la tasa de apertura.
- **Señal de Apple** (23/11/2026): cuenta como apertura automática de Apple tanto `apple_mpp` (historial, CSV) como
  `proxy_open` («cargado por proxy», webhook). En Detalle por correo, la apertura lleva una marca pequeña **«Apple»**
  si hubo alguna apertura de Apple (también cuando además hubo una apertura real) y el filtro **«Tipo de apertura»**
  deja ver solo las aperturas reales (APERTURA REGISTRADA) o solo las que tuvieron Apple.

**Clic:**

| Estado | Regla |
|---|---|
| **CLIC REGISTRADO** | Uno o más clics en enlaces. |
| **SIN CLIC REGISTRADO** | Ningún clic. |
| **CLIC AUTOMÁTICO** | **No aplica en esta versión**: solo existía al importar un Excel ya clasificado, y ahora todo viene directo de Brevo. |

**Ni una apertura ni un clic prueban actividad humana:** un sistema de seguridad puede abrir el correo o revisar los
enlaces. Se muestran como «actividad detectada», no como «interés confirmado».

**Lectura estimada** (23/11/2026; falta que el ingeniero confirme la definición): **aperturas sin contar las
automáticas de Apple**. Por campaña: `uniqueViews` (personas que abrieron, incluye automáticas) − `appleMppOpens`
(aperturas automáticas de Apple MPP), nunca menos de 0; se suma campaña por campaña y se divide entre los entregados.
Es **estimada** porque Brevo da Apple MPP como total de la campaña, no persona por persona. En los CSV del historial
(74, 75 y 76) se comprobó, solo con conteos, que Apple MPP va **incluido** en el total de aperturas y que la fecha de
apertura solo aparece cuando hubo una apertura no automática. Igual que la apertura, no confirma una lectura humana.
Se ve en Resultados generales (tarjeta «Lectura estimada»).

## 6. Indicadores

| Indicador | Cálculo |
|---|---|
| Enviados | Destinatarios de la campaña |
| Tasa de entrega | Entregados ÷ Enviados × 100 |
| Tasa de rebote temporal | Rebotes temporales ÷ Enviados × 100 |
| Tasa de rebote permanente | Rebotes permanentes ÷ Enviados × 100 |
| Tasa de apertura registrada | Destinatarios con apertura registrada ÷ Entregados × 100 |
| Tasa de clic | Destinatarios con clic registrado ÷ Entregados × 100 |
| % por corregir | Destinatarios con CORREGIR CORREO ÷ Enviados × 100 |
| Lectura estimada | Σ por campaña de máx(0, `uniqueViews` − `appleMppOpens`) ÷ Entregados × 100 (sección 5) |

- **Campañas con solo totales** (`globalStats` de Brevo):
  - **«Aperturas (incluye automáticas)»** = `uniqueViews`. Confirmado por Keily el 23/11/2026 con la campaña 74: la
    pantalla de Brevo muestra Entregados 157, Aperturas 45 («aperturas automatizadas incluidas»), Apple MPP 11, Total
    de aperturas 62 y Clics 3; `uniqueViews` = 45 y `viewed` = 62.
  - **«Apple MPP»** = `appleMppOpens`, se muestra **aparte**. **No se resta** uno del otro.
  - La **apertura registrada** (sin automáticas) solo existe con el detalle por persona: webhook o carga inicial del
    historial. Con solo totales, la tasa de apertura se muestra como «Aperturas (incluye automáticas) ÷ Entregados».
  - Clic = `clickers` (destinatarios que hicieron clic).
  - Sin confirmación = enviados − entregados − rebotes (si da negativo queda en 0 con aviso).
- Los porcentajes llevan un decimal; si el divisor es 0 se muestra «—» (no 0 %).
- Los 4 **estados finales** se excluyen entre sí (suman los enviados).
- **Enviados → entregados → aperturas → clics** son **etapas**: sus porcentajes **no** se suman.

**Semáforo de la tasa de entrega:**

| Tasa de entrega | Color |
|---|---|
| 100 % | Verde |
| 90 % a menos de 100 % | Amarillo |
| Menos de 90 % | Rojo |

El semáforo se calcula con los números exactos, no con el porcentaje redondeado (9 996 de 10 000 es amarillo aunque
se vea «100,0 %»).

## 7. Filtros y pestañas

**Filtros globales** (aplican a todas las vistas):

| Filtro | Qué hace |
|---|---|
| Campaña | Una o todas |
| Cargo | GG, GF, GO o Sin clasificar |
| Asunto | El mensaje enviado |
| País | País del cliente identificado |
| Cliente | Busca por empresa, código, contacto, correo o ejecutivo |
| Desde / Hasta | Fechas de envío |
| Campañas de prueba | Ocultas por defecto las campañas con **[VALIDACIÓN], [TEST] o [PRUEBA] entre corchetes**, o con la palabra **TEST** o **PRUEBA** sola (también en plural, sin importar mayúsculas ni tildes), con un interruptor para verlas. «Validación» sin corchetes no oculta (77, 78 y 79 son reales). Decisión del 24/11/2026 (DECISIONES.md). |

**Las 6 sub-pestañas** (dentro de Mailing). Todas las cifras son clicables y llevan al detalle de los destinatarios.

| Pestaña | Qué tiene |
|---|---|
| **Resultados generales** | Indicadores (enviados, entregados, apertura, clic, rebote temporal y permanente), lectura estimada (sección 5), tasa de entrega con semáforo, correos por corregir, recorrido envío → entrega → apertura → clic, gráfico de incidencias de entrega (4 estados), análisis por cargo, tabla por campaña y **campañas programadas** (estado en cola de Brevo, solo lectura: asunto, nombre, cargo y fecha de envío). |
| **Comparar campañas** | «Por campaña» y «Por comercial» lado a lado (con acordeón de detalle), **por ejecutivo y territorio** (sección 8), resultados por cargo y la comparación detallada: código y asunto, cargo, envíos y entregados, tasa de apertura, tasa de clic, rebotes, % por corregir y fecha. La comparación por asunto es descriptiva: no prueba que el asunto sea la causa (las audiencias cambian). |
| **Correos por corregir** | Correo, cliente, ejecutivo, status (CORREGIR), motivo técnico, estado final, campaña y asunto, fecha de rebote; agrupado por ejecutivo con direcciones únicas; aviso al ejecutivo (sección 8) y descarga CSV global o por ejecutivo. **Muestra correos: requiere inicio de sesión** (sección 10). |
| **Detalle por correo** | Tarjetas por estado (clic = filtro), **motivos técnicos** de CORREGIR y de MANTENER (clic = filtro por motivo) y la tabla: correo, cliente y país, ejecutivo, campaña, cargo, estado final, status, motivo técnico, indicación, apertura, clic, origen, fecha de envío y ficha. Búsqueda, filtros y descarga a Excel. Muestra correos sin inicio de sesión (DECISIONES.md). |
| **Relación con clientes** | Correo, campaña y cargo objetivo, clasificación del cruce (sección 8), cliente(s), ejecutivo(s), código(s), cargo(s) en la base y estado del mailing; detalle clicable y descarga CSV. **Muestra correos: requiere inicio de sesión.** |
| **Cargo y objetivo** | Para Marketing: cada campaña de Brevo con su cargo y su objetivo (sugeridos o elegidos a mano) y un botón Guardar protegido con la clave de Marketing. Ver sección 7.1. |

### 7.1 Cargo y objetivo (antes «Asignar cargo a campañas»)

Pedida por **Eduardo**, para que **Marketing (Ismael)** asigne el cargo y el objetivo de cada campaña.

- Muestra las campañas de Brevo (asunto arriba y «#id · nombre» abajo) con su **cargo** (GG, GF, GO o «Sin
  clasificar») y su **objetivo** (los 8 de Keily + «Promoción general de RED», o uno nuevo escrito a mano).
- **Sugerido:** el cargo por el nombre (`código-cargo-sector-asunto`); el objetivo por el asunto, el nombre o el
  contenido del correo (DECISIONES.md). Si ninguna regla coincide: «Promoción general de RED» con estado «Revisar».
- **Regla (Keily, 20/11/2026):** lo elegido **a mano gana** y queda **«Confirmado · por <nombre> · <fecha>»**. Se
  refleja al instante en todo el dashboard (filtro Cargo, Análisis por cargo, acordeón de la campaña).
- **Guardar sin inicio de sesión, con clave de Marketing** (Keily, 23/11/2026): la primera vez se pide la clave y «Tu
  nombre»; los valida el servidor (`MKT_CLAVE_EDICION`, sin `VITE_`) y la pestaña recuerda solo un permiso firmado
  de 8 horas. 5 claves incorrectas en 15 minutos bloquean 15 minutos (en Vercel, por instancia). Sin la variable,
  Guardar queda deshabilitado. «Guardar» tal cual confirma lo sugerido; «Volver a lo sugerido» borra lo elegido.
- **Dónde se guarda:** tabla `mkt_campana_cargo` del proyecto «Dashboard Canales de marketing» (`campana_id`, `cargo`,
  `objetivo`, `asignado_por`, `asignado_en`, `objetivo_asignado_en`; SQL 001 y 004). Ruta
  `POST/DELETE /api/marketing/mailing/cargo` (server/mailing/cargoEditar.js). Solo escribe en esa tabla; nunca en
  Cumplimiento de Clientes ni en Brevo (a Brevo solo se le lee la lista de campañas para rechazar campañas inexistentes).

## 8. Territorio por comercial: cruce con Cumplimiento de Clientes

La base viene de la app **CumplimientoClientes** (Supabase). **SOLO LECTURA** (regla de CLAUDE.md): nunca se
escribe, cambia ni borra nada en ese proyecto. Decisión de Keily, administradora de la app (23/11/2026).

**Cómo se lee (implementado el 23/11/2026):**
- La llave anon no sirve: el candado (RLS) de `clientes`, `contactos` y `ejecutivos` solo deja leer a usuarios con
  sesión de la app. Se usa la **contraseña de la base** (`CC_DB_PASSWORD`, solo servidor), con el pooler de
  transacciones `aws-0-us-east-1.pooler.supabase.com:6543` y el usuario `postgres.<código del proyecto>`.
- Candados: la conexión pide `default_transaction_read_only=on`; cada consulta corre en `BEGIN TRANSACTION READ ONLY`
  con `statement_timeout` y **siempre termina con ROLLBACK**; solo se acepta UNA consulta SELECT / WITH; la prueba
  `server/clientes/soloLectura.test.js` **falla** si algún archivo de `server/clientes/` contiene una escritura.
- Tablas (repo InnovAIgt/CumplimientoClientes, `supabase/schema.sql`): `clientes` (`pais`, `codigo`, `nombre`,
  `ejecutivo_id`), `ejecutivos` (`nombre`, `usuario`) y `contactos` (`cliente_id`, `cargo` gg/gf/go, `email`).
- Caché de 30 min en el servidor. Al navegador solo llegan los clientes de los correos de las campañas, nunca la base.
- Código: `server/clientes/cumplimiento.js` (lectura) y `server/clientes/cruce.js` (cruce); la ruta `/detalle` agrega
  `clientes` y `posibles` a cada fila. Si Cumplimiento falla, el detalle sigue y avisa.

**Posible cliente por dominio (pedido por Keily, 23/11/2026):** solo para los correos **sin** coincidencia exacta. Si
el dominio del correo (lo que va después de @) coincide con el de algún contacto de Cumplimiento, se muestra
«Posible cliente: <Empresa> (por dominio)» con su ejecutivo, **en otro color (ámbar, borde punteado)** y nunca igual
que una coincidencia exacta. Si el dominio está en varias empresas, se muestran todas como posibles. Nunca para
dominios de correo personal (gmail, hotmail, outlook, yahoo, icloud, live y similares). Es una pista para confirmar,
no una identificación.

**Resultado del 23/11/2026 (campañas reales con detalle, solo conteos):** 547 correos distintos; **405** con
coincidencia exacta (SV 245 · GT 160), 18 de ellos en varias empresas; de los **142 sin coincidencia exacta**, **35**
quedan como posible por dominio y 107 sin identificar (32 de ellos con dominio personal). De los **85 correos por
corregir sin coincidencia exacta**, **19** quedan como posible por dominio. Muchos correos por corregir no están en la
base, probablemente porque ya se corrigieron en Cumplimiento.

**Campos que se usan** (los teléfonos y demás campos no hacen falta): País, Código de cliente, Cliente, Ejecutivo,
y los correos y nombres de **GG**, **GF** y **GO**. «Usuario ejecutivo» es un identificador interno, no un correo.

**Cómo se cruza:**
1. Cada correo se compara por **coincidencia exacta**, en **minúsculas** y **sin espacios al inicio ni al final**.
2. Si una celda trae varios correos (separados por coma, punto y coma o espacio), se revisa cada uno.
3. No se asume que dos correos son de la misma empresa solo porque comparten dominio.

**Clasificación del cruce** (una sola por correo; gana la de mayor prioridad):

| Prioridad | Clasificación | Cuándo |
|---|---|---|
| 1 | Contacto relacionado con varias empresas | El correo aparece en más de un código de cliente |
| 2 | Identificado en cargo objetivo | Aparece en el cargo al que iba la campaña |
| 3 | Identificado en otro cargo | Aparece, pero en otra gerencia |
| 4 | Sin coincidencia en base de clientes | No está en ninguna de las 3 columnas de correo |

«Sin coincidencia» **no** significa correo inválido: solo que no está en la base.

**Ejecutivo (territorio):** sale de la **cuenta del cliente** con la clave **País + Código de cliente**, no del nombre
del destinatario.

| Situación | Se muestra |
|---|---|
| Cliente con ejecutivo | El ejecutivo |
| Mismo correo en varias empresas | Todos sus ejecutivos (no se elige uno) |
| Cliente sin ejecutivo | Sin identificar |
| Correo sin coincidencia | Sin identificar |

**Vista por ejecutivo y territorio** (pedido del ingeniero; en «Comparar campañas», 23/11/2026):
- Una tarjeta por **territorio** (país del cliente en Cumplimiento): tasa de entrega con semáforo, destinatarios y
  ejecutivos; clic = filtro País de arriba.
- Una fila por **ejecutivo + país**: cartera (clientes asignados en ese país), clientes alcanzados, destinatarios
  (correo + campaña), entrega con semáforo, apertura registrada, clic y direcciones por corregir. Ordenable; clic en
  una fila abre su cartera en Relación con clientes.
- Solo coincidencia **exacta**; lo demás va a «Sin identificar» (al final). Un correo con clientes de dos ejecutivos o
  países cuenta en cada uno; el subtotal por país no lo repite. Cálculo: `metricasPorTerritorio` (datos/porEjecutivo.js).

**Aviso a los ejecutivos** (desde «Correos por corregir»):
- Correos **CORREGIR CORREO** agrupados por ejecutivo, **direcciones únicas** (sin repetir entre campañas), con
  cliente, campañas y motivo resumido.
- Asunto: «CORREOS POR CORREGIR», con el número de casos y **plazo máximo de 48 horas**.
- Botón **IR A CORREGIR** → https://cumplimientoclientes-88n2.onrender.com (el enlace de la plantilla anterior está
  desactualizado; ver PENDIENTES).
- Se prepara un **borrador**: Marketing lo revisa y lo envía. **No** hay envío automático.
- El correo de cada ejecutivo se configura a mano (la base de clientes no lo trae).

## 9. Diferencias con la plantilla anterior (para Marketing)

> Para Ismael y Laura. El dashboard nuevo sigue el **documento de criterios**. La página HTML que ya conocen
> («dashboard de mailing» con el botón IR A CORREGIR) se aparta de esos criterios en 3 puntos, por eso **las cifras de
> «Correos por corregir» pueden cambiar** respecto a lo que ya vieron. No es un error: es la regla oficial aplicada
> igual a todos.

1. **«No such user» ahora se marca para corregir.** El documento dice que ese mensaje significa «el usuario no
   existe». La página anterior no lo reconocía y dejaba esos correos como «mantener».
   → Puede **subir** un poco el número de correos por corregir.
2. **Bloqueos y problemas pasajeros ya no se marcan para corregir, aunque el rebote sea permanente.** Si el servidor
   del cliente rechazó el correo por antispam, por tiempo de espera, por buzón lleno, por autenticación o relay, o
   por un «fallo de entrega» sin explicación, la dirección **se mantiene**: el problema no es el correo escrito,
   sino el servidor o la red. La página anterior solo respetaba 4 tipos de bloqueo y los demás los mandaba a corregir.
   → Puede **bajar** el número de correos por corregir.
3. **Se mira el motivo del último rebote.** Si un correo tuvo un rebote permanente y después uno temporal, se
   revisa el motivo del **temporal**, que es lo último que pasó. La página anterior miraba primero el del permanente.
   → Puede cambiar el motivo y la decisión en pocos casos. *(Por confirmar con datos reales de la API de Brevo.)*

## 10. Fuente: API de Brevo y seguridad

- Se consulta **desde nuestro servidor** con `BREVO_API_KEY` (solo servidor, nunca `VITE_`), con caché en el servidor.
- Ya no hay importación de CSV ni de Excel: todo viene directo de Brevo.
- Llave **dashboard-marketing-lectura**: solo lectura de campañas de email y contactos, caduca el **2027-11-20**
  (renovarla antes; ver PENDIENTES). En Brevo está desactivado el bloqueo de IP para claves API porque Vercel cambia
  de IP.
- Las pestañas **Correos por corregir**, **Detalle por correo** y **Relación con clientes** muestran correos de
  personas. **Decisión de Keily (23/11/2026, [DECISIONES.md](DECISIONES.md)):** se muestran **sin inicio de sesión**
  en todos los ambientes, con el interruptor de servidor `MKT_MOSTRAR_CORREOS` (por defecto «si»; con «no» solo
  conteos).
- Las rutas de totales (sin correos) no devuelven ningún dato personal.
- **`GET /api/marketing/mailing/campanas`** (`server/mailing/campanas.js`): campañas enviadas y programadas con id,
  nombre, asunto limpio (`{{ contact.NOMBRE }}` → `[NOMBRE]`), fecha, código, sector, cargo sugerido / manual / final,
  si es de prueba, totales, tasas y semáforo. Nunca remitente, respuesta, contenido ni correos. Caché de 10 min en el
  servidor y 5 min en Vercel; si Brevo falla y hay una copia anterior, se usa con aviso. La primera carga tarda unos
  10 s (Brevo calcula los totales), por eso la función tiene 60 s de tiempo máximo en `vercel.json`.
- **`GET /api/marketing/mailing/resumen`** (`server/mailing/resumen.js`), con `?campanas=12,13` opcional: con los
  eventos del webhook, **solo conteos** por campaña: destinatarios, estados finales (y empates), CORREGIR / MANTENER,
  motivos técnicos, apertura registrada (evento `opened`), `proxy_open` aparte (por confirmar qué es), clic, spam,
  bajas, eventos con nombre nuevo y primera / última fecha. Los correos se usan solo dentro del servidor para agrupar;
  **nunca salen**. Con la tabla vacía responde `hayDatos: false` y «Sin datos del webhook todavía.». Caché de 2 min.
  Los destinatarios sin ningún evento no están en la tabla: la pantalla los calcula con los enviados de Brevo.
- **`GET /api/marketing/mailing/detalle`** (`server/mailing/detalle.js`), con `?campanas=` opcional: una fila por
  correo y campaña (historial importado y webhook) con estado final, CORREGIR / MANTENER, motivo técnico, **indicación**,
  apertura, clic, baja, spam, origen y fechas. Nunca el texto original del motivo (puede traer correos). `no-store` y
  `noindex`; caché de 2 min en el servidor. Alimenta «Correos por corregir» (una fila por dirección única) y «Detalle
  por correo», con buscador, filtros, páginas y **Exportar a Excel** (hoja de datos + «Filtros aplicados»).

  | Caso | Indicación |
  |---|---|
  | CORREGIR · Dominio sin registros MX | Verificar el dominio y confirmar la dirección |
  | CORREGIR · cualquier otro motivo | Pedir o confirmar la dirección correcta (es revisión, no prueba de que no exista) |
  | MANTENER · Tiempo de espera agotado | Reintentar después |
  | MANTENER · Buzón lleno | Pedir que libere espacio y reintentar |
  | MANTENER · Autenticación / Relay no autorizado | Revisar autenticación y permisos SMTP |
  | MANTENER · Bloqueo, antispam, acceso denegado | Revisar reputación, autenticación y filtros del destinatario |
  | MANTENER · Rechazo por política o ruta | Revisar la política o ruta del servidor de destino |
  | MANTENER · Fallo sin causa / diagnóstico pendiente | Revisar en el próximo envío |
  | Entregado / Sin confirmación | Sin acción |

  Cliente y Ejecutivo dicen «Pendiente del cruce» hasta conectar Cumplimiento de Clientes (sección 8).
- Nunca se guardan correos ni datos de clientes en el repo, las pruebas ni las capturas.

### 10.1 Qué trae y qué no trae la API (prueba del 20/11/2026)

**Campañas** — `GET /v3/emailCampaigns`: id, nombre, asunto, estado y fechas (`sentDate`, `scheduledAt`,
`createdAt`). Ese día: 59 campañas, 54 enviadas (`sent`) y 5 borradores (`draft`).

- Las **programadas** se piden con `status=queued` (Brevo no acepta `scheduled`: responde 400). Ese día había 0.
- Los nombres casi nunca siguen la regla de la sección 2, por eso hace falta «Asignar cargo a campañas» (7.1).
- Algunos asuntos traen `{{ contact.NOMBRE }}` (Brevo pone ahí el nombre de cada persona) o saltos de línea: hay que
  limpiarlos para mostrarlos.
- Hay campañas de prueba (TEST, VALIDACIÓN) mezcladas con las reales (ver filtro «Campañas de prueba», sección 7).

**Estadísticas de una campaña** — `GET /v3/emailCampaigns/{id}?statistics=…`:

| Opción | Qué trae |
|---|---|
| `globalStats` | **La que se usa.** También llega en la **lista** de campañas (`GET /v3/emailCampaigns?statistics=globalStats`, hasta 100 por página): no hace falta pedir campaña por campaña. `sent`, `delivered`, `softBounces`, `hardBounces`, `uniqueViews`, `viewed`, `trackableViews`, `estimatedViews`, `opensRate`, `uniqueClicks`, `clickers`, `appleMppOpens` (aperturas automáticas de Apple, solo el total), `unsubscriptions`, `complaints` |
| `campaignStats` | Los mismos totales por lista, más `deferred` (envío demorado). En la campaña 74 no coinciden con `globalStats`; **se usa `globalStats`**, que coincide con la pantalla de Brevo (comparado por Keily el 23/11/2026). |
| `linksStats` | Clics por enlace |
| `statsByDomain`, `statsByDevice`, `statsByBrowser` | Totales por dominio, dispositivo y navegador (`statsByDomain` muestra dominios de clientes: no se guardan en docs ni pruebas) |

**Detalle por destinatario:**

- **No hay** una llamada de lectura que dé todos los destinatarios de una campaña con su resultado (la lista de la
  campaña puede ya no existir en Brevo).
- Por contacto sí: `GET /v3/contacts/{id}` → `statistics` con `messagesSent`, `delivered`, `softBounces`,
  `hardBounces` (cada uno con `campaignId` y `eventTime`), `opened` (`campaignId`, `ip`, `count`, `eventTime`) y
  `clicked` (`campaignId`, `links` con `url`, `count`, `ip`, `eventTime`). El contacto trae `email`, `listIds`,
  `emailBlacklisted` y los atributos `EMPRESA` y `NOMBRE`. Habría que consultar contacto por contacto (1,755 ese día).
- **No trae:** el **motivo del rebote** (necesario para CORREGIR / MANTENER, sección 4) ni la **marca de apertura
  automática de Apple** por persona.
- **Motivos de rebote agrupados por campaña:** la pantalla de Brevo los muestra (por ejemplo, en la campaña 74:
  Conexión 8, Usuario 2, Desconocido 2), pero la **API de solo lectura no trae ese resumen** (revisado el
  23/11/2026: ningún campo de la campaña tiene motivos, y `/emailCampaigns/{id}/bounces`, `/statistics` y `/reports`
  no existen). Para las campañas viejas, los motivos solo pueden llegar con la **carga inicial del historial** (CSV de
  Brevo, ver PENDIENTES).
- **Exportación de destinatarios** (`POST /v3/emailCampaigns/{id}/exportRecipients`): probada el 20/11/2026 con la
  campaña 74 (solo rebotes temporales) → **403 `permission_denied`** en `campaigns.email`: la llave de solo lectura
  no permite exportar. No se creó ningún proceso ni se descargó nada. Las columnas del archivo siguen sin confirmar
  (Ismael puede exportarla a mano en Brevo y pasar solo los nombres de las columnas; ver PENDIENTES).
- **Llave con permiso de escritura: descartada** (podría también modificar o enviar campañas).

**Decisión (20/11/2026): el detalle por correo sale de los webhooks de marketing de Brevo, solo para campañas nuevas.**

- Con un webhook, **Brevo avisa a nuestro servidor** cada vez que pasa algo con un correo de una campaña (entregado,
  abierto, clic, rebote temporal, rebote permanente, spam, baja). Según la documentación de Brevo, los eventos
  `hard_bounce` y `soft_bounce` traen el campo **`reason`** (motivo del rebote); con eso se aplica CORREGIR / MANTENER
  (sección 4). El formato real del motivo se confirma con la primera campaña de prueba.
- El evento «abierto» **no trae** la marca de apertura automática de Apple; existe un evento `proxy_open` que la
  documentación no explica (por confirmar).
- Solo sirve **hacia adelante**: las campañas enviadas antes de crear el webhook se muestran **solo con totales**
  (`globalStats`), sin detalle por correo ni CORREGIR / MANTENER.
- Hace falta una ruta en nuestro servidor que reciba los avisos (protegida con una clave secreta) y un lugar donde
  guardar los eventos (ver PENDIENTES).
- El webhook lo crea **Keily** en la pantalla de Brevo, **avisando a Ismael**.

### 10.2 Dónde se guardan los eventos (decisiones del 20/11/2026)

- Proyecto Supabase **«Dashboard Canales de marketing»**, solo para este dashboard. Variables de servidor (solo
  nombres): `MKT_SUPABASE_URL` y `MKT_SUPABASE_SECRET_KEY`. Plan Free: se pausa tras una semana sin actividad y no
  tiene respaldos.
- Tablas (archivo [`sql/001_tablas_webhook.sql`](sql/001_tablas_webhook.sql), lo corre Keily en el SQL Editor):
  - `mkt_brevo_eventos`: tipo de evento, campaña, correo (minúsculas), fecha del evento y del envío, motivo (solo
    rebotes y spam) y hora de llegada. Una **huella** única (evento + campaña + correo + fecha) evita duplicados
    cuando Brevo reintenta. El tipo de evento **no se limita**: si Brevo manda uno nuevo, se guarda y se filtra
    después.
  - `mkt_campana_cargo`: cargo GG / GF / GO elegido a mano por campaña.
- **Protección:** RLS (el candado de Supabase) activado sin reglas de acceso y sin permisos para `anon` ni
  `authenticated`: solo nuestro servidor, con la llave secreta, puede leer y escribir. El portal nunca habla directo
  con Supabase.
- **No se guarda:** la URL del clic (por ahora), la IP de envío, segmentos ni listas.
- **Ruta que recibe los avisos:** `POST /api/marketing/brevo-webhook` (`server/brevoWebhook.js`). Clave en
  `BREVO_WEBHOOK_SECRET`, por el encabezado `x-webhook-token` o como usuario:clave en la dirección. Responde 401 sin la
  clave correcta (no guarda nada) y 429 si el fallo es nuestro (falta configuración o Supabase no responde), que es el
  único error con el que Brevo reintenta. Los eventos de contactos (sin campaña) se ignoran.
- **Estado final** y **CORREGIR / MANTENER** se calculan al leer (secciones 3 y 4); no se guardan.
- Se guardan **12 meses**; la limpieza mensual se programa más adelante.
- Datos de la prueba: en las mismas tablas, y se borran al terminar la prueba.
- **Tarea diaria** (Vercel cron, protegida con `CRON_SECRET`) que hace una lectura mínima para que el proyecto Free
  no se pause.
- Hasta que el portal tenga **inicio de sesión real**, las rutas de Correos por corregir, Detalle por correo y
  Relación con clientes devuelven **solo totales**, sin correos (hoy el inicio de sesión solo existe en el navegador).

**Permisos:** `/v3/smtp/statistics/events` responde 403 porque la llave no cubre los correos transaccionales. Es lo
esperado: el dashboard no los usa.

### 10.3 Carga inicial del historial (CSV de Brevo)

Para las campañas enviadas **antes** del webhook, el detalle por persona sale de los CSV que se exportan desde Brevo
(uno por campaña, columnas `Email_ID`, `Send_Date`, `Delivered_Date`, `Open_Date`, `Total Opens`,
`Total Apple MPP Opens`, `Hard_Bounce_Date` / `Reason`, `Soft_Bounce_Date` / `Reason`, `Clicked_Links_Count`,
`Unsubscribe_Date`, `Complaint_date`). Las fechas vienen como día-mes-año en hora de Guatemala.

- Se importan con `node scripts/importar-historial-brevo.mjs --carpeta "<carpeta fuera del repo>" --campanas 1,2,3`
  (prueba en seco por defecto; solo escribe con `--cargar`; correrlo dos veces no duplica). La lógica está en
  `server/mailing/historialCsv.js`, con pruebas sobre un CSV inventado. Los CSV **nunca** entran al repo.
- **Clics:** cada enlace es una columna del CSV y su celda trae la **fecha real del clic**; el clic se guarda con esa
  fecha y con su destino limpio (en YouTube solo el ID del video, parámetro `v`). Solo si el CSV no trae fecha se usa
  la de apertura o envío, marcada como aproximada. Los 12 clics de 74, 75 y 76 se pasaron a su fecha real el
  23/11/2026.
- Columnas nuevas (`sql/002_historial_importado.sql`): `origen` (`webhook` / `historial`), `cantidad` (aperturas o
  aperturas Apple MPP) y `fecha_aproximada`.
- Cada persona se convierte en eventos con `origen = 'historial'`: `delivered`, `soft_bounce` y `hard_bounce` (con su
  **motivo**), `opened` (con fecha y total de aperturas), **`apple_mpp`** (aperturas automáticas de Apple por persona),
  `click` (el CSV no trae la fecha del clic: se usa la de apertura o la de envío, con `fecha_aproximada = true`),
  `unsubscribe` y `spam`. No se guardan IP, URL ni nombre de campaña.
- **Sin duplicados:** la misma huella del webhook (evento + campaña + correo + fecha). Correr la carga dos veces no
  agrega nada; lo que llegue después por el webhook se cuenta por persona.
- **Apertura automática** por persona (sección 5): con `apple_mpp` y sin `opened`.
- Se deshace con un solo borrado de `origen = 'historial'` de las campañas cargadas.
- **Hueco conocido:** aperturas y clics entre la exportación del CSV y la activación del webhook no están en ninguna
  fuente (no cambia el estado final ni CORREGIR).

**Cargadas (24/11/2026):** campañas 77, 78, 79, 71, 68 y 66 desde CSV exportados «por contacto» el 24/11 (2 686
nuevos de 2 707 eventos: en 77, 78 y 79 se saltaron 8, 7 y 6 que ya habían llegado por el webhook, por la huella).
Entregas y rebotes coinciden con Brevo (salvo 1 rebote temporal de la 77 que después se entregó); aperturas un poco
menores y **clics bastante menores en 77–79** (el propio CSV trae menos personas con clic que `clickers` de Brevo).
La 70 no se cargó (PENDIENTES).

**Cargadas (23/11/2026):** campañas 74, 75 y 76 (1 076 eventos). El estado final coincide exacto con `globalStats`
(74: 157 / 12 / 0 · 75: 308 / 37 / 26 · 76: 254 / 33 / 27) y dan **101 correos por corregir** (6 + 49 + 46). Las
aperturas y clics del CSV son menores que los de Brevo hoy porque el CSV se exportó el 16/11.

**Cómo exportar las demás (siguen 1, 2, 3, 68 y 71):**

1. En Brevo: Campañas → Email → abrir la campaña **enviada** → su **informe** → exportar los **destinatarios con
   todos sus datos** en **CSV**, igual que con 74, 75 y 76. Un archivo por campaña.
2. El archivo trae estas columnas (las de 74, 75 y 76): `Campaign ID`, `Campaign Name`, `Email_ID`, `Send_Date`,
   `Delivered_Date`, `Open_Date`, `Total Opens`, `Total Apple MPP Opens`, `Unsubscribe_Date`, `Hard_Bounce_Date`,
   `Hard_Bounce_Reason`, `Soft_Bounce_Date`, `Soft_Bounce_Reason`, `Open_IP`, `Click_IP`, `Unsubscribe_IP`,
   `Clicked_Links_Count`, `Complaint_date` y una columna por enlace. Las IP no se guardan.
3. Guardarlo en `C:\Users\KeilyGarcia\Downloads\datos-marketing\brevo\` (fuera del repo, junto a los de 74, 75 y
   76) **sin cambiar** la parte `campaign-[ID]` del nombre (por ejemplo `… campaign-[68]….csv`): el importador busca
   el archivo por esa parte.
4. Avisar a Claude: primero la prueba en seco (`--campanas 1,2,3,68,71`, sin `--cargar`), que muestra solo conteos;
   con el «sí» de Keily, la carga.

Después siguen 70, 42, 41, 40, 39, 38, 37, 36, 35, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21 y 20.

## 11. Leads

- Un lead es **calificado** si el bot de WhatsApp le da **75 puntos o más**, y **no calificado** si le da **menos de 75**.
- Después pasa a un **CRM**. Los **calificados** alimentan el embudo de **Flujo de ventas**.
- Leads por campaña: hay que cruzar el lead con los correos de la campaña. La API de Prospekt IA **no trae el correo**
  del lead (revisado el 18/11/2026), por eso se pidió el acceso al CRM o bot (Ismael).
- **Pendiente:** acceso al CRM o bot de leads (Ismael).
