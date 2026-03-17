'''# Chattering v3.2.1 - Documentación para desarrolladores

Documentación técnica para quien quiera extender o contribuir a Chattering. El objetivo a futuro es migrar hacia una arquitectura de componentes más robusta (ej. React/Vue) y un sistema de docks estilo OBS.

Actualmente, el frontend es una aplicación Vanilla JS ligera, que ha sido refactorizada recientemente para tener una **arquitectura modular**, donde cada parte de la UI (chat, input, dock de eventos, etc.) está encapsulada en su propio script para facilitar el desarrollo y mantenimiento.

## Índice

| Documento | Descripción |
|-----------|-------------|
| [Arquitectura](architecture.md) | Proceso Electron, servidor, flujo de mensajes y la nueva estructura del frontend. |
| [Plataformas](platforms.md) | Cómo están implementadas TikTok, Twitch y YouTube en el backend. |
| [APIs internas](api-internal.md) | Socket.IO, IPC y endpoints del servidor. |

## Requisitos

- **Node.js** 18+
- **npm** para instalar dependencias
- En Windows, **PowerShell** o CMD para scripts de build

## Comandos útiles

```bash
npm install         # Instalar dependencias
npm start           # Ejecutar en desarrollo (Electron + servidor local)
npm run build:win   # Generar instalador Windows (NSIS) en dist/
```
'''