# Bitácora · Marketing por canales

Rama de trabajo: `feature/marketing-mailing`

---

## Fase 0 · Revisión del repositorio — 16/11/2026 ✅

**Qué se hizo:** solo lectura; no se cambió ningún archivo.
- Patrón a seguir: `/api/marketing/reuniones`, es decir `server/` + `api/` + `server.ts`.
- La ruta nueva se registra antes de la regla `/api/*` → "Endpoint no encontrado".
- El menú se arma en `PortalLayout.tsx`, área MARKETING.
- La API de Prospekt IA tiene 40 campos y **ninguno es el correo del lead**.
- Los 3 CSV locales tienen el formato esperado y sus filas coinciden con los enviados de control.

**Decisiones de Keily:**
- dejar "Campañas de correo" sin tocar;
- dos cifras por campaña (Total en Brevo / sin internos);
- "TEST" como palabra completa;
- mes = primera fecha de envío;
- Fase 4 pendiente del correo en Prospekt IA;
- "fuente no configurada" en Vercel/Docker hasta la Fase 2.

---

## Fase 1 · Fuente local + cálculos + ruta — 16/11/2026 ✅

Keily probó `/api/marketing/mailing`: se ven las 3 campañas y ningún correo. Commit aprobado.

**Qué se hizo:**
- `server/marketingCanales/reglas.js` (nuevo): lista editable de pruebas, internos, país y mínimo de datos.
- `server/marketingCanales/brevoCsv.js` (nuevo): lee un CSV de Brevo y entrega filas estándar.
- `server/marketingCanales/combinarArchivos.js` (nuevo): junta todos los CSV; si una campaña se repite, gana el más reciente.
- `server/marketingCanales/fuenteLocal.js` (nuevo): fuente "carpeta local".
- `server/marketingCanales/calculos.js` (nuevo): métricas por campaña, mes, país, totales y exclusiones.
- `server/marketingMailing.js` (nuevo): une las piezas y arma la respuesta con candado de privacidad.
- `api/marketing/mailing.js` (nuevo): la ruta en Vercel.
- `server.ts`: la ruta en local y Docker, antes de la regla `/api/*`.
- `.env.example`: `MARKETING_LOCAL_CSV_DIR=` vacía.
- `.gitignore` y `.dockerignore`: `*.csv` y `*.CSV`.
- `docs/marketing-canales/`: README, REQUISITOS, DECISIONES (D1–D14) y esta bitácora.

**Pruebas:**
- Números de control con los 3 CSV reales: todos cuadran (ver tabla abajo).
- 37 casos con datos inventados, 0 fallas:
  - campañas de prueba;
  - internos y país;
  - fechas;
  - campaña repetida en dos archivos;
  - archivos ignorados;
  - filas malas;
  - comillas;
  - archivo Latin-1;
  - correos repetidos;
  - "pocos datos";
  - sin fuente;
  - carpeta inexistente;
  - POST.
- `npm run lint` (verificación de tipos): sin errores.
- Ruta real con `npm run dev`: HTTP 200, `no-store`, ningún "@" en la respuesta; POST → 405.

| Campaña | Enviados | Aperturas reales | Personas con clic (Brevo → sin internos) |
|---|---|---|---|
| #74 Gerente General | 169 ✅ | 28 ✅ | 1 → 1 ✅ |
| #75 Gerente Financiero | 371 ✅ | 62 ✅ | 5 → 5 ✅ |
| #76 Gerente Operativo | 314 ✅ | 57 ✅ | 6 → 5 ✅ (1 interno) |

**Qué no se tocó:**
- Flujo de ventas;
- "Campañas de correo";
- otros dashboards;
- `package.json` y `vercel.json`;
- Supabase.

---

## Pendientes

- **Pedir a Prospekt IA que guarde el correo del lead para el cruce de la Fase 4.**
- Retirar "Campañas de correo" (`mailing-campanas.html`) en otro PR (D13).

### Para la Fase 3 (pantalla) — anotado el 16/11/2026, no cambiar antes

- `totalAperturasBrevo` y `totalClicsBrevo` **no coinciden** con la pantalla de Brevo. Ejemplo:
  en la #75, Brevo muestra 94 aperturas y 17 clics, pero el CSV da 109 y 6. En la pantalla:
  - **no** decir "como Brevo";
  - usar "Aperturas totales (incluye repetidas y automáticas)" y "Clics en enlaces distintos";
  - agregar una nota de que la pantalla de Brevo usa otra fórmula.
- El **82 % de los envíos tiene país "Desconocido"**. Mostrar ese aviso y **no** destacar
  comparaciones por país.

---

## Cambios solicitados

| Fecha | Pedido | Dónde quedó |
|---|---|---|
| 16/11/2026 | "Campañas de correo" no usa la API de Brevo: se alimenta con archivos y localStorage. No usar `VITE_BREVO_API_KEY`. | D13 |
| 16/11/2026 | Verificar los patrones de prueba con nombres reales. | D6 |
| 16/11/2026 | Anotar como pendiente pedir el correo del lead a Prospekt IA. | Pendientes |
| 16/11/2026 | `infored.com.sv` es externo: se deja así. | D7 |
| 16/11/2026 | En pantalla no decir "como Brevo" (las cifras no coinciden con la pantalla de Brevo); avisar del 82 % de país "Desconocido". | Para la Fase 3 |
