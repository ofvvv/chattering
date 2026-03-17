# Plataformas de Chat

Cada plataforma de chat está encapsulada en su propio módulo en `server/platforms/<nombre>.js`. Todas siguen la misma interfaz simple: `init(deps)`, `connect(config)` y `disconnect()`.

## Dependencias Inyectadas (deps)

Antes de inicializar cualquier plataforma, el `server.js` construye un objeto de dependencias que les permite comunicarse de vuelta con el servidor y el cliente. Este objeto se pasa a la función `init(deps)` de cada plataforma.

- **`emitMsg(data)`**: Envía un mensaje de chat al frontend (cliente).
- **`emitEvento(data)`**: Envía un evento (seguidor, regalo, etc.) al frontend.
- **`updateStatus(platform, isLive)`**: Actualiza el estado "en directo" de la plataforma en la UI.
- **`config`**: El objeto de configuración global de la aplicación.

## Twitch (`twitch.js`)

- **Librería**: Utiliza **tmi.js** para conectarse al chat de Twitch a través de su puerta de enlace IRC.
- **Autenticación**: Requiere un token OAuth que se obtiene mediante un flujo de autorización en el navegador. Con este token, la aplicación puede actuar en nombre del usuario.
- **Capacidades**: Además de leer el chat, puede enviar mensajes y ejecutar un **amplio rango de comandos** de moderación y gestión, como `/ban`, `/timeout`, `/mod`, `/slow`, `/clear`, etc.
- **Badges y Emotes**: Los badges de usuario se obtienen a través de la API de Twitch. Los emotes nativos se procesan a través de los tags de IRC, mientras que los emotes de terceros (7TV, BTTV, FFZ) son gestionados por el frontend.

## TikTok (`tiktok.js`)

- **Librería**: Utiliza **tiktok-live-connector** para conectarse al servicio de Webcast de TikTok.
- **Autenticación**: Implementa un método de **"Login Silencioso"** (`loginTiktokSeamless`). Desde la configuración, se abre una ventana de Electron oculta donde el usuario inicia sesión en TikTok. La aplicación intercepta la cookie `sessionid` de esa sesión, lo que permite una conexión estable y evita los bloqueos de la API pública.
- **Reconexión**: Si el streamer no está en vivo, la librería reintenta la conexión automáticamente a intervalos regulares sin notificar al usuario, para conectarse tan pronto como comience la transmisión.

## YouTube (`youtube.js`)

- **Librería**: Utiliza **youtube-chat** para monitorear el chat de una transmisión en vivo.
- **Conexión**: Identifica automáticamente el ID del directo activo a partir del `@handle` del canal del usuario.
- **Emotes**: Es capaz de extraer los emotes personalizados de YouTube directamente del chat y enviar las URLs de las imágenes al frontend dentro del payload del mensaje (`ytEmotes`), permitiendo su renderizado nativo.
- **Reconexión**: Al igual que TikTok, si no hay un directo activo, reintenta la conexión de forma silenciosa en segundo plano.

## Cómo Añadir una Nueva Plataforma

1.  Crear el nuevo archivo de script en `server/platforms/nuevaplataforma.js`.
2.  En ese archivo, exportar las tres funciones requeridas: `init(deps)`, `connect(config)` y `disconnect()`.
3.  En `server.js`, importar el nuevo archivo y añadirlo al ciclo de vida de la aplicación (en `initPlatforms` y `reconnectAll`).
4.  Actualizar la configuración (`config.json`) y la interfaz de usuario (`settings.html`) para incluir las opciones de la nueva plataforma.
