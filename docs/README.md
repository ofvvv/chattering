# Chattering v3.2.1 - Documentación para desarrolladores

Documentación técnica para quien quiera extender o contribuir a Chattering. El objetivo a futuro es migrar hacia una arquitectura modular (ej. React/Vue) y un sistema de docks estilo OBS, pero actualmente mantenemos una base Vanilla JS ligera y rápida.

## Índice

| Documento | Descripción |
|-----------|-------------|
| [Arquitectura](architecture.md) | Proceso Electron, servidor, flujo de mensajes y ventanas |
| [Plataformas](platforms.md) | Cómo están implementadas TikTok, Twitch y YouTube |
| [APIs internas](api-internal.md) | Socket.IO, IPC y endpoints del servidor |

## Requisitos

- **Node.js** 18+
- **npm** para instalar dependencias
- En Windows, **PowerShell** o CMD para scripts de build

## Comandos útiles

```bash
npm install         # Instalar dependencias
npm start           # Ejecutar en desarrollo (Electron + servidor local)
npm run build:win   # Generar instalador Windows (NSIS) en dist/