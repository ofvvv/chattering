# Chattering v3.2.1

Chattering es un cliente de chat unificado para streamers. Permite leer y moderar los chats de Twitch, YouTube y TikTok desde una sola ventana ligera, con soporte para emotes personalizados (7TV, BTTV, FFZ) y alertas integradas.

## Características principales
- **Multi-plataforma:** Twitch, YouTube y TikTok en una sola vista.
- **Emotes Custom:** Soporte nativo para 7TV, BetterTTV y FrankerFaceZ.
- **Moderación:** Menú contextual para banear, silenciar o responder (Twitch).
- **Rendimiento:** Monitor de recursos integrado para evitar fugas de memoria.
- **Personalización:** Temas, opacidad, modo compacto y filtros por plataforma.

## Instalación y Desarrollo
1. Clona el repositorio.
2. Instala las dependencias: `npm install`
3. Ejecuta en modo desarrollo: `npm start`
4. Compila para Windows: `npm run build:win`

## Arquitectura
La aplicación utiliza **Electron** para la interfaz de escritorio y levanta un servidor **Node.js (Express + Socket.io)** en segundo plano (puerto 3000) para gestionar las conexiones a las plataformas y emitir los mensajes al frontend en tiempo real.