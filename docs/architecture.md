# Arquitectura

## Visión General

Chattering es una aplicación de escritorio (Electron) que consolida los chats de múltiples plataformas en una única interfaz. Funciona con un **proceso principal de Electron** que gestiona las ventanas y un **proceso hijo de Node.js** que actúa como servidor y se comunica con las APIs de las plataformas.

```text
┌─────────────────────────────────────────────────────────┐
│  Electron (main.js)                                     │
│  - Crea y gestiona todas las ventanas de la aplicación.  │
│  - Maneja el IPC para la comunicación entre ventanas.    │
│  - Inicia y supervisa el proceso del servidor.           │
└───────────────────────┬─────────────────────────────────┘
                        │ fork()
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Servidor (server.js)                                   │
│  - Proceso Node.js independiente.                        │
│  - Express para servir archivos estáticos y una API REST.│
│  - Socket.IO para emitir eventos en tiempo real al       │
│    frontend.                                             │
│  - Se conecta a las plataformas (Twitch, TikTok, etc.).  │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   tmi.js         tiktok-live    youtube-chat
   (Twitch)       (TikTok)       (YouTube)
```

## Proceso Principal (main.js)

- **Ventanas**: Gestiona `mainWindow` (el chat principal), `settingsWindow` (configuración), `popupWindows` (tarjetas de usuario) y la ventana de `changelog`.
- **IPC**: Define los manejadores para la comunicación entre procesos (`loginTiktok`, `saveSettings`, etc.). Estos solo son accesibles desde el código de renderizado a través de `preload.js`.

## Servidor (server.js)

- Se ejecuta como un proceso hijo (`fork('server.js')`) para no bloquear el hilo principal de Electron.
- **Express**: Sirve el directorio `public/` (frontend), gestiona las rutas de la API REST (`/api/*`) y el callback de OAuth para Twitch.
- **Socket.IO**: Emite el historial de chat al conectar y luego envía nuevos mensajes (`msg`) y eventos (`evento`) al cliente en tiempo real.
- **Plataformas**: Cada plataforma se inicializa con un objeto de dependencias que le permite comunicarse con el servidor (ej. `emitMsg`, `emitEvento`).

## Frontend (public/)

La aplicación principal del chat ha sido **refactorizada a una arquitectura modular** para mejorar la separación de responsabilidades. Cada archivo tiene un propósito claro:

- **`index.html`**: La ventana principal. Contiene la estructura HTML y carga todos los scripts necesarios.
- **`main-app.js`**: El punto de entrada principal del frontend. Inicializa la aplicación, gestiona la configuración, los atajos de teclado y la conexión inicial del socket.
- **`socket-handling.js`**: Define cómo el cliente maneja los eventos recibidos del servidor a través de Socket.IO (`msg`, `evento`, `status`, etc.).
- **`chat-rendering.js`**: Se encarga exclusivamente de renderizar los mensajes y eventos en el DOM del chat.
- **`chat-input.js`**: Gestiona toda la lógica relacionada con el campo de entrada de texto, incluyendo el envío de mensajes, autocompletado de emotes y el historial de mensajes enviados.
- **`dock.js`**: Controla la lógica del "dock" de eventos (follows, subs, etc.) en la parte superior de la ventana.
- **`layout.js`**: Maneja los componentes de la interfaz de usuario que no son ni el chat ni el dock, como la barra de título, la barra de filtros y el cambio de tamaño de los paneles.
- **`emote-handling.js`**: Lógica para el parseo y la gestión de emotes.
- **`sound-handling.js`**: Reproducción de sonidos para notificaciones.
- **`globals.js`**: Variables globales y constantes utilizadas en toda la aplicación cliente.
