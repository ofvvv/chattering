// server/platforms/youtube.js — Chattering v4.0 (ESM)
'use strict'

import { LiveChat } from 'youtube-chat'
import https from 'https'

let emitMsg, emitEvento, updateStatus, updatePlatformState, procesarUsuario
let reconnectTimer = null
let chatRef = null

export function init(deps) {
    emitMsg = deps.emitMsg
    emitEvento = deps.emitEvento
    updateStatus = deps.updateStatus
    updatePlatformState = deps.updatePlatformState
    procesarUsuario = deps.procesarUsuario
}

export function disconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (chatRef) { try { chatRef.stop() } catch { }; chatRef = null }
    updateStatus('YT', false)
    if (updatePlatformState) updatePlatformState('YT', 'disconnected')
}

async function getLiveVideoId(handle) {
    try {
        const url = `https://www.youtube.com/@${handle}/live`
        return new Promise((resolve) => {
            https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
                let data = ''
                res.on('data', chunk => { data += chunk })
                res.on('end', () => {
                    const match = data.match(/"videoId":"([^"]+)"/)
                    resolve(match && match[1] ? match[1] : null)
                })
            }).on('error', () => resolve(null))
        })
    } catch {
        return null
    }
}

export async function connect(username) {
    if (!username) return
    disconnect()
    if (updatePlatformState) updatePlatformState('YT', 'loading')

    const handle = username.replace('@', '')
    const videoId = await getLiveVideoId(handle)

    if (!videoId) {
        console.log(`[YouTube] @${handle} está offline. Reintentando en 60s...`)
        if (updatePlatformState) updatePlatformState('YT', 'disconnected')
        reconnectTimer = setTimeout(() => connect(username), 60000)
        return
    }

    console.log('[YouTube] Stream encontrado:', videoId)
    const chat = new LiveChat({ liveId: videoId })
    chatRef = chat

    chat.on('chat', item => {
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

        if (!text) return
        updateStatus('YT', true)
        if (updatePlatformState) updatePlatformState('YT', 'connected')

        const avatar = item.author?.thumbnail?.url || null
        const isFirst = procesarUsuario(item.author.channelId, item.author.name, 'YT')

        emitMsg({ plat: 'YT', type: 'msg', user: item.author.name, userId: item.author.channelId, avatar, text, isFirst, badges: { mod: item.author.isChatModerator || item.author.isChatOwner, sub: item.author.isChatSponsor }, badgeUrls: [], ytEmotes })
    })

    chat.on('error', e => {
        const errMsg = e?.message || e
        const delay = String(errMsg).includes('429') ? 60000 : 30000;
        console.error(`[YouTube] Error: ${errMsg}. Reintentando en ${delay / 1000}s`)
        if (updatePlatformState) updatePlatformState('YT', 'error')
        updateStatus('YT', false)
        reconnectTimer = setTimeout(() => connect(username), delay)
    })

    chat.on('end', () => {
        console.log('[YouTube] Stream terminado. Reintentando en 60s')
        updateStatus('YT', false)
        if (updatePlatformState) updatePlatformState('YT', 'disconnected')
        reconnectTimer = setTimeout(() => connect(username), 60000)
    })

    try {
        const ok = await chat.start()
        if (!ok) {
            console.log(`[YouTube] @${handle} está offline. Reintentando en 60s...`)
            if (updatePlatformState) updatePlatformState('YT', 'disconnected')
            reconnectTimer = setTimeout(() => connect(username), 60000)
        } else {
            if (updatePlatformState) updatePlatformState('YT', 'connected')
        }
    } catch(e) {
        const errMsg = e?.message || e
        const delay = String(errMsg).includes('429') ? 60000 : 30000;
        console.error(`[YouTube] Error al iniciar: ${errMsg}. Reintentando en ${delay / 1000}s`)
        if (updatePlatformState) updatePlatformState('YT', 'error')
        reconnectTimer = setTimeout(() => connect(username), delay)
    }
}
