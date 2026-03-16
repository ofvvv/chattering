# Arquitectura

## Visión general

Chattering es una aplicación de escritorio (Electron) que muestra el chat unificado de varias plataformas en una sola ventana. Un servidor Node.js (Express + Socket.IO) se ejecuta en segundo plano y se comunica con las APIs/librerías de cada plataforma; la ventana de Electron solo consume eventos vía WebSocket.

```text
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
│  - Inicializa plataformas (Twitch, TikTok, YouTube)      │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   tmi.js         tiktok-live    youtube-chat
   (Twitch)       (TikTok)       (YouTube)
##Proceso principal (main.js)
- Ventanas: mainWindow (chat), settingsWindow (configuración), popupWindows (usercards), y ventana de changelog.
- IPC: Handlers para get-config, save-settings, login-tiktok, login-twitch, etc. El renderer solo accede a estos vía preload.js.
##Servidor: Se arranca con fork(server.js). Si el servidor cae, el main no lo reinicia automáticamente; la reconexión de Socket.IO en el cliente intenta reconectar.
- Resource Monitor: Un script dedicado (resource-monitor.js) vigila el consumo de RAM y CPU para evitar memory leaks.
- Servidor (server.js)
- Express: Sirve public/, rutas /api/* y maneja CORS para permitir peticiones desde archivos locales (file://).
- Socket.IO: Al conectar, el cliente recibe history, status, likes_init. Luego recibe msg y evento en tiempo real.
 -Plataformas: Cada plataforma se inicializa con un objeto de dependencias (emitMsg, emitEvento, updateStatus, config).
##Renderer (public/)
- index.html: Ventana principal del chat. Carga Socket.IO, pinta mensajes y eventos.
- settings.html: Formulario de configuración.
- setup.html: Primer arranque; guarda config mínima y luego el main carga index.html.