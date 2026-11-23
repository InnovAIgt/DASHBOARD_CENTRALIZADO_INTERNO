# Decisiones · Marketing v2

Decisiones tomadas para el dashboard Canales de marketing, con fecha y quién decidió. Lo más reciente va arriba.
El detalle técnico de cada una está en [MAILING.md](MAILING.md) y su seguimiento en [PENDIENTES.md](PENDIENTES.md).

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
