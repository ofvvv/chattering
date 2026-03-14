// server/platforms/youtube.js — Chattering v3.1
'use strict'

let emitMsg, emitEvento, updateStatus, procesarUsuario
let reconnectTimer = null
let chatRef = null

function init(deps) {
    emitMsg        = deps.emitMsg
    emitEvento     = deps.emitEvento
    updateStatus   = deps.updateStatus
    procesarUsuario = deps.procesarUsuario
}

function disconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (chatRef) { try { chatRef.stop() } catch {}; chatRef = null }
    updateStatus('YT', false)
}

function connect(channelId) {
    if (!channelId) return
    disconnect()
    const { LiveChat } = require('youtube-chat')
    const chat = new LiveChat({ channelId })
    chatRef = chat

    chat.on('chat', item => {
        const text = item.message?.map(m => m.text||m.emojiText||'').join('') || ''
        if (!text) return
        updateStatus('YT', true) // only mark live when messages arrive
        const avatar = item.author?.thumbnail?.url || null
        const isFirst = procesarUsuario(item.author.channelId, item.author.name, 'YT')
        emitMsg({ plat:'YT', type:'msg', user:item.author.name, userId:item.author.channelId,
                  avatar, text, isFirst,
                  badges:{mod:item.author.isChatModerator||item.author.isChatOwner, sub:item.author.isChatSponsor},
                  badgeUrls:[] })
    })
    chat.on('error', e => { console.error('[YouTube] Error:', e?.message||e); updateStatus('YT', false); reconnectTimer = setTimeout(() => connect(channelId), 15000) })
    chat.on('end',   () => { console.log('[YouTube] Stream terminado'); updateStatus('YT', false); reconnectTimer = setTimeout(() => connect(channelId), 15000) })

    chat.start()
        .then(ok => { if (!ok) { console.error('[YouTube] No hay stream activo'); reconnectTimer = setTimeout(() => connect(channelId), 15000) } })
        .catch(e  => { console.error('[YouTube] Error:', e?.message||e); reconnectTimer = setTimeout(() => connect(channelId), 15000) })
}

module.exports = { init, connect, disconnect }
