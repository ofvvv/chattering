// server/platforms/youtube.js — Chattering v4.0 (ESM)
'use strict'

import { LiveChat } from 'youtube-chat'
import https from 'https'

let emitMsg, emitEvento, updateStatus, updatePlatformState, procesarUsuario
let reconnectTimer = null
let chatRef = null

export function init(deps) {
    try {
        emitMsg = deps.emitMsg
        emitEvento = deps.emitEvento
        updateStatus = deps.updateStatus
        updatePlatformState = deps.updatePlatformState
        procesarUsuario = deps.procesarUsuario
    } catch (e) {
        console.error('[YouTube] Critical error in init:', e.message, e.stack)
        throw e
    }
}

export function disconnect() {
    try {
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
        if (chatRef) { 
            try { chatRef.stop('manual') } catch (e) { console.warn('[YouTube] Inner stop call failed:', e.message) }
        }
    } catch (e) {
        console.error('[YouTube] Error during disconnect:', e.message, e.stack)
    } finally {
        chatRef = null
        updateStatus('YT', false)
        if (updatePlatformState) updatePlatformState('YT', 'disconnected')
    }
}

async function getLiveVideoId(handle) {
    try {
        const url = `https://www.youtube.com/@${handle}/live`
        return new Promise((resolve, reject) => {
            const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
                let data = ''
                res.on('data', chunk => { data += chunk })
                res.on('end', () => {
                    const match = data.match(/"videoId":"([^"]+)"/)
                    resolve(match && match[1] ? match[1] : null)
                })
            })
            req.on('error', (e) => reject(new Error(`Failed to fetch YouTube page for @${handle}: ${e.message}`)))
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout fetching YouTube page')) })
        })
    } catch (e) {
        console.error(`[YouTube] Exception in getLiveVideoId for @${handle}:`, e.message, e.stack)
        return null
    }
}

export async function connect(username) {
    try {
        if (!username) return
        disconnect()
        if (updatePlatformState) updatePlatformState('YT', 'loading')
        console.log(`[YouTube] Attempting to find live stream for @${username}...`)

        const handle = username.replace('@', '')
        const videoId = await getLiveVideoId(handle)

        if (!videoId) {
            console.log(`[YouTube] @${handle} appears to be offline. Retrying in 60s.`)
            if (updatePlatformState) updatePlatformState('YT', 'disconnected')
            reconnectTimer = setTimeout(() => connect(username), 60000)
            return
        }

        console.log(`[YouTube] Stream found for @${handle}: ${videoId}`)
        const chat = new LiveChat({ liveId: videoId })
        chatRef = chat

        chat.on('chat', item => {
            try {
                let text = ''
                const ytEmotes = []
                if (item.message) {
                    item.message.forEach((m, i) => {
                        if (m.text) {
                            text += m.text
                        } else if (m.url) {
                            const ph = `__YT_EMOTE_${i}__`
                            text += ph
                            ytEmotes.push({ placeholder: ph, url: m.url, name: m.alt || m.emojiText || 'emote' })
                        }
                    })
                }
                if (!text || !item.author?.channelId) return

                updateStatus('YT', true)
                if (updatePlatformState) updatePlatformState('YT', 'connected')

                const avatar = item.author?.thumbnail?.url || null
                const isFirst = procesarUsuario(item.author.channelId, item.author.name, 'YT')

                emitMsg({ plat: 'YT', type: 'msg', user: item.author.name, userId: item.author.channelId, avatar, text, isFirst, badges: { mod: item.author.isChatModerator || item.author.isChatOwner, sub: item.author.isChatSponsor }, badgeUrls: item.author.badge?.icons?.map(b => ({name: b.tooltip, url: b.url})) || [], ytEmotes })
            } catch (e) { console.error('[YouTube] Error in onChat handler:', e.message, e.stack) }
        })

        chat.on('error', e => {
            try {
                const errMsg = e?.message || e
                const delay = String(errMsg).includes('429') ? 60000 : 30000
                console.error(`[YouTube] Connector Error: ${errMsg}. Retrying in ${delay / 1000}s`)
                disconnect()
                reconnectTimer = setTimeout(() => connect(username), delay)
            } catch(e) { console.error('[YouTube] FATAL: Error in onError handler:', e.message, e.stack) }
        })

        chat.on('end', (reason) => {
            try {
                if (reason === 'manual') return console.log('[YouTube] Connection manually stopped.')
                console.log('[YouTube] Stream ended. Retrying in 60s')
                disconnect()
                reconnectTimer = setTimeout(() => connect(username), 60000)
            } catch(e) { console.error('[YouTube] FATAL: Error in onEnd handler:', e.message, e.stack) }
        })

        const ok = await chat.start()
        if (ok) {
            console.log(`[YouTube] Connected to chat for ${videoId}`)
            if (updatePlatformState) updatePlatformState('YT', 'connected')
        } else {
            console.log(`[YouTube] Failed to start chat for @${handle}. Assuming offline. Retrying in 60s.`)
            disconnect()
            reconnectTimer = setTimeout(() => connect(username), 60000)
        }

    } catch (e) {
        const errMsg = e?.message || e
        const delay = String(errMsg).includes('429') ? 60000 : 30000
        console.error(`[YouTube] Critical error in connect function: ${errMsg}. Retrying in ${delay / 1000}s`, e.stack)
        disconnect()
        reconnectTimer = setTimeout(() => connect(username), delay)
    }
}
