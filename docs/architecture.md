# Arquitectura de Chattering

## 1. Proceso Principal (Electron - `main.js`)
Es el corazón de la app de escritorio.
- Gestiona la creación de ventanas (`index.html`, `settings.html`, `setup.html`).
- Maneja el sistema de actualizaciones automáticas (`electron-updater`).
- Expone funciones seguras al frontend mediante `preload.js` (IPC).
- **Levanta el servidor local:** Hace un `fork()` de `server.js` al iniciar.

## 2. Servidor Local (Node.js - `server.js`)
Se ejecuta en segundo plano (usualmente en `http://localhost:3000`).
- **Express:** Sirve endpoints locales (`/api/send-message`, `/api/twitch/auth-status`).
- **Socket.io:** Emite eventos en tiempo real (`msg`, `evento`, `status`) hacia el frontend.
- **Plataformas:** Inicializa las conexiones con Twitch, YouTube y TikTok.
- **Base de datos:** Usa `sql.js` (SQLite en memoria/archivo) para guardar el historial de usuarios y likes.

## 3. Frontend (HTML/JS/CSS)
- **`index.html`:** La vista principal del chat. Se conecta al servidor local vía Socket.io. Renderiza mensajes, emotes y alertas.
- **`settings.html`:** Interfaz de configuración. Se comunica con `main.js` vía IPC para guardar preferencias y reescribir el `config.json`.
- **`setup.html`:** Pantalla de bienvenida para la primera configuración.