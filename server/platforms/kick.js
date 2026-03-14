// server/platforms/kick.js — Chattering v3.1
'use strict'
const { fetchJson } = require('../fetch')

let emitMsg, emitEvento, updateStatus, procesarUsuario
let pusherRef = null
let reconnectTimer = null

function init(deps) {
    emitMsg        = deps.emitMsg
    emitEvento     = deps.emitEvento
    updateStatus   = deps.updateStatus
    procesarUsuario = deps.procesarUsuario
}

function disconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (pusherRef) { try { pusherRef.disconnect() } catch {}; pusherRef = null }
    updateStatus('KK', false)
}

async function getChatroomId(username) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://kick.com/',
        'Origin':  'https://kick.com'
    }
    for (const url of [`https://kick.com/api/v2/channels/${username}`, `https://kick.com/api/v1/channels/${username}`]) {
        try {
            const data = await fetchJson(url, headers)
            const id = data?.chatroom?.id ?? data?.id
            if (id) { console.log('[Kick] Chatroom ID:', id); return id }
        } catch(e) { console.warn('[Kick] Endpoint falló:', url, e.message) }
    }
    return null
}

async function connect(username, manualChatroomId) {
    if (!username) return
    disconnect()
    try {
        let chatroomId = manualChatroomId || await getChatroomId(username)
        if (!chatroomId) { console.error('[Kick] No se pudo obtener chatroom ID'); return }

        const Pusher = require('pusher-js')
        const p = new Pusher('eb1d5f283081a78b932c', { cluster:'us2', forceTLS:true, disableStats:true })
        pusherRef = p
        const ch = p.subscribe(`chatrooms.${chatroomId}.v2`)

        ch.bind('App\\Events\\ChatMessageEvent', data => {
            const user   = data?.sender?.username || 'unknown'
            const userId = String(data?.sender?.id || user)
            const text   = data?.content || ''
            const isMod  = data?.sender?.is_moderator || false
            const isSub  = data?.sender?.is_subscribed || false
            const isFirst = procesarUsuario(userId, user, 'KK')
            emitMsg({ plat:'KK', type:'msg', user, userId, avatar:null, text, isFirst,
                      badges:{mod:isMod,sub:isSub}, badgeUrls:[] })
        })

        p.connection.bind('connected',    ()  => { console.log('[Kick] Conectado a', username); updateStatus('KK', true) })
        p.connection.bind('disconnected', ()  => { updateStatus('KK', false); reconnectTimer = setTimeout(() => connect(username, manualChatroomId), 15000) })
        p.connection.bind('error',        e   => { console.error('[Kick] Error Pusher:', e?.message||e); updateStatus('KK', false); reconnectTimer = setTimeout(() => connect(username, manualChatroomId), 30000) })
    } catch(e) {
        console.error('[Kick] Error:', e.message||e)
        reconnectTimer = setTimeout(() => connect(username, manualChatroomId), 30000)
    }
}

module.exports = { init, connect, disconnect }
