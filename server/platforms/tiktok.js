// server/platforms/tiktok.js — Chattering v3.1
'use strict'

let emitMsg, emitEvento, updateStatus, procesarUsuario, addLikes
let reconnectTimer = null
let connRef = null

function init(deps) {
    emitMsg        = deps.emitMsg
    emitEvento     = deps.emitEvento
    updateStatus   = deps.updateStatus
    procesarUsuario = deps.procesarUsuario
    addLikes       = deps.addLikes
}

function disconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (connRef) { try { connRef.disconnect() } catch {}; connRef = null }
}

function connect(user) {
    if (!user) return
    disconnect()
    const { WebcastPushConnection } = require('tiktok-live-connector')
    const conn = new WebcastPushConnection(user)
    connRef = conn

    conn.on('chat', d => {
        const isFirst = procesarUsuario(d.uniqueId, d.nickname||d.uniqueId, 'TT')
        emitMsg({ plat:'TT', type:'msg', user:d.nickname||d.uniqueId, userId:d.uniqueId,
                  avatar:d.profilePictureUrl, text:d.comment, isFirst,
                  badges:{mod:d.isModerator,sub:d.isSubscriber}, badgeUrls:[] })
    })
    conn.on('follow', d => {
        emitEvento({ plat:'TT', type:'follow', user:d.nickname||d.uniqueId, userId:d.uniqueId, avatar:d.profilePictureUrl, text:'te empezó a seguir' })
    })
    conn.on('gift', d => {
        if (d.repeatEnd) emitEvento({ plat:'TT', type:'gift', user:d.nickname||d.uniqueId, userId:d.uniqueId, avatar:d.profilePictureUrl, text:d.giftName, giftImg:d.giftPictureUrl, count:d.repeatCount })
    })
    conn.on('like', d => {
        const total = addLikes(d.likeCount||1)
        emitEvento({ plat:'TT', type:'like', user:d.nickname||d.uniqueId, userId:d.uniqueId, avatar:d.profilePictureUrl, count:d.likeCount, total })
    })
    conn.on('disconnected', () => {
        updateStatus('TT', false)
        reconnectTimer = setTimeout(() => connect(user), 15000)
    })
    conn.connect()
        .then(() => { console.log('[TikTok] Conectado a', user); updateStatus('TT', true) })
        .catch(e  => { console.error('[TikTok] Error:', e?.message||e); updateStatus('TT', false); reconnectTimer = setTimeout(() => connect(user), 15000) })
}

module.exports = { init, connect, disconnect }
