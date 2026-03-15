# Arquitectura

## Visión general

Chattering es una aplicación de escritorio (Electron) que muestra el chat unificado de varias plataformas en una sola ventana. Un servidor Node.js (Express + Socket.IO) se ejecuta en segundo plano y se comunica con las APIs/librerías de cada plataforma; la ventana de Electron solo consume eventos vía WebSocket.

```
┌─────────────────────────────────────────────────────────┐
│  Electron (main.js)                                      │
│  - Crea ventana principal (index.html) y ventanas hijas  │
│  - IPC con preload.js                                    │
│  - Arranca y supervisa el proceso del servidor           │
└───────────────────────┬─────────────────────────────────┘
                        │ fork()
                        ▼
┌─────────────────────────────────────────────────────────┐
│  server.js (proceso hijo)                                 │
│  - Express (estático, APIs REST, OAuth callback)         │
│  - Socket.IO (history, msg, evento, status)              │
│  - Inicializa plataformas (Twitch, TikTok, YouTube, Kick)│
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   tmi.js         tiktok-live    youtube-chat   pusher-js
   (Twitch)       (TikTok)       (YouTube)      (Kick)
```

## Proceso principal (main.js)

- **Ventanas:** `mainWindow` (chat), `settingsWindow` (configuración), `popupWindows` (usercards), y opcionalmente la ventana de changelog tras una actualización.
- **IPC:** Handlers para `get-config`, `save-settings`, `open-settings`, `open-popup`, `get-version`, `quit-and-install`, etc. El renderer solo accede a estos vía `preload.js` (contextBridge).
- **Servidor:** Se arranca con `fork(server.js)` y se le inyecta `CONFIG_PATH` y `PORT` por entorno. Si el servidor cae, el main no lo reinicia automáticamente; la reconexión de Socket.IO en el cliente puede seguir intentando conectar.
- **Auto-updater:** Solo activo cuando la app está empaquetada (`app.isPackaged`). Lee `config.autoUpdateDisabled`; si es false, hace `checkForUpdates()` al iniciar. En `update-downloaded` se muestra la ventana de changelog y luego el usuario puede llamar a `quitAndInstall()`.

## Servidor (server.js)

- **Express:** Sirve `public/`, rutas `/api/*` (send-message, preview, twitch validate, reconnect, etc.) y la ruta de OAuth de Twitch.
- **Socket.IO:** Al conectar, el cliente recibe `history`, `dock_history`, `status`, `likes_init`. Luego recibe `msg`, `evento`, `status` en tiempo real. El cliente puede emitir `req_user_hist` y recibir `res_user_hist`.
- **Plataformas:** Cada plataforma (en `server/platforms/`) se inicializa con un objeto de dependencias (`emitMsg`, `emitEvento`, `updateStatus`, `config`, etc.) y expone `init(deps)`, `connect(...)`, `disconnect()`. El servidor llama a `connect` con la config (usuario/canal) correspondiente.

## Renderer (public/)

- **index.html:** Ventana principal del chat. Carga Socket.IO desde el servidor local, pinta mensajes y eventos, y usa `window.electronAPI` para todo lo que requiera main (config, abrir configuración, popups, abrir enlaces externos).
- **settings.html:** Formulario de configuración; guarda vía `saveSettings` y cierra la ventana. No arranca el servidor; el main aplica la config y puede disparar un reconnect en el servidor.
- **setup.html:** Primer arranque; guarda config mínima y luego el main carga `index.html` y arranca el servidor.

Los estilos compartidos están en `public/style.css`; las clases `.win-main`, `.win-settings`, `.win-setup` delimitan qué reglas aplican a cada ventana.

## Persistencia

- **config.json:** En el `userData` de Electron; lo lee y escribe solo el proceso main (y el servidor lo recibe vía env al iniciar).
- **storage (server/storage.js):** SQLite (sql.js) para usuarios y estado, y archivos JSONL por día para el log de mensajes/eventos. El historial que ve el cliente viene de `getHistory()` / `getUserHistory()` leyendo esos logs.

## Build

- **electron-builder** genera un instalador NSIS para Windows. Los recursos (server.js, server/, public/) se copian a `resources/` en el ejecutable empaquetado. `main.js` y `preload.js` van en la raíz del app. El auto-updater descarga releases desde GitHub (owner/repo configurado en `package.json`).
