// server.js — Chattering v4.0 (ESM Refactor)
'use strict'

// --- Manejadores Globales de Errores ---
process.on('uncaughtException', e => console.error('[CRASH]', e.message, e.stack))
process.on('unhandledRejection', e => console.error('[REJECT]', e?.message || e))

// --- Importaciones de Módulos ---
import fs from 'fs'
import path from 'path'
import http from 'http'
import express from 'express'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'

// --- Polyfill para __dirname en ESM ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- Módulos del Framework ---
import * as storage from './server/storage.js'
import * as badges from './server/badges.js'
import * as twitch from './server/platforms/twitch.js'
import * as tiktok from './server/platforms/tiktok.js'
import * as youtube from './server/platforms/youtube.js'
import { fetchJson, postJson, fetchRaw } from './server/fetch.js'

// --- Constantes y Configuración Inicial ---
const CONFIG_PATH = process.env.CONFIG_PATH
const PORT = process.env.PORT || 3000
const TWITCH_CLIENT_ID = 'w2q6ngvevmf1gkuu1ngiqwmyzqmjrt'

function loadConfig() { try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) } catch { return {} } }
let config = loadConfig()

// --- Inicialización de Express y Socket.IO ---
const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })
app.use(express.json())

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

app.use(express.static(path.join(__dirname, 'public')))

// --- Estado y Lógica del Núcleo ---
const isLive = { TT: false, YT: false, TW: false }
const platStatus = { TT: 'disconnected', YT: 'disconnected', TW: 'disconnected' }

function updateStatus(plat, status) {
    if (isLive[plat] === status) return
    isLive[plat] = status; io.emit('status', isLive)
}

function updatePlatformState(plat, state) {
    if (platStatus[plat] === state) return
    platStatus[plat] = state
    io.emit('platform_state', { plat, state })
}

function emitMsg(d) {
    io.emit('msg', d)
    if (d.userId && d.text) storage.appendLog({ ...d, sessionStart: storage.SESSION_START, ts: Date.now() })
}

function emitEvento(d) {
    io.emit('evento', d)
    if (d.type === 'gift' || d.type === 'follow') storage.appendLog({ ...d, sessionStart: storage.SESSION_START, ts: Date.now() })
}

// --- Orquestación de Plataformas ---
const platDeps = () => ({ emitMsg, emitEvento, updateStatus, updatePlatformState, procesarUsuario: storage.procesarUsuario, addLikes: storage.addLikes, config })

twitch.init(platDeps()); tiktok.init(platDeps()); youtube.init(platDeps());

io.on('connection', socket => {
    socket.emit('history', storage.getHistory())
    socket.emit('dock_history', storage.getDockHistory())
    socket.emit('status', isLive)
    socket.emit('platform_states', platStatus)
    socket.emit('likes_init', storage.getTotalLikes())
    socket.on('req_user_hist', uid => socket.emit('res_user_hist', { uid, h: storage.getUserHistory(uid) }))
})

let lastConfig = {}
function reconnectAll() {
    const oldConfig = { ...lastConfig }
    config = loadConfig()
    lastConfig = { ...config }

    const deps = platDeps()
    twitch.init(deps); tiktok.init(deps); youtube.init(deps);

    if (oldConfig.tiktokUser !== config.tiktokUser) {
        tiktok.disconnect()
        setTimeout(() => tiktok.connect(config.tiktokUser), 800)
    }
    if (oldConfig.youtubeChannelId !== config.youtubeChannelId) {
        youtube.disconnect()
        setTimeout(() => youtube.connect(config.youtubeChannelId), 800)
    }
    if (oldConfig.twitchUser !== config.twitchUser || oldConfig.twitchToken !== config.twitchToken) {
        twitch.disconnect()
        setTimeout(() => twitch.connect(config.twitchUser), 800)
    }
}

// --- Endpoints de la API ---

app.get('/oauth/callback', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html><head><title>Chattering Auth</title></head><body style="background:#111;color:#fff;font-family:sans-serif;text-align:center;padding-top:50px;">
        <h2>✓ Autenticación completada</h2>
        <p>Puedes cerrar esta ventana.</p>
        <script>
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const token = params.get('access_token');
            if (token) {
                fetch('/api/twitch/token-received', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: 'oauth:' + token })
                }).then(() => {
                    setTimeout(() => window.close(), 2000);
                });
            } else {
                 document.body.innerHTML = '<h2>❌ Error de autenticación</h2><p>No se recibió el token. Inténtalo de nuevo.</p>';
            }
        </script></body></html>`);
});

app.post('/api/send-message', async (req, res) => {
    const { text, platform, replyTo, isCommand } = req.body || {}
    if (!text) return res.json({ ok: false, error: 'no text' })
    try {
        if (platform === 'TW' || !platform) {
            const channel = config.twitchUser;
            if (!channel) return res.json({ ok: false, error: 'Canal de Twitch no configurado' })
            if (!twitch.isConnected()) return res.json({ ok: false, error: 'No conectado al chat de Twitch' })
            const msg = (!isCommand && replyTo) ? `@${replyTo} ${text}` : text
            await twitch.say(channel, msg)
            return res.json({ ok: true })
        }
        res.json({ ok: false, error: 'plataforma no soportada para envío' })
    } catch (e) { res.json({ ok: false, error: e.message }) }
})

app.post('/api/twitch/token-received', async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ ok: false, error: 'No se recibió el token' });
    }

    try {
        const cleanToken = token.replace('oauth:', '');
        const userData = await fetchJson('https://api.twitch.tv/helix/users', {
            'Client-ID': TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${cleanToken}`
        });

        const user = userData?.data?.[0];
        if (!user || !user.login) {
            io.emit('twitch_auth', { ok: false, error: 'No se pudo obtener el usuario de Twitch.' });
            return res.status(500).json({ ok: false, error: 'Failed to fetch user from Twitch' });
        }

        const authData = { ok: true, token, user: user.login };
        io.emit('twitch_auth', authData);
        console.log(`[Auth] Token y usuario de Twitch (${user.login}) recibidos y emitidos.`);
        res.json({ ok: true });

    } catch (e) {
        console.error('[Auth] Error al validar token de Twitch:', e.message);
        io.emit('twitch_auth', { ok: false, error: 'Error al validar el token con Twitch.' });
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.post('/api/mod', async (req, res) => {
    const { platform, username, action, duration, reason } = req.body || {};
    if (!platform || !username || !action) {
        return res.status(400).json({ ok: false, error: 'Faltan parámetros: platform, username, action' });
    }

    try {
        if (platform === 'TW') {
            const channel = config.twitchUser;
            if (!channel) return res.status(400).json({ ok: false, error: 'Canal de Twitch no configurado' });
            
            await twitch.mod(channel, username, action, duration, reason);
            res.json({ ok: true, message: `Acción '${action}' aplicada a '${username}'` });
        } else {
            res.status(400).json({ ok: false, error: 'Plataforma no soportada para moderación' });
        }
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});


app.post('/api/reconnect', (req, res) => { reconnectAll(); res.json({ ok: true }) })

// Endpoints de Test
app.post('/test/msg', (req, res) => { emitMsg(req.body); res.json({ok:true}); })
app.post('/test/follow', (req, res) => { emitEvento(req.body); res.json({ok:true}); })
app.post('/test/gift', (req, res) => { emitEvento(req.body); res.json({ok:true}); })
app.post('/test/raid', (req, res) => { emitEvento(req.body); res.json({ok:true}); })
app.post('/test/like', (req, res) => { emitEvento(req.body); res.json({ok:true}); })


// --- Arranque del Servidor ---
storage.initDB(path.dirname(CONFIG_PATH)).then(async () => {
    await badges.loadGlobal(config.twitchToken)
    tiktok.connect(config.tiktokUser)
    youtube.connect(config.youtubeChannelId)
    twitch.connect(config.twitchUser)
    server.listen(PORT, () => {
        console.log(`[Server] http://localhost:${PORT}`)
        if (process.send) process.send({ type: 'ready', port: PORT })
    })
}).catch(e => { console.error('Error iniciando:', e); process.exit(1) })
