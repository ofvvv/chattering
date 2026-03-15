// server/platforms/tiktok.js — Chattering v3.1
'use strict'

let emitMsg, emitEvento, updateStatus, updatePlatformState, procesarUsuario, addLikes
let reconnectTimer = null
let connRef = null
let reconnectAttempts = 0
let isConnected = false
const MAX_RECONNECT_ATTEMPTS = 5
const BASE_RECONNECT_DELAY = 15000
const PERIODIC_CHECK_DELAY = 60000 // Check every 60s for new streams

function init(deps) {
    emitMsg        = deps.emitMsg
    emitEvento     = deps.emitEvento
    updateStatus   = deps.updateStatus
    updatePlatformState = deps.updatePlatformState
    procesarUsuario = deps.procesarUsuario
    addLikes       = deps.addLikes
}

function disconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (connRef) { try { connRef.disconnect() } catch {}; connRef = null }
    isConnected = false
    updateStatus('TT', false)
    if (updatePlatformState) updatePlatformState('TT', 'disconnected')
}

function scheduleReconnect(user, reason) {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log(`[TikTok] Cambiando a chequeo periódico cada ${PERIODIC_CHECK_DELAY/1000}s para detectar streams nuevos`)
        reconnectAttempts = 0
        if (reconnectTimer) clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(() => connect(user), PERIODIC_CHECK_DELAY)
        return
    }
    
    reconnectAttempts++
    const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1), PERIODIC_CHECK_DELAY)
    console.log(`[TikTok] ${reason}. Reintentando en ${Math.round(delay/1000)}s (intento ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)
    
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(() => connect(user), delay)
}

function connect(user) {
    if (!user) return
    disconnect()
    if (updatePlatformState) updatePlatformState('TT', 'loading')
    
    const { WebcastPushConnection } = require('tiktok-live-connector')
    const conn = new WebcastPushConnection(user)
    connRef = conn

    conn.on('chat', d => {
        if (!isConnected) {
            console.log('[TikTok] ✓ Stream detectado, conectado exitosamente')
            isConnected = true
            if (updatePlatformState) updatePlatformState('TT', 'connected')
        }
        reconnectAttempts = 0
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
        console.log('[TikTok] Desconectado')
        isConnected = false
        updateStatus('TT', false)
        if (updatePlatformState) updatePlatformState('TT', 'disconnected')
        scheduleReconnect(user, 'Desconexión')
    })
    conn.connect()
        .then(() => { 
            console.log('[TikTok] Conectado a', user)
            updateStatus('TT', true)
            reconnectAttempts = 0
        })
        .catch(e => { 
            const errMsg = e?.message || e
            // Error de sessionId es esperado, no es crítico
            if (String(errMsg).includes('sessionId')) {
                console.error('[TikTok] Error: sessionId requerido (limitación de API)')
                if (updatePlatformState) updatePlatformState('TT', 'error')
            } else {
                console.error('[TikTok] Error:', errMsg)
                if (updatePlatformState) updatePlatformState('TT', 'error')
            }
            updateStatus('TT', false)
            scheduleReconnect(user, 'Error al conectar')
        })
}

module.exports = { init, connect, disconnect }
