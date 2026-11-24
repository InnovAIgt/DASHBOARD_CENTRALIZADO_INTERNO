# Decisiones · Marketing v2

Decisiones tomadas para el dashboard Canales de marketing, con fecha y quién decidió. Lo más reciente va arriba.
El detalle técnico de cada una está en [MAILING.md](MAILING.md) y su seguimiento en [PENDIENTES.md](PENDIENTES.md).

## 2026-11-23 · Guardar cargo y objetivo con clave de Marketing

- **Guardar cargo y objetivo protegido con clave de Marketing (sin inicio de sesión), por decisión de Keily,
  23/11/2026.**
- **Cómo:** la clave vive solo en el servidor (`MKT_CLAVE_EDICION`, sin `VITE_`; en `.env.example` solo el nombre).
  El servidor la valida (nunca el navegador), en tiempo constante, y devuelve un permiso firmado de 8 horas que no
  contiene la clave; la pestaña lo recuerda solo mientras esté abierta. Se pide también «Tu nombre», que queda como
  «por <nombre>».
- **Candados:** 5 claves incorrectas en 15 minutos desde la misma dirección bloquean 15 minutos (en Vercel el conteo es
  por instancia, no global; cada fallo además espera 1 segundo). Solo se escribe en `mkt_campana_cargo` del proyecto
  «Dashboard Canales de marketing»; nunca en Cumplimiento de Clientes ni en Brevo. Solo campañas que existen en Brevo.
- **Riesgo aceptado:** quien tenga la clave puede editar sin identificarse de verdad (el nombre lo escribe la persona).
  Para cambiar la clave basta con cambiar la variable (los permisos viejos dejan de valer).

## 2026-11-23 · Objetivo de cada campaña

- **Lista de objetivos creada por Keily (23/11/2026); Marketing puede confirmarlos o cambiarlos.** En este orden; gana
  la primera que coincide (sin mayúsculas ni tildes, por palabra completa y aceptando su plural):
  1. Promover el dashboard de rondas — dashboard, acceso, rondas, plataforma
  2. Control de turnos y personal — turno, supervisor, ronda, anoche, evidencia, guardia
  3. Reducir costos operativos — costo, costos, nómina, gasto, horas, pagando
  4. Mejorar la productividad — productividad, tiempo muerto, producción, a ciegas, operación
  5. Comunicación con radios PTT — PTT, comunicación, radio, radios, flota
  6. Logística y transporte — logística, transporte, ruta, rutas, entrega
  7. Planificación y crecimiento — ampliar, zonas, recursos, crecer, expansión
  8. Validar la base de contactos — validación, verificación, test entregabilidad
- **Cómo se sugiere (nunca vacío):** a) asunto; b) nombre de la campaña; c) contenido del correo (API de Brevo, solo
  lectura; el servidor solo manda el objetivo encontrado, nunca el contenido); d) si nada coincide, «Promoción general
  de RED» con estado «Revisar». Se muestra de dónde salió. Lo elegido a mano gana y queda «Confirmado».
- **Palabra completa:** se compara por palabra completa (con su plural) para que «entrega» no encuentre
  «entregabilidad» ni «entregamos».
- **«Con costo» / «sin costo» en el nombre se ignoran** (decisión de Keily, 23/11/2026): hablan del precio de la
  oferta, no de reducir costos. Esas campañas pasan al contenido del correo (y, si tampoco coincide, a «Revisar»). En
  el asunto, «costo» sigue contando.
- **Las palabras del cargo en el nombre también se ignoran** (decisión de Keily, 23/11/2026): son el destinatario, no
  el tema: gerente, general, financiero, finaciero, finanzas, operaciones, operativo, G.G, G.F, G.O, GG, GF, GO y
  «base completa». En el asunto siguen contando normal.
- El objetivo elegido a mano se guarda como texto libre (Marketing puede escribir otros). Seguimiento: revisar la
  lista con Ismael (PENDIENTES). Lógica en `src/modulos/marketing/marketing-v2/datos/objetivo.js`.

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
