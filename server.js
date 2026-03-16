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
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<!DOCTYPE html><html>...</html>`) // Contenido HTML omitido por brevedad
})

app.post('/api/send-message', async (req, res) => {
    const { text, platform, replyTo, isCommand } = req.body || {}
    if (!text) return res.json({ ok: false, error: 'no text' })
    try {
        if (platform === 'TW' || !platform) {
            const channel = config.twitchUser || twitch.getClient()?.channels?.[0]?.replace('#', '')
            if (!channel) return res.json({ ok: false, error: 'Canal de Twitch no configurado' })
            const msg = (!isCommand && replyTo) ? `@${replyTo} ${text}` : text
            await twitch.say(channel, msg)
            return res.json({ ok: true })
        }
        res.json({ ok: false, error: 'plataforma no soportada para envío' })
    } catch (e) { res.json({ ok: false, error: e.message }) }
})

app.post('/api/moderate', async (req, res) => {
    const { action, userId, reason, duration } = req.body || {}
    if (!config.twitchToken) return res.json({ ok:false, error:'Token de Twitch requerido' })
    const cid = twitch.getChannelId()
    if (!cid) return res.json({ ok:false, error:'Canal no identificado aún' })
    try {
        const me = await fetchJson('https://api.twitch.tv/helix/users', {
            'Client-ID':TWITCH_CLIENT_ID, 'Authorization':`Bearer ${config.twitchToken}`
        })
        const modId = me?.data?.[0]?.id
        if (!modId) return res.json({ ok:false, error:'Token inválido' })
        const body = action==='ban'
            ? { data:{ user_id:userId, reason:reason||'' } }
            : { data:{ user_id:userId, duration:duration||300, reason:reason||'' } }
        await postJson(
            `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${cid}&moderator_id=${modId}`,
            body, { 'Client-ID':TWITCH_CLIENT_ID, 'Authorization':`Bearer ${config.twitchToken}` }
        )
        res.json({ ok:true })
    } catch(e) { res.json({ ok:false, error:e.message }) }
})

// ... (otros endpoints de la API omitidos por brevedad, la lógica no cambia) ...

app.get('/api/viewer-count', async (req, res) => { /* ... */ })
app.post('/api/twitch/validate', async (req, res) => { /* ... */ })
app.get('/api/twitch/auth-status', (req, res) => { /* ... */ })
app.post('/api/twitch/token-received', async (req, res) => { /* ... */ })
app.get('/api/preview_html', async (req, res) => { /* ... */ })
app.post('/api/reconnect', (req, res) => { reconnectAll(); res.json({ ok: true }) })

// Endpoints de Test
app.post('/test/msg', (req, res) => { /* ... */ })
app.post('/test/follow', (req, res) => { /* ... */ })
app.post('/test/gift', (req, res) => { /* ... */ })
app.post('/test/raid', (req, res) => { /* ... */ })
app.post('/test/like', (req, res) => { /* ... */ })


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
