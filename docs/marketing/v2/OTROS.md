# Otros · APIs de Prospekt IA

Lo que se sabe de las APIs de Prospekt IA (revisado por Keily el 24/11/2026). Sin datos personales: solo nombres de
campos, conteos y valores de origen. Cómo se usan en Mailing: [MAILING.md](MAILING.md), sección 11.

- La API es **FastAPI**. **No hay documentación pública**: `/api/docs`, `/api/openapi.json` y `/api/redoc` dan
  «Not Found».
- Llave en el encabezado `X-API-Key`. En el portal: `PROSPEKT_API_KEY` (Mailing) y `RED_API_KEY` (Flujo de ventas),
  solo servidor.

## Leads calificados · `GET /api/external/leads-calificados`

- Campos que usa Mailing: `codigo_prospecto`, `email`, `telefono`, `validator_source`, `pais`, `fecha_creado`,
  `hora_creado`, `asesor_nombre`, `status`, `opportunity_stage`.
- **Devuelve los leads dos veces** (en `leads` y en `por_pais`, con claves `sv` y `gt`): se quitan los repetidos
  por `codigo_prospecto`. También trae `metadata` (versión, fecha de la respuesta, total y filtros).
- **Sin páginas:** devuelve todo de una vez, con `limite` (por defecto 1000; Mailing usa 5000). Filtros que acepta:
  `pais`, `desde`, `hasta`, `asesor`, `tipo_reunion` y `limite` (ignora `tipo_lead`).
- `fecha_creado` y `hora_creado` en **UTC**; `fecha_agendada` y `hora_agendada` en hora local del país
  (DECISIONES.md).
- `status`: `cerrado`, `en_proceso`, `stage_2_overdue`. `opportunity_stage`: de 1 a 6.
- Hoy (24/11/2026): **291** calificados. `validator_source`:

| Origen (`validator_source`) | Leads |
|---|---|
| PostIAlo Redes Sociales | 268 |
| PostIAlo Mailing | 6 |
| Página Web | 5 |
| Lead Manual | 5 |
| PBX SV | 5 |
| Voicebot PBX SV | 1 |
| contactanos | 1 |

## Leads no calificados · `GET /api/audit/leads-no-calificados?limit=&offset=`

- **1,523** leads, en `items`, con páginas (`limit` y `offset`). Ignora `detalle=true`.
- Solo trae `client_id`, `client_name`, `client_phone`, `advisor_name`, `created_at` y `created_at_sv`.
- **Sin origen, país ni correo:** no se pueden atribuir a campañas. Se pidió agregar `validator_source` y `pais`
  (PENDIENTES).

## Reparto propuesto por canal

| Canal | Orígenes |
|---|---|
| **Mailing** | PostIAlo Mailing |
| **Redes** | PostIAlo Redes Sociales |
| **Otros** | Página Web, contactanos, Lead Manual, PBX SV, Voicebot PBX SV y los orígenes nuevos |

## Pendiente

- Confirmar si el status «cerrado» / etapa 6 es **venta ganada** (PENDIENTES).
