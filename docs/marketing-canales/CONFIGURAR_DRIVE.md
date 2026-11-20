# Configurar Google Drive como fuente de Mailing

Guía paso a paso para que `/api/marketing/mailing` lea los CSV de Brevo desde una carpeta de
Google Drive. Sirve en local, en Vercel y en Docker/Coolify.

## Reglas (obligatorias)

1. **Cuenta de la empresa, nunca personal.** La carpeta de Drive y el proyecto de Google Cloud
   deben pertenecer a la cuenta de Google de **MARKETING de RED**, nunca a una cuenta personal:
   los CSV traen correos de clientes.
2. **Permisos mínimos:**
   - el equipo de Marketing puede **subir** archivos (permiso **Editor**);
   - la cuenta de servicio solo puede **leer** (permiso **Lector**).

   El dashboard además pide a Google solo permiso de lectura.
3. **Nunca borrar CSV viejos de la carpeta: la carpeta es el historial.** Si se borra un CSV, esa
   campaña desaparece del dashboard.
4. **La llave (archivo JSON) es secreta:**
   - no se sube al repositorio ni a Drive;
   - no se envía por chat ni por correo;
   - solo se pega en las variables de entorno.

## Paso 1 · Proyecto de Google Cloud

1. Entra a <https://console.cloud.google.com> con la cuenta de **MARKETING de RED**.
2. Crea un proyecto nuevo, por ejemplo `red-marketing-dashboard`.
3. Ve a **APIs y servicios → Biblioteca**, busca **Google Drive API** y presiona **Habilitar**.

## Paso 2 · Cuenta de servicio y su llave

1. Ve a **IAM y administración → Cuentas de servicio → Crear cuenta de servicio**.
2. Nombre: por ejemplo `lector-mailing-dashboard`. **No** le asignes roles: presiona "Continuar" y "Listo".
3. Abre la cuenta creada y copia su correo (termina en `…iam.gserviceaccount.com`). Lo usarás en el Paso 3.
4. Pestaña **Claves → Agregar clave → Crear clave nueva → JSON**. Se descarga un archivo `.json`.
5. Guarda ese archivo en un lugar privado de tu computadora, **fuera** de la carpeta del proyecto.

> Si Google dice que la creación de claves está bloqueada por una política de la organización,
> la tiene que habilitar el administrador de Google Workspace de RED.

## Paso 3 · Carpeta de Drive

1. En el Drive de la cuenta de MARKETING (o en una unidad compartida de la empresa), crea la
   carpeta, por ejemplo `Marketing · Reportes Brevo`.
2. Comparte la carpeta:
   - con el **correo de la cuenta de servicio** del Paso 2, como **Lector**, desmarcando "Notificar";
   - con el equipo de Marketing que sube los reportes, como **Editor**.
3. Copia el **código de la carpeta**: abre la carpeta y copia lo que va después de `/folders/` en
   la dirección. Por ejemplo, en `https://drive.google.com/drive/folders/1AbC…xyz` el código es `1AbC…xyz`.

## Paso 4 · Variables de entorno (solo servidor, sin `VITE_`)

| Variable | Valor |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | La llave del Paso 2: el JSON completo, o mejor **en base64** (un solo renglón). |
| `MARKETING_DRIVE_FOLDER_ID` | El código de la carpeta del Paso 3. |

**Convertir la llave a base64 y copiarla** (PowerShell, cambia la ruta por la tuya):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\ruta\privada\llave.json")) | Set-Clipboard
```

Después pega el texto copiado como valor de la variable.

- **Local:** agrega las 2 variables a `.env.local` y reinicia `npm run dev`. Si también tienes
  `MARKETING_LOCAL_CSV_DIR`, **gana Drive**. Para volver a la carpeta local, deja vacías las de Drive.
- **Vercel:** Project → Settings → Environment Variables. Agrégalas al entorno que corresponda y vuelve a desplegar.
- **Coolify:** en la aplicación, Environment Variables. Márcalas como secretas y reinicia.

## Paso 5 · Probar

Abre `/api/marketing/mailing?actualizar=1`. Debe decir `"tipo": "google-drive"` y mostrar las
mismas cifras que con la carpeta local.

| Mensaje | Qué hacer |
|---|---|
| "Google Drive está a medio configurar: falta …" | Agrega la variable que se indica. |
| "… no es un JSON válido …" / "… dañada o incompleta" | Vuelve a copiar la llave completa (mejor en base64). |
| "Google rechazó la cuenta de servicio …" | La llave fue borrada o revocada: crea una nueva (Paso 2.4). |
| "No se encontró la carpeta de Drive …" | Revisa el código de la carpeta y que esté compartida con la cuenta de servicio. |
| "Drive negó el acceso …" | Habilita la Google Drive API (Paso 1.3). |

## Cómo subir reportes

1. En Brevo, descarga el reporte **por persona** de la campaña (CSV).
2. Súbelo a la carpeta **tal cual**, sin abrirlo ni guardarlo en Excel, porque Excel puede cambiar el separador y las fechas.
3. Si Drive lo convierte en "Hoja de Google", el dashboard lo ignora y lo avisa. Sube el CSV original y desactiva en Drive
   **Configuración → Convertir archivos subidos**.
4. Si vuelves a descargar una campaña (por ejemplo, días después, con más aperturas), súbela también:
   se usa la versión con fecha de modificación más reciente. **No borres la anterior.**
5. El dashboard guarda lo leído por **15 minutos**. Para ver un archivo recién subido, usa `?actualizar=1`.

## Si la llave se filtra

En Google Cloud → la cuenta de servicio → Claves, **borra** esa clave, crea una nueva y
reemplázala en las variables de entorno.
