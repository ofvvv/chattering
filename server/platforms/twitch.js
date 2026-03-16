// server/platforms/twitch.js — Chattering v4.0 (ESM)
'use strict'

import tmi from 'tmi.js'
import { fetchJson } from '../fetch.js'
import { buildBadgeUrls, loadChannel, loadGlobal } from '../badges.js'

const TWITCH_CLIENT_ID = 'w2q6ngvevmf1gkuu1ngiqwmyzqmjrt'

let clientRef = null
let channelId = null
let liveCheckTimer = null
let reconnectTimer = null
let emitMsg, emitEvento, updateStatus, procesarUsuario, config

export function init(deps) {
    emitMsg = deps.emitMsg
    emitEvento = deps.emitEvento
    updateStatus = deps.updateStatus
    procesarUsuario = deps.procesarUsuario
    config = deps.config
}

export async function checkLive(channel) {
    if (!channel || !config.twitchToken) {
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
    } catch (e) {
        console.warn('[Twitch] checkLive falló:', e.message)
    }
}

export function disconnect() {
    if (liveCheckTimer) { clearInterval(liveCheckTimer); liveCheckTimer = null }
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (clientRef) {
        try { clientRef.disconnect() } catch { }
        clientRef = null
    }
    channelId = null
}

export function connect(channel) {
    if (!channel) return
    channel = channel.toLowerCase().replace('@', '')

    disconnect()

    const identity = (config.twitchToken && config.twitchUser)
        ? { username: config.twitchUser, password: `oauth:${config.twitchToken}` }
        : undefined

    const client = new tmi.Client({
        options: { debug: false, skipMembership: true },
        connection: { reconnect: false, secure: true },
        identity,
        channels: [channel]
    })
    clientRef = client

    client.on('message', (_ch, tags, message, self) => {
        const user = tags['display-name'] || tags.username || 'unknown'
        const userId = tags['user-id'] || tags.username || user
        if (!user || user === 'unknown') return

        if (tags['room-id'] && !channelId) {
            channelId = tags['room-id']
            loadChannel(channelId, config.twitchToken)
        }

        const badgeUrls = buildBadgeUrls(tags, channelId)
        const isFirst = procesarUsuario(userId, user, 'TW')

        if (tags['custom-reward-id']) {
            emitEvento({ plat: 'TW', type: 'redeem', user, userId, avatar: null, text: message, rewardTitle: 'Canje', count: 0 })
            return
        }
        
        const twitchEmotes = tags.emotes || {}
        emitMsg({ plat: 'TW', type: 'msg', user, userId, avatar: null, text: message, isFirst, badges: { mod: !!tags.mod, sub: !!tags.subscriber }, badgeUrls, twitchEmotes })
    })

    // ... (Otros manejadores de eventos como sub, resub, etc. sin cambios) ...

    client.on('connected', () => {
        console.log('[Twitch] Conectado a', channel)
        checkLive(channel)
        liveCheckTimer = setInterval(() => checkLive(channel), 60000)
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
        console.error('[Twitch] Error al conectar:', e.message || e)
        reconnectTimer = setTimeout(() => connect(channel), 10000)
    })
}

function emit_ban_event(username, duration) {
    if (emitEvento) emitEvento({ plat: 'TW', type: 'ban', user: username, userId: username, avatar: null, text: duration ? `timeout ${duration}s` : 'baneado', count: 0 })
}

export async function say(channel, text) {
    if (!clientRef) throw new Error('No conectado a Twitch')
    if (!config.twitchToken) throw new Error('Token requerido para enviar mensajes')
    const targetChannel = channel.startsWith('#') ? channel.toLowerCase() : `#${channel.toLowerCase()}`
    return clientRef.say(targetChannel, text)
}

export function getChannelId() { return channelId }
export function getClient() { return clientRef }
