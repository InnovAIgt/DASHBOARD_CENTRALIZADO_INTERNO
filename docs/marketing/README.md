# Marketing · Flujo de ventas (versión 2)

> Responsable: Keily García · Inicio: 11 de noviembre de 2026
> Estado: **en construcción**. El Flujo de ventas actual sigue funcionando mientras tanto.

## ¿Qué es?

Es el dashboard que muestra cómo avanzan los **leads calificados** asignados a cada
vendedor, desde que se le asignan hasta que se cierran. Permite ver, por país y por
vendedor, en qué etapa está cada lead y en qué etapa se pierden.

Esta versión 2 reemplaza a `public/dashboards/marketing/flujo-ventas.html`. Se
reconstruye por los cambios que pidió el ingeniero en la reunión de seguimiento del
11/11/2026 (ver [REQUISITOS.md](REQUISITOS.md)).

## ¿De dónde salen los datos?

De la API de **Prospekt IA** (`/api/metrics/reuniones`), consultada **en vivo** cada vez
que alguien abre el dashboard. Es la misma API y la misma lógica que usa el repo
`InnovAIgt/DashboardLeads` (vista "Dashboard General").

```
 Navegador (la pantalla del dashboard)
     │  pide  /api/marketing/reuniones?offset=0   ← sin llave
     ▼
 Función del centralizado (Vercel)  →  api/marketing/reuniones.js
     │  agrega la llave RED_API_KEY (guardada en Vercel, nunca en el código)
     ▼
 Prospekt IA  →  https://prospektia.red.com.sv/api/metrics/reuniones
     │  responde con los leads en páginas de 50
     ▼
 La pantalla calcula los indicadores y dibuja las gráficas
```

**Por qué así:** la llave de Prospekt IA nunca llega al navegador (nadie la puede ver
con F12) y no hace falta un robot ni una base de datos para lo básico.

## Archivos de este módulo

| Archivo | Qué hace |
|---|---|
| `api/marketing/reuniones.js` | Función de Vercel: el "mesero" que llama a Prospekt IA con la llave escondida |
| `server/marketingReuniones.js` | La misma lógica, compartida para que también funcione en local (`npm run dev`) |
| `docs/marketing/` | Esta documentación |

*(La tabla se irá completando en cada paso.)*

## Configuración necesaria

| Variable | Dónde | Para qué |
|---|---|---|
| `RED_API_KEY` | Vercel → Settings → Environment Variables (y `.env.local` para trabajar en local) | Llave de la API de Prospekt IA |

⚠️ **Nunca** ponerle el prefijo `VITE_`: todo lo que empieza con `VITE_` se mete dentro
de la página y cualquiera lo puede ver.

## Cómo probar la conexión

Con el proyecto corriendo (`npm run dev` en local, o en una versión de prueba de Vercel),
abrir:

```
/api/marketing/reuniones?offset=0
```

- Si responde una lista de leads → la conexión funciona.
- Si dice `RED_API_KEY no está configurada` → falta guardar la llave.
- Si responde `502` → Prospekt IA no contestó.

## Documentos relacionados

- [REQUISITOS.md](REQUISITOS.md) — lo que pidió el ingeniero y si se puede hacer.
- [DECISIONES.md](DECISIONES.md) — cada decisión tomada, con fecha y motivo.
- [BITACORA.md](BITACORA.md) — qué se hizo en cada paso.
- [RETIRO_VERSION_ANTERIOR.md](RETIRO_VERSION_ANTERIOR.md) — cómo se retira el dashboard viejo sin romper nada.
