# Plataformas de chat

Cada plataforma vive en `server/platforms/<nombre>.js` y sigue la misma interfaz: `init(deps)`, `connect(config)`, `disconnect()`.

## Dependencias inyectadas (deps)

El servidor construye un objeto y lo pasa a cada `init(deps)`:

- **emitMsg(d)** — Envía un mensaje de chat al cliente (Socket.IO `msg`) y opcionalmente lo persiste. `d` incluye `plat`, `type: 'msg'`, `user`, `userId`, `text`, `avatar`, `badges`, `badgeUrls`, `isFirst`, etc.
- **emitEvento(d)** — Envía un evento (seguidor, regalo, sub, raid, etc.) al cliente y puede persistirlo. `d` incluye `plat`, `type`, `user`, `userId`, `text`, `count`, etc.
- **updateStatus(plat, isLive)** — Actualiza el estado “en directo” de la plataforma; el servidor emite `status` a todos los clientes.
- **procesarUsuario(userId, username, platform)** — Registra o actualiza usuario en SQLite; devuelve true si es la primera vez (para marcar “first chatter”).
- **config** — Objeto de configuración (tiktokUser, twitchUser, twitchToken, youtubeChannelId, kickUser, etc.).
- **addLikes** (solo TikTok) — Incrementa el contador global de likes y lo persiste.

## Twitch (twitch.js)

- Usa **tmi.js** para conectarse al chat por IRC.
- Con token OAuth puede escribir mensajes y ejecutar comandos de mod (timeout, ban, etc.).
- Badges: **server/badges.js** (Helix API + CDN). Se usa `room-id` del primer mensaje para cargar badges del canal.
- Eventos: suscripción, resub, subgift, bits (cheer), raid. Todo se emite vía `emitEvento`.
- Estado “live”: se consulta la API de Helix (streams) si hay token; sin token no se marca LIVE.

## TikTok (tiktok.js)

- Usa **tiktok-live-connector** (WebcastPushConnection).
- Eventos: chat, follow, gift, like. Los mensajes se emiten con `emitMsg`; follow/gift/like con `emitEvento`. Los likes actualizan el contador global vía `addLikes`.
- No hay escritura de mensajes; solo lectura.

## YouTube (youtube.js)

- Usa **youtube-chat** (LiveChat).
- Solo lectura: eventos `chat` que se traducen a `emitMsg`. No hay escritura ni moderación desde la app.
- Estado “live”: se considera en vivo cuando llegan mensajes (el SDK no expone un “is live” aparte en la implementación actual).

## Kick (kick.js)

- Usa **pusher-js** para el chat en tiempo real (canal de Pusher del stream).
- Solo lectura por ahora; marcado como “próximamente” en la UI en algunos flujos.

## Añadir una nueva plataforma

1. Crear `server/platforms/nuevaplataforma.js`.
2. Exportar `init(deps)`, `connect(config)`, `disconnect()`.
3. En `server.js`: `const nuevaplataforma = require('./server/platforms/nuevaplataforma')` y en `platDeps()` pasarlo a `init`; en `reconnectAll()` llamar a `nuevaplataforma.connect(config.nuevoParam)` (y `disconnect()` al reconectar).
4. Añadir la clave de config (por ejemplo `nuevoParam`) en `config.json` y en la UI de configuración (settings.html y/o setup.html).
5. En el cliente (index.html): añadir badge/icono y filtros por plataforma si aplica; reutilizar el mismo formato de mensaje (`plat`, `user`, `userId`, `text`, etc.) para que el renderer lo pinte igual que el resto.

Las plataformas no se comunican entre sí; solo con el servidor vía las funciones de `deps`.
