# APIs Internas y Comunicación

## IPC (Electron Main ↔ Frontend)
Expuesto en `window.electronAPI`.
- `getConfig()` / `saveConfig(cfg)`: Lee/Escribe `config.json`.
- `loginTiktok()`: Abre ventana oculta, captura `sessionid` y autodetecta el `@usuario`.
- `loginTwitch()`: Abre el navegador para el flujo OAuth de Twitch.
- `previewSettings(partial)`: Aplica cambios visuales en tiempo real sin guardar.

## Socket.io (Servidor ↔ Frontend)
- **Emite el Servidor:**
  - `msg`: Un nuevo mensaje de chat. Payload: `{ plat, user, text, avatar, badges, ytEmotes... }`
  - `evento`: Alertas (Follow, Gift, Sub, Raid).
  - `status`: Estado de conexión de las plataformas (`{ TT: true, YT: false, TW: true }`).
- **Emite el Cliente:**
  - `req_user_hist`: Solicita el historial de mensajes de un usuario específico para mostrar en su tarjeta de perfil (Usercard).

## Endpoints REST (Servidor Local)
- `POST /api/send-message`: Envía un mensaje o comando a Twitch.
- `GET /api/twitch/auth-status`: Polling que hace el frontend para saber si el usuario ya autorizó la app en el navegador.