# APIs Internas

Referencia de los canales de comunicación entre los procesos de la aplicación.

## IPC (Main ↔ Renderer)

Comunicación entre el proceso principal de Electron (`main.js`) y las ventanas de renderizado. La API está expuesta de forma segura en el renderer a través de `window.electronAPI` (definido en `preload.js`).

| Método | Descripción |
|--------|-------------|
| `getConfig()` / `saveConfig(cfg)` | Lee o guarda el objeto de configuración global (`config.json`). |
| `saveSettings(cfg)` | Usado por la ventana de `settings`, guarda la configuración y notifica a la ventana principal para que recargue. |
| `loginTiktok()` | Inicia el **login silencioso** de TikTok. Abre una ventana oculta, espera a que el usuario inicie sesión y extrae la cookie `sessionid` para usarla en la API. |
| `loginTwitch()`| Inicia el **flujo OAuth** de Twitch. Abre el navegador por defecto y espera la autorización del usuario para obtener el token. |
| `previewSettings(partial)` | Aplica una parte de la configuración en la ventana principal para una vista previa en vivo sin guardarla (ej. cambiar opacidad). |
| `resetConfig()` | Restaura la configuración a sus valores por defecto y limpia las sesiones. |
| `openPopup(userData)` | Abre una ventana emergente (usercard) con detalles de un usuario. |

## Socket.IO (Servidor ↔ Cliente)

El cliente frontend se conecta al servidor (`server.js`) a través de WebSockets para recibir datos en tiempo real. 
**URL:** `http://localhost:3000`

### Eventos del Servidor al Cliente

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `history` | `Array<msg>` | El servidor envía el historial de mensajes recientes justo después de la conexión. |
| `status` | `Object` | Notifica si el streamer está `en vivo` en cada plataforma (ej. `{ TT: true, YT: false, TW: true }`). |
| `platform_states` | `Object` | Informa el estado de la conexión con cada API (`loading`, `connected`, `error`). |
| `msg` | `Object` | Un nuevo mensaje de chat. Contiene `plat`, `user`, `text`, `badges`, etc. |
| `evento` | `Object` | Un evento especial como un `follow`, `gift`, `sub`, `raid`, `cheer` o `like`. |

## API REST (Servidor)

Endpoints HTTP disponibles en el servidor (`server.js`) para acciones específicas, principalmente para la comunicación entre el frontend y las plataformas que requieren una acción de escritura.
**Base URL:** `http://localhost:3000`

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/send-message` | **Body**: `{ text, platform, isCommand? }`. Envía un mensaje o un **comando de moderación** (`/ban`, `/timeout`) a través de la cuenta de Twitch conectada. |
| POST | `/api/reconnect` | Fuerza al servidor a releer `config.json` y a reconectar con todas las plataformas. Útil después de cambiar la configuración. |
| GET | `/api/twitch/auth-status` | Usado durante el flujo de login de Twitch para verificar si el usuario completó la autorización OAuth en el navegador. |
| GET | `/api/viewer-count` | Devuelve el número de espectadores actual en el canal de Twitch. |
