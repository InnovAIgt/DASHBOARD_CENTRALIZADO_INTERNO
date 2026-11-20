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

**Campañas viejas que no cumplen la regla** (por ejemplo «GERENTE GENERAL NOVIEMBRE 5»):
- El cargo se **deduce del nombre** cuando trae el cargo escrito completo («GERENTE GENERAL» → GG,
  «GERENTE FINANCIERO» → GF, «GERENTE OPERATIVO» o «GERENTE DE OPERACIONES» → GO).
- Si no se puede deducir, el cargo queda **«Sin clasificar»**. El sector queda «Sin clasificar».
- No se adivina nada más del nombre.

La regla se le entrega a Marketing para las campañas nuevas (PENDIENTES). Si el nombre no sigue la regla, Marketing
puede asignar el cargo en la sub-pestaña **Asignar cargo a campañas** (sección 7.1).

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
> 10.1). Sin el motivo, las reglas 2 a 5 no se pueden aplicar. Falta probar la exportación de destinatarios o los
> webhooks de Brevo (ver PENDIENTES).

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

**Clic:**

| Estado | Regla |
|---|---|
| **CLIC REGISTRADO** | Uno o más clics en enlaces. |
| **SIN CLIC REGISTRADO** | Ningún clic. |
| **CLIC AUTOMÁTICO** | **No aplica en esta versión**: solo existía al importar un Excel ya clasificado, y ahora todo viene directo de Brevo. |

**Ni una apertura ni un clic prueban actividad humana:** un sistema de seguridad puede abrir el correo o revisar los
enlaces. Se muestran como «actividad detectada», no como «interés confirmado».

**Lectura:** **por confirmar con el ingeniero.** Ojo: con los datos de Brevo no se puede confirmar una lectura humana
(ver arriba).

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
| Lectura | Por confirmar con el ingeniero |

- Los 4 **estados finales** se excluyen entre sí (suman los enviados).
- **Enviados → entregados → aperturas → clics** son **etapas**: sus porcentajes **no** se suman.

**Semáforo de la tasa de entrega:**

| Tasa de entrega | Color |
|---|---|
| 100 % | Verde |
| 90 % a menos de 100 % | Amarillo |
| Menos de 90 % | Rojo |

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
| Campañas de prueba | **Propuesta, por confirmar con Ismael:** ocultar por defecto las campañas de prueba (nombre con TEST o VALIDACIÓN), con un filtro para verlas |

**Las 6 sub-pestañas** (dentro de Mailing). Todas las cifras son clicables y llevan al detalle de los destinatarios.

| Pestaña | Qué tiene |
|---|---|
| **Resultados generales** | Indicadores (enviados, entregados, apertura, clic, rebote temporal y permanente), recorrido envío → entrega → apertura → clic, gráfico de incidencias de entrega (4 estados), tasa de entrega con semáforo, correos por corregir, análisis por cargo y tabla por campaña. |
| **Comparar campañas** | Código y asunto, cargo, envíos y entregados, tasa de apertura, tasa de clic, rebotes, % por corregir y fecha. La comparación por asunto es descriptiva: no prueba que el asunto sea la causa (las audiencias cambian). |
| **Correos por corregir** | Correo, cliente, ejecutivo, status (CORREGIR), motivo técnico, estado final, campaña y asunto, fecha de rebote; agrupado por ejecutivo con direcciones únicas; aviso al ejecutivo (sección 8) y descarga CSV global o por ejecutivo. **Muestra correos: requiere inicio de sesión** (sección 10). |
| **Detalle por correo** | Correo, cliente y país, ejecutivo, campaña, cargo, estado final, status, apertura, clic, motivo técnico, fecha de envío y «Ver eventos». Búsqueda, filtros por estado y descarga CSV. **Muestra correos: requiere inicio de sesión.** |
| **Relación con clientes** | Correo, campaña y cargo objetivo, clasificación del cruce (sección 8), cliente(s), ejecutivo(s), código(s), cargo(s) en la base y estado del mailing; detalle clicable y descarga CSV. **Muestra correos: requiere inicio de sesión.** |
| **Asignar cargo a campañas** | Para Marketing: cada campaña de Brevo (nombre, asunto, fecha) con un menú para elegir el cargo (GG, GF o GO) y un botón Guardar. Ver sección 7.1. |

### 7.1 Asignar cargo a campañas

Pedida por **Eduardo**, para que **Marketing (Ismael)** asigne el cargo de cada campaña.

- Muestra las campañas que llegan de Brevo: **nombre**, **asunto** y **fecha**.
- En cada una, un menú para elegir el cargo: **GG** (Gerente General), **GF** (Gerente Financiero) o **GO** (Gerente de
  Operaciones), y un botón **Guardar**.
- Si el nombre sigue la regla `código-cargo-sector-asunto`, el cargo viene **sugerido**; si no, se elige a mano.
- **Regla (confirmada por Keily, 20/11/2026):** lo elegido **a mano gana** sobre lo sugerido por el nombre. Si no hay
  ninguno de los dos, la campaña queda **«Sin clasificar»**.
- Lo que se elija alimenta el filtro **Cargo** y el **Análisis por cargo** de todo el dashboard.
- Estado: solo la estructura vacía (Parte 2), con el aviso «Pendiente de conexión con Brevo» y la nota «Pendiente:
  definir dónde se guarda la selección». No hay base de datos todavía.
- Pendientes: dónde se guarda el cargo elegido (Supabase u otro) y quién puede editarlo (Ismael). Ver PENDIENTES.

## 8. Territorio por comercial: cruce con Cumplimiento de Clientes

La base viene de la app **CumplimientoClientes** (Supabase). **Pendiente:** el permiso de lectura, que da Keily.
Mientras no esté, no se conecta a ningún Supabase.

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
  personas: sus rutas del servidor **deben pedir el inicio de sesión del portal**. No pueden quedar públicas como la
  ruta vieja `mailing-detalle`.
- Las rutas de totales (sin correos) no devuelven ningún dato personal.
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
| `globalStats` | **La que se usa por ahora.** `sent`, `delivered`, `softBounces`, `hardBounces`, `uniqueViews`, `viewed`, `trackableViews`, `estimatedViews`, `opensRate`, `uniqueClicks`, `clickers`, `appleMppOpens` (aperturas automáticas de Apple, solo el total), `unsubscriptions`, `complaints` |
| `campaignStats` | Los mismos totales por lista, más `deferred` (envío demorado). En la campaña 74 no coinciden con `globalStats` (aperturas 38 contra 44, clics 1 contra 3): por confirmar en la pantalla de Brevo (ver PENDIENTES). |
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
- Por probar: la exportación de destinatarios (`POST /v3/emailCampaigns/{id}/exportRecipients`) y los webhooks de
  marketing.

**Permisos:** `/v3/smtp/statistics/events` responde 403 porque la llave no cubre los correos transaccionales. Es lo
esperado: el dashboard no los usa.

## 11. Leads

- Un lead es **calificado** si el bot de WhatsApp le da **75 puntos o más**, y **no calificado** si le da **menos de 75**.
- Después pasa a un **CRM**. Los **calificados** alimentan el embudo de **Flujo de ventas**.
- Leads por campaña: hay que cruzar el lead con los correos de la campaña. La API de Prospekt IA **no trae el correo**
  del lead (revisado el 18/11/2026), por eso se pidió el acceso al CRM o bot (Ismael).
- **Pendiente:** acceso al CRM o bot de leads (Ismael).
