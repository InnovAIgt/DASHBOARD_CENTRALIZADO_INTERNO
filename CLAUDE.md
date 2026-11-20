# Reglas para trabajar en este repositorio

Portal corporativo interno de RED Intelfon (dashboards de Ingresos, Marketing, Ventas, Bodega, Servicio al Cliente y
otros). Estas reglas son permanentes y valen para cualquier tarea.

## Comunicación
- Responder **siempre en español**.
- Explicar de forma sencilla. Si hace falta una palabra técnica, explicarla en la misma frase.
- Si falta información, **preguntar**. No suponer ni inventar datos, nombres, cifras ni reglas.
- Al terminar una tarea, explicar:
  1. qué se hizo,
  2. qué archivos cambiaron,
  3. qué debe revisar Keily.

## Antes de cambiar algo
1. Revisar primero (leer el código y la documentación relacionada).
2. Mostrar un plan paso a paso.
3. Esperar el **«sí»** de Keily antes de cambiar código o documentos.

## Git
- **Nunca** trabajar directo en `main`. Cada trabajo va en su propia rama.
- **Nunca** hacer `push`, `merge` ni abrir un Pull Request sin que Keily lo pida.
- **Nunca** usar `git branch -D`, `git reset --hard` ni borrar un `stash` sin permiso.
- Una rama nueva creada desde `main` **no** debe quedar siguiendo a `origin/main` (para que un push nunca vaya a `main`).

## Supabase
- **No** consultar ni modificar **ningún** proyecto de Supabase sin permiso de Keily (ni lecturas, ni funciones, ni
  permisos, ni datos).

## Llaves y datos privados
- **Nunca** poner llaves, tokens ni contraseñas en el código, en los documentos ni en la conversación. Solo se
  mencionan los **nombres** de las variables.
- Las variables que usa solo el servidor **no** llevan el prefijo `VITE_` (todo lo que empieza con `VITE_` llega al
  navegador y cualquiera lo puede ver).
- En `.env.example` van solo los nombres, con valores vacíos.
- **Nunca** subir al repositorio:
  - `.claude/`, `.vscode/`, `.kiro/`
  - `.env.local` (ni ningún `.env` con valores)
  - archivos JSON de llaves (por ejemplo, cuentas de servicio de Google)
  - CSV ni Excel con datos
  - archivos de `C:\Users\KeilyGarcia\Downloads\datos-marketing\` (traen datos de clientes; se pueden leer, nunca
    copiar al repo)
- Las pruebas y los ejemplos usan **datos inventados**. Nunca correos ni datos reales de clientes, tampoco en capturas.

## Qué no tocar
- **No** tocar Flujo de ventas, Servicio al Cliente (SAC), Flash de altas ni Bodega, salvo que Keily lo pida.

## Dashboard de Marketing
- Se documenta en `docs/marketing/v2/` (README, MAILING, REDES, PENDIENTES y BITACORA).
- Cada avance se anota en `docs/marketing/v2/BITACORA.md`, con fecha.
- Cada vez que algo se pide, se resuelve o cambia de estado, se actualiza `docs/marketing/v2/PENDIENTES.md`.
- Flujo de ventas tiene su propia documentación en `docs/marketing/` (no es parte del dashboard v2).
