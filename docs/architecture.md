<!-- omit in toc -->
# Arquitectura de Chattering

Este documento describe la arquitectura de alto nivel de la aplicación, detallando los componentes principales y cómo interactúan.

- [Proceso Principal (main.cjs)](#proceso-principal-maincjs)
- [Proceso de Precarga (preload.js)](#proceso-de-precarga-preloadjs)
- [Servidor Backend (server.js)](#servidor-backend-serverjs)
- [Frontend (public/)](#frontend-public)
  - [Chat Principal (index.html)](#chat-principal-indexhtml)
  - [Ventana de Configuración (settings.html)](#ventana-de-configuración-settingshtml)
- [Activos (assets/)](#activos-assets)

## Proceso Principal (main.cjs)

Es el punto de entrada de Electron. Sus responsabilidades son:

- **Gestión del ciclo de vida de la aplicación:** Abrir y cerrar la app.
- **Creación de ventanas:** Gestiona `BrowserWindow` para la ventana principal, la de configuración y los popups.
- **Comunicación entre procesos (IPC):** Define los canales en `ipcMain` que el frontend utiliza para acceder a funciones del sistema operativo (guardar archivos, abrir links, etc).
- **Arranque del servidor backend:** Inicia `server.js` como un proceso hijo (`fork`).
- **Gestión de la configuración:** Carga y guarda `config.json` en el directorio de datos del usuario.
- **Actualizaciones automáticas:** Maneja `electron-updater` para buscar y notificar nuevas versiones.

## Proceso de Precarga (preload.js)

Actúa como un "puente" seguro entre el frontend (Renderer Process) y el backend (Main Process). Expone funciones específicas de `ipcMain` a través del objeto `window.electronAPI`. Esto es crucial para mantener `contextIsolation` activado y seguro.

## Servidor Backend (server.js)

Es un servidor Express que corre localmente en el puerto 3000, iniciado por `main.cjs`. Sus tareas son:

- **Servir archivos estáticos:** Sirve el frontend (`index.html`, CSS, JS) al `BrowserWindow`.
- **API interna:** Provee endpoints (`/api/...`) para funcionalidades como la reconexión de plataformas o la obtención de contadores.
- **Conexión a plataformas:** Contiene la lógica para conectar con TikTok, Twitch y YouTube. Utiliza un `Socket.io` para comunicar eventos (nuevos mensajes, follows, etc.) en tiempo real al frontend.
- **Manejo de OAuth:** Gestiona el callback de la autenticación de Twitch.

## Frontend (public/)

La aplicación principal del chat ha sido **refactorizada a una arquitectura modular** para mejorar la separación de responsabilidades. Cada archivo tiene un propósito claro:

### Chat Principal (index.html)

- `globals.js`: Declara variables globales y de estado para el chat.
- `socket-handling.js`: Configura la conexión Socket.IO y define los listeners para eventos del servidor (mensajes, alertas).
- `chat-rendering.js`: Contiene la lógica para renderizar mensajes, avatares, badges y aplicar formato.
- `emote-handling.js`: Se encarga de cargar y reemplazar emotes de 7TV, BTTV y FFZ.
- `sound-handling.js`: Gestiona la reproducción de sonidos para notificaciones.
- `layout.js`: Controla elementos de la UI como el dock de eventos, popups y menús contextuales.
- `chat-input.js`: Maneja la barra de entrada de texto, el autocompletado de emotes y el envío de mensajes.
- `main-app.js`: Es el orquestador. Inicializa todos los módulos, maneja la configuración y los hotkeys.

### Ventana de Configuración (settings.html)

Siguiendo el mismo patrón modular, la ventana de configuración se divide en:

- `settings-helpers.js`: Funciones de utilidad pequeñas y genéricas (ej: `set()`, `chk()`).
- `settings-tags.js`: Lógica para renderizar y gestionar las "etiquetas" de palabras bloqueadas y resaltadas.
- `settings-form.js`: Funciones para cargar los datos de la configuración en el formulario (`loadForm`) y para recolectarlos antes de guardar (`collectFormData`).
- `settings-ui.js`: Controla toda la interactividad de la UI, como la navegación del menú lateral, la búsqueda, el cambio de tema y las previsualizaciones.
- `settings-accounts.js`: Maneja los flujos de autenticación de las cuentas (TikTok, Twitch).
- `settings-main.js`: El punto de entrada. Inicializa todos los módulos de la configuración y contiene las funciones de alto nivel para guardar y restablecer.

## Activos (assets/)

Contiene recursos estáticos como el icono de la aplicación.