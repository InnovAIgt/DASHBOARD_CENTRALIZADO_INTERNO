# Pestaña Mailing (borrador)

> Borrador. Lo marcado «por confirmar» todavía no está decidido. Estado de los accesos: [PENDIENTES.md](PENDIENTES.md).

## 1. Qué pidió el ingeniero

- Campañas **hechas** y **programadas**.
- Vista **general** y **por territorio de cada comercial**.
- Indicadores: **entrega**, **apertura**, **lectura** y **leads**.

## 2. Regla de nombres de campaña

```
código correlativo - cargo - sector - asunto
```

| Parte | Qué es | Valores |
|---|---|---|
| Código correlativo | Número de la campaña, con ceros a la izquierda | `001`, `002`, … |
| Cargo | A quién va dirigida | `GG` = Gerente General · `GF` = Gerente Financiero · `GO` = Gerente Operativo |
| Sector | Sector de las empresas | Texto en mayúsculas, p. ej. `SEGURIDAD` |
| Asunto | Asunto del correo | Texto libre |

Ejemplo: **`001-GG-SEGURIDAD-Asunto`**.

El dashboard saca el **cargo** y el **sector** del nombre de la campaña.

**Campañas viejas que no cumplen la regla** (por ejemplo «GERENTE GENERAL NOVIEMBRE 5»):
- El cargo se **deduce del nombre** cuando trae el cargo escrito completo («GERENTE GENERAL» → GG,
  «GERENTE FINANCIERO» → GF, «GERENTE OPERATIVO» → GO).
- Si no se puede deducir, el cargo queda **«Sin clasificar»**. El sector queda «Sin clasificar».
- No se adivina nada más del nombre.

La regla se le entrega a Marketing para las campañas nuevas (PENDIENTES).

## 3. Definiciones

Fuente: archivo de criterios de mailing de Keily (`criterios_mailing.txt`). El 20/11 no estaba en la ruta indicada;
el detalle se tomó de las reglas que ya estaban programadas en el Mailing anterior (mismos criterios). Por confirmar
contra el archivo.

**Estado final de cada persona:** gana el **último evento con fecha** entre entrega, rebote temporal y rebote
permanente. Si hay empate de hora, gana el rebote (y entre rebotes, el permanente). Cada persona queda en un solo
estado: entregado, rebote temporal, rebote permanente o sin estado.

**Rebotes: CORREGIR / MANTENER** (según el motivo del rebote):
- **CORREGIR**: el correo no existe o el servidor lo rechaza siempre (rebote permanente). Hay que corregirlo con el
  ejecutivo o quitarlo de la lista.
- **MANTENER**: causa pasajera (buzón lleno, servidor caído, rebote temporal). Se mantiene en la lista.
- La lista exacta de motivos y su clasificación: por confirmar contra el archivo de criterios.

**Apertura:**
- **Registrada**: la persona abrió el correo (tiene fecha de apertura).
- **Automática (Apple MPP)**: sin fecha de apertura, pero con aperturas que hace sola la función de privacidad del
  iPhone (Mail Privacy Protection). **No** cuenta como apertura.
- **No registrada**: no hay ninguna apertura.

**Clic registrado:** la persona hizo clic en al menos un enlace. Puede incluir clics automáticos de antivirus.

**Tasas:**

| Tasa | Fórmula |
|---|---|
| Entrega | entregados ÷ enviados |
| Apertura | aperturas registradas ÷ entregados |
| Clic | personas con clic registrado ÷ entregados |
| Lectura | **por confirmar con el ingeniero** |

**Semáforo de entrega:**

| Tasa de entrega | Color |
|---|---|
| 100 % | Verde |
| 90 % a menos de 100 % | Amarillo |
| Menos de 90 % | Rojo |

## 4. Territorio por comercial

Ya está definido:
1. Cada correo de la campaña se compara (en **minúsculas y sin espacios**) con las columnas de correo **GG**, **GF** y
   **GO** de la base de **Cumplimiento de Clientes**.
2. De la fila que coincide sale el **ejecutivo** (comercial), con **País + Código de cliente**.
3. Así cada campaña se puede ver en general y por el territorio de cada comercial.

La base viene de la app **CumplimientoClientes** (Supabase). **Pendiente:** el permiso de lectura, que da Keily.
Mientras no esté, no se conecta a ningún Supabase.

Por confirmar: qué se muestra con los correos que no coinciden con ningún cliente (p. ej. «Sin ejecutivo»).

## 5. Leads

- Un lead es **calificado** si el bot de WhatsApp le da **75 puntos o más**, y **no calificado** si le da **menos de 75**.
- Después pasa a un **CRM**. Los **calificados** alimentan el embudo de **Flujo de ventas**.
- Leads por campaña: hay que cruzar el lead con los correos de la campaña. La API de Prospekt IA **no trae el correo**
  del lead (revisado el 18/11/2026), por eso se pidió el acceso al CRM o bot (Ismael).
- **Pendiente:** acceso al CRM o bot de leads (Ismael).

## 6. Fuente: API de Brevo

- Se consulta **desde nuestro servidor** con `BREVO_API_KEY` (solo servidor, nunca `VITE_`).
- Con caché en el servidor para no pedirle lo mismo a Brevo en cada visita.
- Por confirmar: si la API de Brevo trae las campañas **programadas** (Keily lo prueba con la llave).
- **Pendiente: llave de Brevo** (falta el código de verificación para crearla; ver PENDIENTES).

## 7. Seguridad

- La pestaña **«Correos por corregir»** muestra correos de personas. Su ruta del servidor **debe pedir el inicio de
  sesión del portal**: no puede quedar pública como la ruta vieja `mailing-detalle`.
- Las rutas de totales (sin correos) no devuelven ningún dato personal.
- El enlace **«IR A CORREGIR»** debe llevar a la app de Cumplimiento de Clientes vigente (ver PENDIENTES).
- Nunca se guardan correos ni datos de clientes en el repo, las pruebas ni las capturas.
