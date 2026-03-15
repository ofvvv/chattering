# Documentación para desarrolladores

Documentación técnica para quien quiera extender o contribuir a Chattering.

## Índice

| Documento | Descripción |
|-----------|-------------|
| [Arquitectura](architecture.md) | Proceso Electron, servidor, flujo de mensajes y ventanas |
| [Plataformas](platforms.md) | Cómo están implementadas TikTok, Twitch, YouTube y Kick |
| [APIs internas](api-internal.md) | Socket.IO, IPC y endpoints del servidor |

## Requisitos

- **Node.js** 18+
- **npm** para instalar dependencias
- En Windows, **PowerShell** o CMD para scripts de build

## Comandos útiles

```bash
npm install    # Instalar dependencias
npm start      # Ejecutar en desarrollo (Electron + servidor local)
npm run build:win   # Generar instalador Windows (NSIS) en dist/
```

## Configuración en desarrollo

- El servidor corre en `http://localhost:3000`.
- La ventana principal carga `public/index.html`; la configuración, `public/settings.html`.
- Los logs del proceso principal y errores se escriben en `%AppData%\Chattering\error.log` (en desarrollo también suele loguear en consola).

## Dónde tocar según el cambio

| Objetivo | Archivos principales |
|----------|----------------------|
| Nueva plataforma de chat | `server/platforms/`, `server.js` (registro), `public/index.html` (badges/UI) |
| Cambiar UI del chat | `public/index.html`, `public/style.css` |
| Cambiar ventana de configuración | `public/settings.html`, `public/style.css` |
| Lógica del proceso principal | `main.js`, `preload.js` (si añades IPC) |
| Persistencia / historial | `server/storage.js` |

Si quieres contribuir con código, revisa [CONTRIBUTING.md](../CONTRIBUTING.md) en la raíz del repo.
