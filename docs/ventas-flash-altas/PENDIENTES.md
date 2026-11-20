# Pendientes · Flash de altas

| # | Pendiente | Qué falta | De quién |
|---|---|---|---|
| 1 | **Vendedores en 0** | Ya salen en 0 los que tienen altas en los datos pero no en el período elegido (D7). Faltan los que **nunca** vendieron: hace falta un **catálogo de vendedores** (código SAN, nombre, país, grupo comercial, activo). | Ventas |
| 2 | **Ingreso promedio: confirmar definiciones** | Ya está en pantalla con el diseño aprobado (D6): valor **mensual** ÷ equipos, grupo comercial = **jefe**. Ventas debe confirmar que "jefe" es el grupo comercial y si el ingreso debe ser mensual o del contrato (× meses). | Ventas |
| 3 | **Ventas de leads calificados vs. no** | No hay un dato en común entre SAN/Workflow y Prospekt (NIT, teléfono, correo o ID). Pista: el `codigo` de algunas preofertas empieza con `LD…`, el formato de los leads de Prospekt; si Workflow lo guardara siempre, y SAN guardara el número de preoferta, se podría cruzar. | TI |
| 4 | **Número de pedido o preoferta en SAN** | Para confirmar o cambiar la regla PROVISIONAL de Ventas (cliente + fecha + vendedor). ¿`flashApi/altas` puede mandar el pedido/preoferta de cada alta? | TI / SAN |
| 5 | **`datos.json` público con nombres de clientes** | Mover a Supabase o a una ruta protegida (ya está planeado en el repo del robot: `documentacion/pendiente-mover-datos-a-supabase.md`). | TI |
| 6 | **Cambiar la llave de Workflow** | Estuvo escrita en páginas públicas y en el historial del repositorio. Generar una nueva y ponerla en `WORKFLOW_API_KEY` (Vercel Preview y Production, `.env.local`, Docker). | TI |
| 7 | **Meta del semáforo por ventas** | **Ventas debe definir la meta por ventas.** El semáforo de Ejecutivo × mes (50 / 20) se pensó para altas ≈ equipos; con «Contar por: Ventas» las celdas van sin color hasta que exista esa meta. | Ventas |
