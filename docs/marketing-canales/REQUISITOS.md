# Requisitos · Marketing por canales

Pedido por Keily García el 16/11/2026. Estado: ✅ hecho · 🔄 en curso · ⏳ pendiente.

## Diseño

| # | Requisito | Estado |
|---|---|---|
| R1 | Tres piezas separadas: fuente → cálculos → ruta/pantalla. Cambiar la fuente no toca lo demás. | ✅ Fase 1 |
| R2 | La fuente entrega un formato estándar: una fila por persona por campaña. | ✅ Fase 1 |
| R3 | Funciona en local, Vercel y Docker. | ✅ Fase 1 (en Vercel/Docker: "fuente no configurada" hasta la Fase 2) |

## Fuente (CSV de Brevo)

| # | Requisito | Estado |
|---|---|---|
| R4 | Leer CSV de Brevo: separador `;`, fechas `DD-MM-YYYY HH:mm:ss`, columnas de enlace variables. | ✅ Fase 1 |
| R5 | Identificar la campaña por Campaign ID, no por el nombre del archivo. | ✅ Fase 1 |
| R6 | Leer y acumular todos los CSV de la carpeta. Campaña repetida → archivo más reciente. | ✅ Fase 1 |
| R7 | Carpeta local `MARKETING_LOCAL_CSV_DIR`. | ✅ Fase 1 |
| R8 | Google Drive con cuenta de servicio (`GOOGLE_SERVICE_ACCOUNT_JSON`, `MARKETING_DRIVE_FOLDER_ID`), caché de ~15 min. | ⏳ Fase 2 |

## Cálculos

| # | Requisito | Estado |
|---|---|---|
| R9 | Enviados, entregados, rebotes duro y suave, aperturas reales, solo apertura automática, personas con clic, totales "como Brevo", bajas y quejas. | ✅ Fase 1 |
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
| R18 | Menú Marketing → "Marketing por canales". Pestaña Mailing: totales, tabla de campañas, evolución mensual, exclusiones y explicación de cálculos. | ⏳ Fase 3 |
| R19 | Pestañas Redes sociales y Otros: "Pendiente de fuente de datos". | ⏳ Fase 3 |
| R20 | Colores: rojo solo para lo crítico, amarillo = atención, verde = bien, azul/gris = neutro. Estilos con prefijo `.mkt-`. | ⏳ Fase 3 |

## Cruce con Prospekt IA

| # | Requisito | Estado |
|---|---|---|
| R21 | Calificados por campaña, cruzando los correos con los leads calificados de Prospekt IA en el servidor, sin contar dos veces a la misma persona. | ⏳ Fase 4 · **bloqueado**: la API de Prospekt IA no trae el correo del lead |

## Cierre

| # | Requisito | Estado |
|---|---|---|
| R22 | Documentación completa y Pull Request. | ⏳ Fase 5 |
