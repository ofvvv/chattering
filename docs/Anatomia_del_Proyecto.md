# Anatomía del Proyecto Chattering

Este documento proporciona una descripción exhaustiva de la estructura de archivos y la arquitectura de la aplicación Chattering. Está diseñado para ser el punto de partida para cualquier desarrollador que trabaje en el proyecto.

## Visión General de la Arquitectura

La aplicación se divide en tres componentes principales que se ejecutan en procesos separados:

1.  **Proceso Principal (Main Process):** Es el backend de la aplicación de escritorio, controlado por Electron. Su punto de entrada es `main.cjs`. Se encarga de crear ventanas, gestionar la configuración del sistema operativo, manejar eventos de IPC y orquestar los otros procesos.

2.  **Servidor de Conexión (Server Process):** Es un proceso hijo de Node.js, iniciado por el Proceso Principal. Su punto de entrada es `server.js`. Su única responsabilidad es gestionar las conexiones en tiempo real con las plataformas de chat (Twitch, YouTube, etc.), parsear los mensajes y emitirlos a través de un servidor WebSocket al que el Frontend se conecta.

3.  **Proceso de Renderizado (Renderer Process):** Es el frontend de la aplicación, lo que el usuario ve. Consiste en las ventanas de la aplicación (archivos HTML en la carpeta `public/`). Cada ventana ejecuta su propio conjunto de scripts de JavaScript en un entorno de navegador seguro. La comunicación con el Proceso Principal se realiza exclusivamente a través del canal seguro definido en `preload.js`.

---

## Desglose de Archivos y Carpetas

### <u>Archivos Raíz</u>

-   **`main.cjs` (El Corazón de la App):**
    -   **Función:** Es el punto de entrada principal para Electron. Controla el ciclo de vida de la aplicación, crea y gestiona todas las ventanas (`BrowserWindow`), y define todos los manejadores de IPC (`ipcMain`) que actúan como puentes seguros entre el frontend y el backend del sistema operativo.
    -   **Interacciones Clave:**
        -   Inicia el `server.js` como un proceso hijo (`fork`).
        -   Lee y escribe el archivo `config.json`.
        -   Abre las ventanas de `settings.html`, `index.html`, etc.

-   **`server.js` (El Concentrador de Chat):**
    -   **Función:** Inicia un servidor de Node.js (usando `fork` desde `main.cjs`) que se conecta a las diferentes plataformas de streaming. Unifica los mensajes de chat de todas las fuentes y los retransmite a través de un servidor WebSocket local al que se conecta el frontend (`index.html`).
    -   **Interacciones Clave:**
        -   Utiliza los módulos de la carpeta `server/` para gestionar cada plataforma.
        -   Se comunica con `main.cjs` para señalar cuándo está listo (`process.send({ type: 'ready' })`).

-   **`preload.js` (El Puente Seguro):**
    -   **Función:** Es un script de Electron que se ejecuta en un contexto privilegiado antes que cualquier script de la página web en el Proceso de Renderizado. Su misión es exponer de forma selectiva y segura ciertas funciones del Proceso Principal (definidas con `ipcMain` en `main.cjs`) a las ventanas del frontend. Define el objeto `window.chatter` que se usa en todo el frontend para llamar a funciones del backend.
    -   **Ejemplo:** La llamada `window.chatter.saveSettings(config)` en el frontend es posible gracias a que `preload.js` ha expuesto la función correspondiente.

-   **`package.json`:**
    -   **Función:** Define los metadatos del proyecto, las dependencias (`dependencies`, `devDependencies`) y los scripts de ejecución (`"start": "electron ."`). La línea `"main": "main.cjs"` es la que le dice a Electron cuál es el punto de entrada de la aplicación.

-   **`public/` (La Cara de la App):**
    -   **Función:** Esta carpeta contiene todos los archivos que se muestran al usuario (el frontend). Es el "site" estático que se carga en las ventanas de Electron.
    -   **Contenido:**
        -   `.html`: Ficheros que definen la estructura de cada ventana (`index.html` para el chat, `settings.html` para la configuración, `dock.html` para el panel de eventos).
        -   `style.css`: La hoja de estilos global.
        -   `js/`: La lógica del frontend (ver sección detallada más abajo).

-   **`server/` (Los Conectores):**
    -   **Función:** Contiene la lógica modular para conectarse a cada plataforma de streaming. `server.js` importa y utiliza estos módulos.
    -   **Contenido:**
        -   `platforms/`: Módulos específicos para `twitch.js`, `youtube.js`, etc.
        -   `badges.js`, `fetch.js`, `storage.js`: Utilidades y helpers para el servidor.

-   **`docs/` (La Documentación):**
    -   **Función:** Contiene toda la documentación del proyecto, incluyendo este archivo. Es un recurso vital para entender la arquitectura y las decisiones de diseño.

-   **`assets/`:**
    -   **Función:** Contiene los activos estáticos de la aplicación, como el icono `icon.ico`.

-   **`resource-monitor.cjs`, `panel-functions.js`:**
    -   **Función:** Scripts de utilidad que parecen ser utilizados por componentes específicos de la interfaz. `resource-monitor` probablemente alimenta gráficos de uso de sistema, y `panel-functions` podría estar relacionado con el `dock.html`.

-   **`electron.cjs` (OBSOLETO):**
    -   **Función:** Este es un antiguo archivo de punto de entrada. **NO SE UTILIZA**. `package.json` especifica `main.cjs` como el principal. Cualquier cambio en este archivo será ignorado. Existe puramente como un artefacto histórico y debe ser ignorado o eliminado para evitar confusiones.

### <u>Frontend Detallado: `public/js/`</u>

La lógica del frontend está organizada de forma modular:

-   **`js/main/`:** Contiene los scripts para la ventana principal del chat (`index.html`).
    -   `main-app.js`: El orquestador principal.
    -   `chat-rendering.js`: Lógica para dibujar los mensajes en la pantalla.
    -   `socket-handling.js`: Se conecta al WebSocket del `server.js` para recibir mensajes.
    -   ...y otros módulos para el manejo de emotes, input, etc.

-   **`js/settings/` (El Foco de Nuestra Reparación):**
    -   Contiene los scripts para la ventana de configuración (`settings.html`).
    -   `settings-main.js`: El punto de entrada. Se ejecuta al cargar `settings.html`, inicializa las demás partes y carga la configuración inicial.
    -   `settings-helpers.js`: Proporciona funciones de utilidad como `get`, `set`, `chk` para manipular los elementos del formulario.
    -   `settings-form.js`: El núcleo de la lógica. Define cómo los datos de configuración se cargan en el formulario (`populateForm`) y cómo se extraen del formulario para guardarlos (`getFormState`).
    -   `settings-ui.js`: Controla la interactividad de la UI, como la navegación entre pestañas (General, Chat, Apariencia).
    -   `settings-tags.js`: Proporciona la lógica para los campos de "etiquetas" (Palabras Bloqueadas/Resaltadas).
    -   `settings-accounts.js`: Gestiona la lógica de conexión/desconexión de cuentas (ej: Twitch).

---

## Flujo de Datos Crítico: Guardar la Configuración

Entender este flujo es clave para entender la app:

1.  **Usuario -> `settings.html`:** El usuario cambia un valor (ej: selecciona el tema "Sakura" en el `<select id="theme">`).

2.  **Guardar -> `settings-main.js`:** El usuario hace clic en "Guardar". El listener en `settings-main.js` se activa.

3.  **Extracción -> `settings-form.js`:** Se llama a `getFormState()`. Esta función recorre todos los elementos del formulario con `id` (como `theme`, `compact`, `fontSize`) y recopila sus valores en un único objeto de configuración.

4.  **Puente -> `preload.js`:** `settings-main.js` invoca `window.chatter.saveSettings(newState)`. Esta función `saveSettings` fue expuesta por `preload.js`.

5.  **Recepción -> `main.cjs`:** La llamada atraviesa el puente de IPC. El manejador `ipcMain.handle('save-settings', ...)` en `main.cjs` se ejecuta, recibiendo el objeto `newState`.

6.  **Persistencia -> `main.cjs`:** El manejador `save-settings` escribe el objeto `newState` en el archivo `config.json` en el disco duro, utilizando la función `saveConfig()`.

7.  **Re-aplicación (Opcional):** El manejador también realiza acciones inmediatas si es necesario, como `mainWindow.setAlwaysOnTop(...)` o cerrar la propia ventana de configuración.

Este ciclo de **Renderizado -> Preload -> Principal** es el patrón fundamental para toda la comunicación segura en la aplicación.
