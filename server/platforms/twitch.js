// server/platforms/twitch.js — Chattering v4.0 (ESM)
'use strict'

import tmi from 'tmi.js'
import { fetchJson } from '../fetch.js'
import { buildBadgeUrls, loadChannel, loadGlobal, invalidateChannel } from '../badges.js'

const TWITCH_CLIENT_ID = 'w2q6ngvevmf1gkuu1ngiqwmyzqmjrt'

let clientRef = null
let channelId = null
let liveCheckTimer = null
let reconnectTimer = null
let emitMsg, emitEvento, updateStatus, procesarUsuario, config

export function init(deps) {
    try {
        emitMsg = deps.emitMsg
        emitEvento = deps.emitEvento
        updateStatus = deps.updateStatus
        procesarUsuario = deps.procesarUsuario
        config = deps.config
    } catch (e) {
        console.error('[Twitch] Critical error in init:', e.message, e.stack)
        throw e
    }
}

export async function checkLive(channel) {
    if (!channel || !config.twitchToken) {
        updateStatus('TW', false)
        return
    }
    try {
        const cleanToken = config.twitchToken.replace('oauth:', '')
        const data = await fetchJson(
            `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channel)}`,
            { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${cleanToken}` }
        )
        const live = Array.isArray(data?.data) && data.data.length > 0
        updateStatus('TW', live)
    } catch (e) {
        console.warn('[Twitch] checkLive failed:', e.message)
        updateStatus('TW', false)
    }
}

export function disconnect() {
    try {
        if (liveCheckTimer) { clearInterval(liveCheckTimer); liveCheckTimer = null }
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
        if (clientRef) {
            console.log('[Twitch] Disconnecting client...')
            if (clientRef.readyState() === 'OPEN') clientRef.disconnect()
        }
    } catch (e) {
        console.error('[Twitch] Error during disconnect:', e.message, e.stack)
    } finally {
        clientRef = null
        channelId = null
        updateStatus('TW', false)
    }
}

export function connect(channel) {
    try {
        if (!channel) return
        channel = channel.toLowerCase().replace('@', '')
        disconnect()
        console.log(`[Twitch] Attempting to connect to #${channel}...`)

        const identity = (config.twitchToken && config.twitchUser)
            ? { username: config.twitchUser.toLowerCase(), password: `oauth:${config.twitchToken.replace('oauth:', '')}` }
            : undefined

        const client = new tmi.Client({
            options: { debug: false, skipMembership: true },
            connection: { reconnect: false, secure: true },
            identity,
            channels: [channel]
        })
        clientRef = client

        client.on('message', (ch, tags, message, self) => {
            try {
                if (self) {
                    console.log(`[Twitch] Received self-message. Config showOwnMessages: ${config.showOwnMessages}`);
                }
                if (config.showOwnMessages === false && self) {
                    return console.log('[Twitch] Ignored self-message due to config.');
                }

                const user = tags['display-name'] || tags.username || 'unknown'
                const userId = tags['user-id']
                if (!userId) return

                if (tags['room-id'] && (!channelId || channelId !== tags['room-id'])) {
                    channelId = tags['room-id']
                    invalidateChannel(channelId)
                    loadChannel(channelId, config.twitchToken)
                }

                const badgeUrls = buildBadgeUrls(tags, channelId)
                const isFirst = procesarUsuario(userId, user, 'TW')
                
                if (tags['custom-reward-id']) {
                    emitEvento({ plat: 'TW', type: 'redeem', user, userId, avatar: null, text: message, rewardTitle: tags['custom-reward-id'], count: 0 })
                    return
                }
                
                const twitchEmotes = tags.emotes || {}
                emitMsg({ plat: 'TW', type: 'msg', user, userId, avatar: null, text: message, isFirst, badges: { mod: !!tags.mod, sub: !!tags.subscriber }, badgeUrls, twitchEmotes })
            } catch (e) { console.error('[Twitch] Error in onMessageHandler:', e.message, e.stack) }
        })
        
        client.on('subscription', (ch, username, method, message, userstate) => {
             try {
                const user = userstate['display-name'] || username
                const userId = userstate['user-id']
                emitEvento({ plat: 'TW', type: 'sub', user, userId, avatar: null, text: message || '', count: 1 })
            } catch (e) { console.error('[Twitch] Error in onSubscriptionHandler:', e.message, e.stack) }
        });

        client.on('resub', (ch, username, months, message, userstate, methods) => {
            try {
                const user = userstate['display-name'] || username
                const userId = userstate['user-id']
                emitEvento({ plat: 'TW', type: 'resub', user, userId, avatar: null, text: message || '', count: months || 1 })
            } catch (e) { console.error('[Twitch] Error in onResubHandler:', e.message, e.stack) }
        });
        
        client.on('subgift', (ch, username, streakMonths, recipient, methods, userstate) => {
             try {
                const gifter = userstate['display-name'] || username
                const gifterId = userstate['user-id']
                emitEvento({ plat: 'TW', type: 'gift', user: gifter, userId: gifterId, avatar: null, text: `regaló una sub a ${recipient}!`, count: 1 })
            } catch (e) { console.error('[Twitch] Error in onSubGiftHandler:', e.message, e.stack) }
        });
        
        client.on('cheer', (ch, userstate, message) => {
            try {
                const user = userstate['display-name'] || userstate.username
                const userId = userstate['user-id']
                const bits = parseInt(userstate.bits || '0', 10)
                emitEvento({ plat: 'TW', type: 'cheer', user, userId, avatar: null, text: message, count: bits })
            } catch (e) { console.error('[Twitch] Error in onCheerHandler:', e.message, e.stack) }
        });

        client.on('raid', (ch, username, viewers, userstate) => {
            try {
                const user = userstate['display-name'] || username
                const userId = userstate['user-id']
                emitEvento({ plat: 'TW', type: 'raid', user, userId, avatar: null, text: '', count: viewers || 0 })
            } catch (e) { console.error('[Twitch] Error in onRaidHandler:', e.message, e.stack) }
        });

        client.on('connected', (address, port) => {
            try {
                console.log(`[Twitch] Connected to ${address}:${port} in channel #${channel}`)
                updateStatus('TW', 'connected')
                checkLive(channel)
                if (liveCheckTimer) clearInterval(liveCheckTimer)
                liveCheckTimer = setInterval(() => checkLive(channel), 60000)
                if (config.twitchToken) loadGlobal(config.twitchToken)
                if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
            } catch (e) { console.error('[Twitch] Error in onConnectedHandler:', e.message, e.stack) }
        })

        client.on('disconnected', reason => {
            try {
                console.log('[Twitch] Disconnected. Reason:', reason)
                updateStatus('TW', false)
                if (liveCheckiver) { clearInterval(liveCheckTimer); liveCheckTimer = null }
                clientRef = null
                if (reason && !reason.includes('manual')) {
                    if (reconnectTimer) clearTimeout(reconnectTimer)
                    reconnectTimer = setTimeout(() => connect(channel), 10000)
                    console.log('[Twitch] Reconnecting in 10 seconds...')
                }
            } catch (e) { console.error('[Twitch] Error in onDisconnectedHandler:', e.message, e.stack) }
        })

        client.connect().catch(e => {
            console.error('[Twitch] Client failed to connect:', e?.message || e)
            if (reconnectTimer) clearTimeout(reconnectTimer)
            reconnectTimer = setTimeout(() => connect(channel), 10000)
        })

    } catch (e) {
        console.error('[Twitch] Critical error in connect function:', e.message, e.stack)
        updateStatus('TW', false)
        if (reconnectTimer) clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(() => connect(channel), 30000)
    }
}

export async function say(channel, text) {
    try {
        if (!clientRef || clientRef.readyState() !== 'OPEN') throw new Error('Not connected to Twitch chat.')
        if (!config.twitchToken) throw new Error('Twitch token is required to send messages.')
        const targetChannel = channel.startsWith('#') ? channel.toLowerCase() : `#${channel.toLowerCase()}`
        return clientRef.say(targetChannel, text)
    } catch (e) {
        console.error('[Twitch] Error sending message:', e.message)
        throw e
    }
}

export async function mod(channel, username, action, duration = 600, reason = '') {
    try {
        if (!clientRef || clientRef.readyState() !== 'OPEN') throw new Error('Not connected to Twitch chat.')
        if (!config.twitchToken) throw new Error('Twitch token is required for moderation.')
        
        const targetChannel = channel.startsWith('#') ? channel.toLowerCase() : `#${channel.toLowerCase()}`
        console.log(`[Twitch] Moderation action: ${action} on ${username} in ${targetChannel}`)

        switch (action) {
            case 'timeout':
                return clientRef.timeout(targetChannel, username, duration, reason)
            case 'ban':
                return clientRef.ban(targetChannel, username, reason)
            case 'unban':
                return clientRef.unban(targetChannel, username)
            case 'vip':
                return clientRef.vip(targetChannel, username)
            case 'unvip':
                return clientRef.unvip(targetChannel, username)
            case 'mod':
                return clientRef.mod(targetChannel, username)
            case 'unmod':
                return clientRef.unmod(targetChannel, username)
            default:
                throw new Error(`Unsupported moderation action: ${action}`)
        }
    } catch (e) {
        console.error(`[Twitch] Error performing ${action} on ${username}:`, e.message)
        throw e
    }
}

export function getChannelId() { return channelId }

export function isConnected() {
    return clientRef && clientRef.readyState() === 'OPEN'
}
