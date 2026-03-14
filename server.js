// server.js — Chattering v3.1
'use strict'
process.on('uncaughtException',  e => console.error('[CRASH]', e.message, e.stack))
process.on('unhandledRejection', e => console.error('[REJECT]', e?.message || e))

const fs      = require('fs')
const path    = require('path')
const http    = require('http')
const express = require('express')
const { Server } = require('socket.io')

const CONFIG_PATH = process.env.CONFIG_PATH
const PORT        = process.env.PORT || 3000

function loadConfig() { try { return JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8')) } catch { return {} } }
let config = loadConfig()

const storage  = require('./server/storage')
const badges   = require('./server/badges')
const twitch   = require('./server/platforms/twitch')
const tiktok   = require('./server/platforms/tiktok')
const youtube  = require('./server/platforms/youtube')
const kick     = require('./server/platforms/kick')
const { fetchJson, postJson, fetchRaw } = require('./server/fetch')

const TWITCH_CLIENT_ID = 'w2q6ngvevmf1gkuu1ngiqwmyzqmjrt'

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, { cors:{ origin:'*' } })
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

const isLive = { TT:false, YT:false, TW:false, KK:false }
function updateStatus(plat, status) {
    if (isLive[plat] === status) return
    isLive[plat] = status; io.emit('status', isLive)
}
function emitMsg(d) {
    io.emit('msg', d)
    if (d.userId && d.text) storage.appendLog({ ...d, sessionStart:storage.SESSION_START, ts:Date.now() })
}
function emitEvento(d) {
    io.emit('evento', d)
    if (d.type==='gift'||d.type==='follow') storage.appendLog({ ...d, sessionStart:storage.SESSION_START, ts:Date.now() })
}

const platDeps = () => ({ emitMsg, emitEvento, updateStatus, procesarUsuario:storage.procesarUsuario, addLikes:storage.addLikes, config })

twitch.init(platDeps()); tiktok.init(platDeps()); youtube.init(platDeps()); kick.init(platDeps())

io.on('connection', socket => {
    socket.emit('history',      storage.getHistory())
    socket.emit('dock_history', storage.getDockHistory())
    socket.emit('status',       isLive)
    socket.emit('likes_init',   storage.getTotalLikes())
    socket.on('req_user_hist', uid => socket.emit('res_user_hist', { uid, h:storage.getUserHistory(uid) }))
})

function reconnectAll() {
    config = loadConfig()
    const deps = platDeps()
    twitch.init(deps); tiktok.init(deps); youtube.init(deps); kick.init(deps)
    twitch.disconnect(); tiktok.disconnect(); youtube.disconnect(); kick.disconnect()
    setTimeout(() => {
        tiktok.connect(config.tiktokUser)
        youtube.connect(config.youtubeChannelId)
        twitch.connect(config.twitchUser)
        kick.connect(config.kickUser, config.kickChatroomId)
    }, 800)
}

// ─── OAUTH CALLBACK ROUTE (receives Twitch redirect) ─────────────────────────
// Twitch redirects browser to http://localhost:3000/oauth/callback#access_token=xxx
// The page reads the hash fragment (JS-only, not sent to server) and POSTs it to us
app.get('/oauth/callback', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Chattering — Twitch Auth</title>
<style>*{box-sizing:border-box}body{margin:0;background:#0e0e10;color:#efeff1;font-family:'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px}
.logo{font-size:24px;font-weight:800;letter-spacing:-1px}.logo span{color:#9b9bf5}
#msg{font-size:13px;color:#666;text-align:center;max-width:280px;line-height:1.6}
.ok{color:#53fc18!important;font-weight:700}.err{color:#ff6060!important;font-weight:700}
</style></head><body>
<div class="logo">Chatter<span>ing</span></div>
<p id="msg">Procesando autorización...</p>
<script>
(async () => {
    const hash = location.hash.slice(1)
    const params = Object.fromEntries(new URLSearchParams(hash))
    const token = params.access_token
    if (!token) {
        document.getElementById('msg').className = 'err'
        document.getElementById('msg').textContent = 'Error: no se recibió token de Twitch.'
        return
    }
    try {
        const r = await fetch('/api/twitch/token-received', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        })
        const d = await r.json()
        if (d.ok) {
            document.getElementById('msg').className = 'ok'
            document.getElementById('msg').textContent = '✓ ¡Conectado como ' + d.login + '! Puedes cerrar esta pestaña.'
            setTimeout(() => window.close(), 2500)
        } else {
            document.getElementById('msg').className = 'err'
            document.getElementById('msg').textContent = 'Error: ' + (d.error || 'token rechazado')
        }
    } catch (e) {
        document.getElementById('msg').className = 'err'
        document.getElementById('msg').textContent = 'Error de conexión con Chattering.'
    }
})()
</script></body></html>`)
})

app.post('/api/send-message', async (req, res) => {
    const { text, platform, replyTo, isCommand } = req.body || {}
    if (!text) return res.json({ ok:false, error:'no text' })
    try {
        if (platform === 'TW' || !platform) {
            // Use twitchUser from config, fallback to the channel we're connected to
            const channel = config.twitchUser || twitch.getClient()?.channels?.[0]?.replace('#','')
            if (!channel) return res.json({ ok:false, error:'Canal de Twitch no configurado' })
            // TMI.js say() handles /commands natively (e.g., /timeout, /ban, /mod)
            const msg = (!isCommand && replyTo) ? `@${replyTo} ${text}` : text
            await twitch.say(channel, msg)
            return res.json({ ok:true })
        }
        res.json({ ok:false, error:'plataforma no soportada para envío' })
    } catch(e) { res.json({ ok:false, error:e.message }) }
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

app.get('/api/viewer-count', async (req, res) => {
    if (!config.twitchToken || !config.twitchUser) return res.json({ ok:false })
    try {
        const data = await fetchJson(
            `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(config.twitchUser)}`,
            { 'Client-ID':TWITCH_CLIENT_ID, 'Authorization':`Bearer ${config.twitchToken}` }
        )
        const s = data?.data?.[0]
        if (s) return res.json({ ok:true, viewers:s.viewer_count, title:s.title, game:s.game_name })
        res.json({ ok:true, viewers:0 })
    } catch(e) { res.json({ ok:false, error:e.message }) }
})

app.post('/api/twitch/validate', async (req, res) => {
    const { token } = req.body || {}
    if (!token) return res.json({ ok:false })
    try {
        const data = await fetchJson('https://id.twitch.tv/oauth2/validate', { 'Authorization':`OAuth ${token}` })
        if (data?.login) return res.json({ ok:true, login:data.login, userId:data.user_id })
        res.json({ ok:false })
    } catch(e) { res.json({ ok:false, error:e.message }) }
})

let lastTwitchAuth = null
app.get('/api/twitch/auth-status', (req, res) => {
    if (lastTwitchAuth) { const r=lastTwitchAuth; lastTwitchAuth=null; res.json(r) }
    else res.json({ ok:false })
})

app.post('/api/twitch/token-received', async (req, res) => {
    const { token } = req.body || {}
    if (!token) return res.json({ ok:false })
    try {
        const data = await fetchJson('https://id.twitch.tv/oauth2/validate', { 'Authorization':`OAuth ${token}` })
        if (!data.login) return res.json({ ok:false, error:'Token inválido' })
        config = loadConfig() || config
        config.twitchToken = token
        config.twitchUser  = config.twitchUser || data.login
        try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2)) } catch {}
        lastTwitchAuth = { ok:true, login:data.login, token }
        badges.loadGlobal(token)
        const cid = twitch.getChannelId()
        if (cid) { badges.invalidateChannel(cid); badges.loadChannel(cid, token) }
        twitch.connect(config.twitchUser)
        io.emit('twitch_auth', { ok:true, login:data.login })
        res.json({ ok:true, login:data.login })
    } catch(e) { res.json({ ok:false, error:e.message }) }
})

app.get('/api/preview_html', async (req, res) => {
    const url = req.query.url
    if (!url) return res.json({ error:'no url' })
    try {
        const html = (await fetchRaw(url)).slice(0,64000)
        const get = re => { const m=html.match(re); return m?m[1].replace(/&amp;/g,'&').trim():'' }
        res.json({
            title:       get(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) || get(/<title>([^<]+)<\/title>/i),
            description: get(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) || get(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i),
            image:       get(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i),
            url
        })
    } catch(e) { res.json({ error:e.message }) }
})

app.post('/api/reconnect', (req, res) => { reconnectAll(); res.json({ ok:true }) })

app.post('/test/msg',    (req,res) => { const {user='Test',text='Hola!',plat='TT'}=req.body; emitMsg({plat,type:'msg',user,userId:user.toLowerCase(),avatar:null,text,isFirst:false,badges:{mod:false,sub:false},badgeUrls:[]}); res.json({ok:true}) })
app.post('/test/follow', (req,res) => { emitEvento({plat:'TT',type:'follow',user:'TestFollow',userId:'testfollow',avatar:null,text:'te siguió'}); res.json({ok:true}) })
app.post('/test/gift',   (req,res) => { const {user='Donor',gift='Rose',count=5}=req.body; emitEvento({plat:'TT',type:'gift',user,userId:user.toLowerCase(),avatar:null,text:gift,giftImg:null,count}); res.json({ok:true}) })
app.post('/test/raid',   (req,res) => { emitEvento({plat:'TW',type:'raid',user:'Raider',userId:'raider',avatar:null,text:'raid con 200',count:200}); res.json({ok:true}) })
app.post('/test/like',   (req,res) => { const {user='Liker',count=10}=req.body; const total=storage.addLikes(count); emitEvento({plat:'TT',type:'like',user,userId:user.toLowerCase(),avatar:null,count,total}); res.json({ok:true}) })

storage.initDB(path.dirname(CONFIG_PATH)).then(async () => {
    await badges.loadGlobal(config.twitchToken)
    tiktok.connect(config.tiktokUser)
    youtube.connect(config.youtubeChannelId)
    twitch.connect(config.twitchUser)
    kick.connect(config.kickUser, config.kickChatroomId)
    server.listen(PORT, () => {
        console.log(`[Server] http://localhost:${PORT}`)
        if (process.send) process.send({ type:'ready', port:PORT })
    })
}).catch(e => { console.error('Error iniciando:', e); process.exit(1) })