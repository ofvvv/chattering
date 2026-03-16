# Plataformas de chat

Cada plataforma vive en `server/platforms/<nombre>.js` y sigue la misma interfaz: `init(deps)`, `connect(config)`, `disconnect()`.

## Dependencias inyectadas (deps)
El servidor construye un objeto y lo pasa a cada `init(deps)`:
- **emitMsg(d)** — Envía un mensaje de chat al cliente.
- **emitEvento(d)** — Envía un evento (seguidor, regalo, sub, etc.) al cliente.
- **updateStatus(plat, isLive)** — Actualiza el estado “en directo” de la plataforma.
- **procesarUsuario(userId, username, platform)** — Registra usuario en SQLite.
- **config** — Objeto de configuración global.

## Twitch (twitch.js)
- Usa **tmi.js** para conectarse al chat por IRC.
- Con token OAuth puede escribir mensajes y ejecutar comandos de mod (`/timeout`, `/ban`).
- Badges: **server/badges.js** (Helix API + CDN).
- Emotes: Los emotes nativos se procesan mediante tags IRC. Los de 7TV/BTTV/FFZ se cargan desde el frontend (`index.html`).

## TikTok (tiktok.js)
- Usa **tiktok-live-connector** (WebcastPushConnection).
- **Seamless Login:** Para evitar límites de API y bloqueos, `main.js` abre una ventana oculta donde el usuario inicia sesión. La app extrae la cookie `sessionid` y el `@usuario` inyectando JS en la página, y se lo pasa a la librería.
- Si el streamer está offline, la librería reintenta la conexión silenciosamente cada 60 segundos sin mostrar errores en la UI.

## YouTube (youtube.js)
- Usa **youtube-chat** (LiveChat).
- Extrae el ID del directo a partir del `@handle` del canal.
- **Emotes:** Extrae las URLs de las imágenes de los emotes nativos de YouTube y las envía al frontend en un array `ytEmotes` para su renderizado.
- Si el streamer está offline, reintenta silenciosamente.

## Añadir una nueva plataforma
1. Crear `server/platforms/nuevaplataforma.js`.
2. Exportar `init(deps)`, `connect(config)`, `disconnect()`.
3. En `server.js`: requerir el archivo, pasarlo a `init` y conectarlo en `reconnectAll()`.
4. Añadir la clave en `config.json` y en la UI (`settings.html`).