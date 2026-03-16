// server/platforms/twitch.js — Chattering v3.1
'use strict'
const { fetchJson } = require('../fetch')
const { buildBadgeUrls, loadChannel, loadGlobal } = require('../badges')

const TWITCH_CLIENT_ID = 'w2q6ngvevmf1gkuu1ngiqwmyzqmjrt'

let clientRef       = null
let channelId       = null
let liveCheckTimer  = null
let reconnectTimer  = null
let emitMsg, emitEvento, updateStatus, procesarUsuario, config

function init(deps) {
    emitMsg        = deps.emitMsg
    emitEvento     = deps.emitEvento
    updateStatus   = deps.updateStatus
    procesarUsuario = deps.procesarUsuario
    config         = deps.config
}

async function checkLive(channel) {
    if (!channel) return
    if (!config.twitchToken) {
        // Without token, we can't check — mark as unknown (don't show LIVE)
        updateStatus('TW', false)
        return
    }
    try {
        const data = await fetchJson(
            `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channel)}`,
            { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${config.twitchToken}` }
        )
        const live = Array.isArray(data?.data) && data.data.length > 0
        updateStatus('TW', live)
    } catch(e) {
        console.warn('[Twitch] checkLive falló:', e.message)
    }
}

function disconnect() {
    if (liveCheckTimer) { clearInterval(liveCheckTimer); liveCheckTimer = null }
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (clientRef) {
        try { clientRef.disconnect() } catch {}
        clientRef = null
    }
    channelId = null
}

function connect(channel) {
    if (!channel) return
    channel = channel.toLowerCase().replace('@','')

    // Cleanup previous connection
    disconnect()

    const tmi = require('tmi.js')
    const identity = (config.twitchToken && config.twitchUser)
        ? { username: config.twitchUser, password: `oauth:${config.twitchToken}` }
        : undefined

    const client = new tmi.Client({
        options:    { debug: false, skipMembership: true },
        connection: { reconnect: false, secure: true },
        identity,
        channels:   [channel]
    })
    clientRef = client

    client.on('message', (_ch, tags, message, self) => {
        const user   = tags['display-name'] || tags.username || 'unknown'
        const userId = tags['user-id']      || tags.username || user
        if (!user || user === 'unknown') return

        // Capture room-id for channel badges
        if (tags['room-id'] && !channelId) {
            channelId = tags['room-id']
            loadChannel(channelId, config.twitchToken)
        }

        const badgeUrls = buildBadgeUrls(tags, channelId)
        const isFirst   = procesarUsuario(userId, user, 'TW')

        if (tags['custom-reward-id']) {
            emitEvento({ plat:'TW', type:'redeem', user, userId, avatar:null, text:message, rewardTitle:'Canje', count:0 })
            return
        }
        // Parse Twitch native emotes from tags
        const twitchEmotes = tags.emotes || {}
        emitMsg({ plat:'TW', type:'msg', user, userId, avatar:null, text:message, isFirst,
                  badges:{ mod:!!tags.mod, sub:!!tags.subscriber }, badgeUrls, twitchEmotes })
    })

    client.on('subscription', (_ch, username, _method, msg, tags) => {
        const user = tags?.['display-name'] || username
        emitEvento({ plat:'TW', type:'sub', user, userId:tags?.['user-id']||username, avatar:null, text:msg||'nueva suscripción', count:1 })
    })
    client.on('resub', (_ch, username, months, msg, tags) => {
        const user = tags?.['display-name'] || username
        emitEvento({ plat:'TW', type:'resub', user, userId:tags?.['user-id']||username, avatar:null, text:msg||`${months} meses`, count:months })
    })
    client.on('subgift', (_ch, gifter, _streak, recipient, _methods, tags) => {
        const user = tags?.['display-name'] || gifter
        emitEvento({ plat:'TW', type:'gift', user, userId:tags?.['user-id']||gifter, avatar:null, text:`regaló sub a ${recipient}`, count:1 })
    })
    client.on('submysterygift', (_ch, gifter, count, _methods, tags) => {
        const user = tags?.['display-name'] || gifter
        emitEvento({ plat:'TW', type:'gift', user, userId:tags?.['user-id']||gifter, avatar:null, text:`regaló ${count} subs`, count })
    })
    client.on('cheer', (_ch, tags, message) => {
        const user = tags?.['display-name'] || tags?.username
        if (!user) return
        emitEvento({ plat:'TW', type:'cheer', user, userId:tags?.['user-id']||user, avatar:null, text:message||'', count:tags.bits||0 })
    })
    client.on('raided', (_ch, username, viewers) => {
        emitEvento({ plat:'TW', type:'raid', user:username, userId:username, avatar:null, text:`raid con ${viewers} viewers`, count:viewers })
    })
    client.on('ban', (_ch, username) => {
        emit_ban_event(username)
    })
    client.on('timeout', (_ch, username, _reason, duration) => {
        emit_ban_event(username, duration)
    })

    client.on('connected', () => {
        console.log('[Twitch] Conectado a', channel)
        // Note: connected to chat ≠ stream is live
        // Start live check cycle
        checkLive(channel)
        liveCheckTimer = setInterval(() => checkLive(channel), 60000)
        // Reload badges with token if available
        if (config.twitchToken) loadGlobal(config.twitchToken)
    })

    client.on('disconnected', reason => {
        console.log('[Twitch] Desconectado:', reason)
        updateStatus('TW', false)
        if (liveCheckTimer) { clearInterval(liveCheckTimer); liveCheckTimer = null }
        clientRef = null
        reconnectTimer = setTimeout(() => connect(channel), 10000)
    })

    client.connect().catch(e => {
        console.error('[Twitch] Error al conectar:', e.message||e)
        reconnectTimer = setTimeout(() => connect(channel), 10000)
    })
}

function emit_ban_event(username, duration) {
    // Notifies frontend to mark/remove messages from this user
    // This is handled via a custom socket event
    if (emitEvento) emitEvento({ plat:'TW', type:'ban', user:username, userId:username, avatar:null, text:duration?`timeout ${duration}s`:'baneado', count:0 })
}

async function say(channel, text) {
    if (!clientRef) throw new Error('No conectado a Twitch')
    if (!config.twitchToken) throw new Error('Token requerido para enviar mensajes')
    // tmi.js exige que el canal empiece con # para enviar mensajes
    const targetChannel = channel.startsWith('#') ? channel.toLowerCase() : `#${channel.toLowerCase()}`
    return clientRef.say(targetChannel, text)
}

function getChannelId() { return channelId }
function getClient()    { return clientRef }

module.exports = { init, connect, disconnect, say, getChannelId, getClient, checkLive }
