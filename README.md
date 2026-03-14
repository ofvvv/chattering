# Chattering v3.1

Multi-platform chat viewer for livestreamers. Supports TikTok, YouTube, Twitch, and Kick.

Built with Electron + Node.js + Express + Socket.IO.

## Project Structure

```
chatpro-electron/
├── main.js              # Electron main process
├── preload.js           # IPC bridge (contextBridge)
├── server.js            # Express server orchestrator
├── server/
│   ├── fetch.js         # HTTP helper (native fetch first → no DNS issues)
│   ├── badges.js        # Twitch badge loading (Helix API + CDN fallback)
│   ├── storage.js       # SQLite (sql.js) + JSONL logs
│   └── platforms/
│       ├── twitch.js    # tmi.js connection + live status check
│       ├── tiktok.js    # tiktok-live-connector
│       ├── youtube.js   # youtube-chat
│       └── kick.js      # Pusher websocket
├── public/
│   ├── index.html       # Main chat window
│   ├── settings.html    # Settings window (OBS-style sidebar)
│   └── setup.html       # First-run setup
└── assets/
    └── icon.ico
```

## Setup

```bash
npm install
npm start
```

## Build

```bash
npm run build:win
```

## Config Keys

Stored in `%AppData%\Chattering\config.json`:

| Key | Type | Description |
|-----|------|-------------|
| `tiktokUser` | string | TikTok username |
| `youtubeChannelId` | string | YouTube Channel ID (UCxxx) |
| `twitchUser` | string | Twitch username |
| `twitchToken` | string | Twitch OAuth token |
| `kickUser` | string | Kick username |
| `theme` | string | dark / midnight / forest / sakura |
| `compact` | bool | Compact message density |
| `avatarShape` | string | none / square / squircle / circle |
| `alwaysOnTop` | bool | Window always on top |
| `translucent` | bool | Transparent window background |
| `windowOpacity` | number | 20–100 |

## Contributing

This project is being prepared for open-source release. See CONTRIBUTING.md (coming soon).

## License

MIT (pending)
