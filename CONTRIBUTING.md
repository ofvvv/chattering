# Contribuir a Chattering

Gracias por tu interés en contribuir. Este documento resume cómo reportar bugs, proponer cambios y trabajar en el código.

## Código de conducta

Sé respetuoso en issues y pull requests. Este proyecto está orientado a streamers y desarrollo abierto.

## Cómo contribuir

### Reportar bugs

- Abre un [issue](../../issues) con la etiqueta `bug`.
- Incluye: versión de Chattering, sistema operativo y pasos para reproducir.
- Si es posible, adjunta capturas o logs relevantes (por ejemplo `%AppData%\Chattering\error.log` en Windows).

### Proponer mejoras

- Abre un issue con la etiqueta `enhancement` o `feature`.
- Describe el problema o la idea y por qué sería útil para streamers.

### Pull requests

1. Haz fork del repositorio y crea una rama desde `main` (por ejemplo `feature/nombre` o `fix/descripcion`).
2. Instala dependencias: `npm install`.
3. Realiza tus cambios y prueba en local con `npm start`.
4. Asegúrate de no romper la construcción: `npm run build:win` (en Windows).
5. Abre un PR hacia `main` describiendo qué cambia y, si aplica, el issue relacionado.

Revisaremos el PR y te daremos feedback. No es obligatorio seguir una plantilla concreta, pero un título y descripción claros ayudan.

## Estructura del proyecto

- **main.js** — Proceso principal de Electron (ventanas, IPC, auto-updater).
- **preload.js** — Puente seguro entre renderer y main (`contextBridge`).
- **server.js** — Servidor Express + Socket.IO; orquesta plataformas y APIs.
- **server/** — Lógica de cada plataforma (Twitch, TikTok, YouTube, Kick) y almacenamiento.
- **public/** — Ventanas HTML/CSS/JS (chat principal, configuración, setup).

La documentación para desarrolladores está en la carpeta **docs/** (arquitectura, APIs internas, cómo añadir una plataforma).

## Desarrollo

- Ejecutar en modo desarrollo: `npm start` (requiere Node.js y que el puerto 3000 esté libre).
- La configuración se guarda en `%AppData%\Chattering\config.json` (Windows).
- Para builds: `npm run build:win` genera el instalador en `dist/`.

## Licencia

Al contribuir, aceptas que tus aportaciones se licencien bajo la misma licencia del proyecto (MIT).
