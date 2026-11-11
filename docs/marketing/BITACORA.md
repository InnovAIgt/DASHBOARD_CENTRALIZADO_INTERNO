# Bitácora · Flujo de ventas v2

Rama de trabajo: `leads`

---

## Paso 0 · Documentación base — 11/11/2026 ✅

**Qué se hizo:** se creó la carpeta `docs/marketing/` con:
- `README.md`: qué es el módulo, de dónde salen los datos y cómo probarlo.
- `REQUISITOS.md`: lo que pidió el ingeniero (R1 a R13) y si se puede hacer.
- `DECISIONES.md`: decisiones D1 a D7.
- `RETIRO_VERSION_ANTERIOR.md`: cómo se retira el dashboard viejo en 3 etapas.
- `BITACORA.md`: este archivo.

**Qué no se tocó:** ningún dashboard existente.

---

## Paso 1 · Conexión segura con Prospekt IA — 11/11/2026 ✅ (falta prueba con llave real)

**Qué se hizo:**
- `server/marketingReuniones.js` (nuevo): pide una página de leads a Prospekt IA
  agregando `RED_API_KEY` desde el servidor.
- `api/marketing/reuniones.js` (nuevo): función de Vercel que expone
  `GET /api/marketing/reuniones?offset=N`.
- `server.ts`: se agregó la misma ruta para trabajar en local, y ahora también lee
  `.env.local`.
- `.env.example`: se agregó `RED_API_KEY=""` (vacío, sin prefijo `VITE_`).

**Pruebas hechas (en local, sin la llave real):**

| Prueba | Resultado esperado | Resultado |
|---|---|---|
| Consultar sin `RED_API_KEY` | Aviso "RED_API_KEY no está configurada" (500) | ✅ |
| Enviar un POST | Rechazo "Usa GET" (405) | ✅ |
| Llave falsa | Error controlado de conexión (502) | ✅ |
| `npm run build` | Compila sin errores | ✅ |

**Falta:** probar con la llave real en una versión de prueba de Vercel. Para eso hay que
guardar `RED_API_KEY` en Vercel → Settings → Environment Variables.

**Nota encontrada:** `npm install` falla en este repo por un conflicto de versiones que
ya existía (vite 8 pide esbuild 0.28, el proyecto fija esbuild 0.25). Para las pruebas
se usó `npm install --legacy-peer-deps`. No se cambió `package.json`. Avisar al equipo.

**Qué no se tocó:** ningún dashboard existente, `vercel.json`, ni Supabase.
