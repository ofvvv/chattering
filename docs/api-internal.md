# APIs internas

Referencia breve de los canales IPC y del servidor para desarrollo.

## IPC (main ↔ renderer)

Expuesto en el renderer como `window.electronAPI` (preload.js). Solo los canales listados aquí están permitidos.

| Método | Descripción |
|--------|-------------|
| `getConfig()` | Devuelve el objeto de configuración (config.json). |
| `saveConfig(cfg)` | Guarda la config (setup / flujos iniciales). |
| `saveSettings(cfg)` | Guarda la config desde la ventana de configuración; el main puede cerrar la ventana tras guardar. |
| `getVersion()` | Versión de la app (package.json). |
| `getLastSeenVersion()` / `setLastSeenVersion(v)` | Para mostrar u ocultar el changelog en la ventana principal. |
| `openSettings()` / `closeSettings()` | Abre o cierra la ventana de configuración. |
| `openExternal(url)` | Abre la URL en el navegador del sistema. |
| `openPopup(userData)` | Abre la usercard (popup) con los datos del usuario. |
| `getPopupData()` | Devuelve los datos del popup abierto (para que popup.html los lea). |
| `setAlwaysOnTop(flag)` | Pone la ventana principal siempre encima o no. |
| `previewSettings(partial)` | Envía config parcial a la ventana principal para vista previa en vivo (temas, compacto, etc.). |
| `resetConfig()` | Borra la config y recarga setup. |
| `quitAndInstall()` | (Ventana de actualización) Reinicia e instala la actualización descargada. |
| `on(channel, callback)` | Canales permitidos: `settings-saved`, `popup-data`, `config-updated`, `update-info`. |

## Socket.IO (servidor ↔ cliente)

**Origen:** `http://localhost:3000` (mismo proceso que Express).

### Eventos que el servidor emite al cliente

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `history` | `Array<msg>` | Últimos mensajes al conectar. |
| `dock_history` | `Array<evento>` | Eventos recientes para el dock (follows, gifts). |
| `status` | `{ TT, YT, TW, KK }` (boolean) | Estado “en directo” por plataforma. |
| `likes_init` | — | Inicialización del contador de likes (TikTok). |
| `msg` | `{ plat, type, user, userId, text, avatar, badges, badgeUrls, isFirst }` | Nuevo mensaje de chat. |
| `evento` | `{ plat, type, user, userId, text, count, ... }` | Evento (follow, gift, sub, raid, cheer, like, etc.). |
| `res_user_hist` | `{ uid, h: { prev, curr } }` | Respuesta al historial de un usuario (para usercard). |

### Eventos que el cliente emite al servidor

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `req_user_hist` | `userId` (string) | Pide el historial de mensajes de ese usuario para la usercard. |

## REST (servidor)

Base: `http://localhost:3000`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/send-message` | Body: `{ text, platform, isCommand? }`. Envía mensaje (o comando) al chat de la plataforma (principalmente Twitch). |
| POST | `/api/reconnect` | Vacío. Fuerza recarga de config y reconexión de todas las plataformas. |
| GET/POST | `/api/twitch/validate` | Valida token de Twitch (POST con body `{ token }`). |
| GET | `/api/viewer-count` | Devuelve contador de espectadores (Twitch). |
| GET | `/api/preview_html` | Query `url`. Devuelve metadatos para vista previa de enlaces. |

Las rutas de OAuth de Twitch y el callback están definidas en `server.js`; el flujo de login se inicia desde el cliente (main abre el navegador, el cliente hace polling a `/api/twitch/auth-status` o similar hasta recibir el token).

## Configuración (config.json)

Claves relevantes para el servidor y la app: `tiktokUser`, `youtubeChannelId`, `twitchUser`, `twitchToken`, `kickUser`, `kickChatroomId`, `theme`, `compact`, `avatarShape`, `alwaysOnTop`, `translucent`, `windowOpacity`, `autoUpdateDisabled`, etc. La lista completa y descripción están en el README principal del repositorio.
