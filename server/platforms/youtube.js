// server/platforms/youtube.js — Chattering v3.1
'use strict'

let emitMsg, emitEvento, updateStatus, updatePlatformState, procesarUsuario
let reconnectTimer = null
let chatRef = null

function init(deps) {
    emitMsg        = deps.emitMsg
    emitEvento     = deps.emitEvento
    updateStatus   = deps.updateStatus
    updatePlatformState = deps.updatePlatformState
    procesarUsuario = deps.procesarUsuario
}

function disconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (chatRef) { try { chatRef.stop() } catch {}; chatRef = null }
    updateStatus('YT', false)
    if (updatePlatformState) updatePlatformState('YT', 'disconnected')
}

async function connect(username) {
    if (!username) return
    disconnect()
    if (updatePlatformState) updatePlatformState('YT', 'loading')
    
    // Remove @ if present
    const handle = username.replace('@', '')
    
    // Get live video ID from handle
    const videoId = await getLiveVideoId(handle)
    if (!videoId) {
        console.error('[YouTube] No hay stream activo para @' + handle)
        if (updatePlatformState) updatePlatformState('YT', 'disconnected')
        reconnectTimer = setTimeout(() => connect(username), 30000)
        return
    }
    
    console.log('[YouTube] Stream encontrado:', videoId)
    const { LiveChat } = require('youtube-chat')
    const chat = new LiveChat({ liveId: videoId })
    chatRef = chat

    chat.on('chat', item => {
        const text = item.message?.map(m => m.text||m.emojiText||'').join('') || ''
        if (!text) return
        updateStatus('YT', true)
        if (updatePlatformState) updatePlatformState('YT', 'connected')
        const avatar = item.author?.thumbnail?.url || null
        const isFirst = procesarUsuario(item.author.channelId, item.author.name, 'YT')
        emitMsg({ plat:'YT', type:'msg', user:item.author.name, userId:item.author.channelId,
                  avatar, text, isFirst,
                  badges:{mod:item.author.isChatModerator||item.author.isChatOwner, sub:item.author.isChatSponsor},
                  badgeUrls:[] })
    })
    
    chat.on('error', e => {
        const errMsg = e?.message || e
        // Error 429 = rate limit, esperar más tiempo
        if (String(errMsg).includes('429')) {
            console.error('[YouTube] Rate limit (429), esperando 60s')
            if (updatePlatformState) updatePlatformState('YT', 'error')
            updateStatus('YT', false)
            reconnectTimer = setTimeout(() => connect(username), 60000)
        } else {
            console.error('[YouTube] Error:', errMsg)
            if (updatePlatformState) updatePlatformState('YT', 'error')
            updateStatus('YT', false)
            reconnectTimer = setTimeout(() => connect(username), 30000)
        }
    })
    
    chat.on('end', () => {
        console.log('[YouTube] Stream terminado')
        updateStatus('YT', false)
        if (updatePlatformState) updatePlatformState('YT', 'disconnected')
        reconnectTimer = setTimeout(() => connect(username), 30000)
    })

    chat.start()
        .then(ok => {
            if (!ok) {
                console.error('[YouTube] No hay stream activo')
                if (updatePlatformState) updatePlatformState('YT', 'disconnected')
                reconnectTimer = setTimeout(() => connect(username), 30000)
            } else {
                if (updatePlatformState) updatePlatformState('YT', 'connected')
            }
        })
        .catch(e => {
            const errMsg = e?.message || e
            if (String(errMsg).includes('429')) {
                console.error('[YouTube] Rate limit (429), esperando 60s')
                if (updatePlatformState) updatePlatformState('YT', 'error')
                reconnectTimer = setTimeout(() => connect(username), 60000)
            } else {
                console.error('[YouTube] Error:', errMsg)
                if (updatePlatformState) updatePlatformState('YT', 'error')
                reconnectTimer = setTimeout(() => connect(username), 30000)
            }
        })
}

async function getLiveVideoId(handle) {
    try {
        const https = require('https')
        const url = `https://www.youtube.com/@${handle}/live`
        
        return new Promise((resolve, reject) => {
            https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
                let data = ''
                res.on('data', chunk => { data += chunk })
                res.on('end', () => {
                    // Extract video ID from page
                    const match = data.match(/"videoId":"([^"]+)"/)
                    if (match && match[1]) {
                        resolve(match[1])
                    } else {
                        resolve(null)
                    }
                })
            }).on('error', () => resolve(null))
        })
    } catch {
        return null
    }
}

module.exports = { init, connect, disconnect }
