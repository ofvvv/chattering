# APIs internas

Referencia breve de los canales IPC y del servidor para desarrollo.

## IPC (main ↔ renderer)
Expuesto en el renderer como `window.electronAPI` (`preload.js`).

| Método | Descripción |
|--------|-------------|
| `getConfig()` / `saveConfig(cfg)` | Lee/Guarda la configuración global. |
| `saveSettings(cfg)` | Guarda la config desde la ventana de settings y notifica al frontend. |
| `loginTiktok()` | Abre ventana oculta, captura `sessionid` y autodetecta el `@usuario` inyectando JS. |
| `loginTwitch()` | Abre el navegador para el flujo OAuth de Twitch. |
| `previewSettings(partial)` | Envía config parcial a la ventana principal para vista previa en vivo. |
| `resetConfig()` | Borra la config, limpia cookies de TikTok y recarga setup. |
| `openPopup(userData)` | Abre la usercard (popup) con los datos del usuario. |

## Socket.IO (servidor ↔ cliente)
**Origen:** `http://localhost:3000`

### Eventos que el servidor emite al cliente
| Evento | Payload | Descripción |
|--------|---------|-------------|
| `history` | `Array<msg>` | Últimos mensajes al conectar. |
| `status` | `{ TT, YT, TW }` | Estado “en directo” por plataforma. |
| `platform_states` | `{ TT, YT, TW }` | Estado de conexión (loading, connected, error, disconnected). |
| `msg` | `{ plat, type, user, text, ytEmotes... }` | Nuevo mensaje de chat. |
| `evento` | `{ plat, type, user, text, count... }` | Evento (follow, gift, sub, raid, cheer, like). |

## REST (servidor)
Base: `http://localhost:3000`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/send-message` | Body: `{ text, platform, isCommand? }`. Envía mensaje o comando a Twitch. |
| POST | `/api/reconnect` | Fuerza recarga de config y reconexión de plataformas. |
| GET | `/api/twitch/auth-status` | Polling para saber si el usuario completó el login de Twitch. |
| GET | `/api/viewer-count` | Devuelve contador de espectadores (Twitch). |