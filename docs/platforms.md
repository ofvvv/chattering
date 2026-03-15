# Integración de Plataformas

Cada plataforma vive en `server/platforms/` y expone tres métodos principales: `init(deps)`, `connect(username)`, y `disconnect()`.

## Twitch (`twitch.js`)
- **Librería:** `tmi.js`
- **Funcionamiento:** Se conecta vía IRC. Si el usuario provee un Token OAuth, permite enviar mensajes y ejecutar comandos de moderación (`/ban`, `/timeout`).
- **Emotes:** Los emotes nativos se procesan mediante los tags de IRC. Los emotes de 7TV/BTTV/FFZ se cargan en el frontend consultando sus respectivas APIs.

## YouTube (`youtube.js`)
- **Librería:** `youtube-chat`
- **Funcionamiento:** Realiza scraping/polling del chat en vivo usando el ID del video (obtenido a partir del `@handle` del canal).
- **Emotes:** Extrae las URLs de las imágenes de los emotes nativos de YouTube y las envía al frontend en un array `ytEmotes` para su renderizado.

## TikTok (`tiktok.js`)
- **Librería:** `tiktok-live-connector`
- **Funcionamiento:** Se conecta al WebSocket no oficial de TikTok. 
- **Autenticación (Seamless Login):** Para evitar bloqueos, Electron abre una ventana oculta en `main.js`, el usuario inicia sesión, la app roba la cookie `sessionid` y se la pasa a la librería para simular una conexión legítima.
- **Eventos:** Soporta mensajes, regalos (gifts), follows y likes.