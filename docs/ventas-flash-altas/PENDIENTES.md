# Pendientes · Flash de altas

| # | Pendiente | Qué falta | De quién |
|---|---|---|---|
| 1 | **Vendedores en 0** | Hoy la lista sale de quienes tienen ventas en los datos filtrados; el que no vendió no aparece. Falta un **catálogo de vendedores** (código SAN, nombre, país, grupo comercial, activo). | Ventas |
| 2 | **Ingreso promedio por unidad, por grupo comercial y por persona** | Definir "ingreso" (`valnet` mensual o `valnet × meses de contrato`) y si cuentan las líneas con 0 equipos. El **grupo comercial** no viene en SAN (lo más parecido es `anajef` = jefe, 5 valores); sale del catálogo del punto 1. | Ventas |
| 3 | **Ventas de leads calificados vs. no** | No hay un dato en común entre SAN/Workflow y Prospekt (NIT, teléfono, correo o ID). Pista: el `codigo` de algunas preofertas empieza con `LD…`, el formato de los leads de Prospekt; si Workflow lo guardara siempre, y SAN guardara el número de preoferta, se podría cruzar. | TI |
| 4 | **Número de pedido o preoferta en SAN** | Para confirmar o cambiar la regla PROVISIONAL de Ventas (cliente + fecha + vendedor). ¿`flashApi/altas` puede mandar el pedido/preoferta de cada alta? | TI / SAN |
| 5 | **`datos.json` público con nombres de clientes** | Mover a Supabase o a una ruta protegida (ya está planeado en el repo del robot: `documentacion/pendiente-mover-datos-a-supabase.md`). | TI |
| 6 | **Cambiar la llave de Workflow** | Estuvo escrita en páginas públicas y en el historial del repositorio. Generar una nueva y ponerla en `WORKFLOW_API_KEY` (Vercel Preview y Production, `.env.local`, Docker). | TI |
| 7 | **Meta del semáforo por ventas** | **Ventas debe definir la meta por ventas.** El semáforo de Ejecutivo × mes (50 / 20) se pensó para altas ≈ equipos; con «Contar por: Ventas» las celdas van sin color hasta que exista esa meta. | Ventas |
