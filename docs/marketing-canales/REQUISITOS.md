# Requisitos · Marketing por canales

Pedido por Keily García el 16/11/2026. Estado: ✅ hecho · 🔄 en curso · ⏳ pendiente.

## Diseño

| # | Requisito | Estado |
|---|---|---|
| R1 | Tres piezas separadas: fuente → cálculos → ruta/pantalla. Cambiar la fuente no toca lo demás. | ✅ Fase 1 |
| R2 | La fuente entrega un formato estándar: una fila por persona por campaña. | ✅ Fase 1 |
| R3 | Funciona en local, Vercel y Docker. | ✅ Fase 1 + Fase 2 (Drive funciona en los tres; falta la prueba con la llave real) |

## Fuente (CSV de Brevo)

| # | Requisito | Estado |
|---|---|---|
| R4 | Leer CSV de Brevo: separador `;`, fechas `DD-MM-YYYY HH:mm:ss`, columnas de enlace variables. | ✅ Fase 1 |
| R5 | Identificar la campaña por Campaign ID, no por el nombre del archivo. | ✅ Fase 1 |
| R6 | Leer y acumular todos los CSV de la carpeta. Campaña repetida → archivo más reciente. | ✅ Fase 1 |
| R7 | Carpeta local `MARKETING_LOCAL_CSV_DIR`. | ✅ Fase 1 |
| R8 | Google Drive con cuenta de servicio (`GOOGLE_SERVICE_ACCOUNT_JSON`, `MARKETING_DRIVE_FOLDER_ID`), caché de ~15 min. | 🔄 Fase 2: probado con Drive simulado; falta la prueba con la llave real |
| R8a | Si están las dos fuentes, gana Drive y la respuesta dice cuál se usó. Hojas de Google se ignoran con motivo. Llave en JSON o base64. `?actualizar=1`. Sin librerías nuevas. | ✅ Fase 2 |
| R8b | Carpeta y proyecto de Google Cloud de cuenta de empresa; Marketing Editor, cuenta de servicio Lector; nunca borrar CSV viejos. | ✅ documentado (CONFIGURAR_DRIVE.md) |

## Cálculos

| # | Requisito | Estado |
|---|---|---|
| R9 | Enviados, entregados, rebotes temporales y permanentes, aperturas reales, solo apertura automática, personas con clic, aperturas totales y clics en enlaces distintos, bajas y quejas. | ✅ Fase 1 |
| R9a | Entregado o rebote: gana el último evento con fecha. Contador "entregados y luego rebotados". Nota visible en "% de apertura" con las aperturas de quienes luego rebotaron. | ✅ Paso A (D21) |
| R10 | % apertura y % clic sobre entregados. Con < 5 entregados: "pocos datos". | ✅ Fase 1 |
| R11 | Excluir campañas de prueba (lista editable, sin importar mayúsculas ni tildes). | ✅ Fase 1 |
| R12 | Excluir destinatarios internos de RED. | ✅ Fase 1 |
| R13 | País por dominio: `.gt`, `.sv`, Desconocido. | ✅ Fase 1 |
| R14 | Totales por mes. | ✅ Fase 1 |

## Ruta y privacidad

| # | Requisito | Estado |
|---|---|---|
| R15 | `/api/marketing/mailing`: campañas (id, nombre, fecha, métricas, excluida y motivo), totales mensuales y resumen de archivos (leídos, ignorados y por qué). | ✅ Fase 1 |
| R16 | No enviar correos, IPs ni datos personales al navegador. | ✅ Fase 1 |
| R17 | `MARKETING_LOCAL_CSV_DIR` vacía en `.env.example`. Ningún CSV en el repositorio. | ✅ Fase 1 |

## Pantalla

| # | Requisito | Estado |
|---|---|---|
| R18 | Menú Marketing → "Marketing por canales". Pestaña Mailing: totales, tabla de campañas, evolución mensual, exclusiones y explicación de cálculos. | ✅ Fase 3 |
| R18a | Selector "Sin internos" / "Total en Brevo" (sin decir "como Brevo"); aperturas reales y automáticas por separado; nota de antivirus en clics; aviso de país "Desconocido"; "pocos datos"; ventana de detalle; botón Actualizar y fecha de lectura. | ✅ Fase 3 |
| R18b | Fecha de envío siempre de Send_Date (#75 = 11/11). Tarjeta "Campañas del mes vs meta" (meta pendiente). Columna "Asunto" con "Pendiente (catálogo)". | ✅ Fase 3 |
| R18c | Estilo visual del dashboard viejo (anillos, tarjetas, ranking, comparar), en el orden aprobado de 10 secciones. Anillos Entrega/Apertura/CTR/CTOR con Excelente/Promedio/Bajo y rangos de referencia B2B. CTOR nuevo en el servidor. Aperturas por cargo. Leads y territorio pendientes. Sin Lead Scoring, Embudo, Pipeline ni empresa. | ✅ Fase 3 (D24–D28) |
| R18d | Formato del mockup aprobado: una sola vista; barra de filtros estándar (cifras, período, filtros, limpiar); transparencia de datos; filtro de campañas; resumen del mes; anillos; salud con 6 tarjetas; mejor campaña, cargo, país y peor entrega; gráficas; embudo; ranking con muestra. Sin Comparar campañas. Un solo filtro de cargo. | ✅ Fase 3 (D29–D32) |
| R19 | Pestañas Redes sociales y Otros: "Pendiente de fuente de datos". | ✅ Fase 3 → reemplazado por D31: sin pestañas; Redes sociales y Otros no se muestran hasta tener fuente |
| R19a | Pestaña Redes con datos (Excel de Gaby vía Render) y pestaña "Resumen". | ⏸️ Pendiente |
| R20 | Colores: rojo solo para lo crítico, amarillo = atención, verde = bien, azul/gris = neutro. Estilos con prefijo `.mkt-`. | ✅ Fase 3 (D22) |

## Cruce con Prospekt IA

| # | Requisito | Estado |
|---|---|---|
| R21 | Calificados por campaña, cruzando los correos con los leads calificados de Prospekt IA en el servidor, sin contar dos veces a la misma persona. | ⏳ Fase 4 · **bloqueado**: la API de Prospekt IA no trae el correo del lead |

## Cierre

| # | Requisito | Estado |
|---|---|---|
| R22 | Documentación completa y Pull Request. | ⏳ Fase 5 |

## Pendiente por falta de datos

No se muestran en el dashboard hasta que existan los datos (D33).

| # | Qué | Qué falta |
|---|---|---|
| P1 | Leads generados y leads calificados por campaña | Saber en qué sistema se registran y que ese sistema guarde el correo del lead, para cruzarlo con los correos de la campaña. Hoy Prospekt IA no lo guarda. |
| P2 | Metas (campañas por mes, % de apertura, % de clic) | Que Marketing defina las metas de RED. Hoy los anillos usan una referencia general B2B, que no es la meta. |
| P3 | Campañas programadas | Una fuente que diga qué campañas están programadas y cuándo; el reporte de Brevo solo trae campañas ya enviadas. |
| P4 | Territorio por comercial (vendedor) | Que el ingeniero aclare qué es "territorio por comercial" y de dónde sale (probablemente del catálogo de campañas). |
| P5 | País real del destinatario | Hoy el 82 % de los envíos tiene país "Desconocido", porque el país se deduce de la terminación del correo (.gt / .sv). Hace falta el país en la base de contactos. |
