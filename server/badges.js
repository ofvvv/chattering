// server/badges.js — Chattering v4.0 (ESM)
'use strict'

import { fetchJson } from './fetch.js'

const TWITCH_CLIENT_ID = 'w2q6ngvevmf1gkuu1ngiqwmyzqmjrt'
const cache = { global: {}, channel: {} }
let globalRetryAttempts = 0
const MAX_GLOBAL_RETRIES = 3

function helixToSets(data) {
    try {
        const sets = {}
        for (const set of (data?.data || [])) {
            const versions = {}
            for (const v of (set.versions || [])) {
                versions[String(v.id)] = {
                    image_url_1x: v.image_url_1x,
                    image_url_2x: v.image_url_2x || v.image_url_4x || v.image_url_1x
                }
            }
            sets[set.set_id] = { versions }
        }
        return sets
    } catch (e) {
        console.error('[Badges] Error processing Helix data:', e.message, e.stack)
        return {}
    }
}

export async function loadGlobal(token) {
    try {
        if (token) {
            try {
                const data = await fetchJson('https://api.twitch.tv/helix/chat/badges/global', {
                    'Client-ID': TWITCH_CLIENT_ID,
                    'Authorization': `Bearer ${token}`
                })
                const sets = helixToSets(data)
                cache.global = { ...cache.global, ...sets }
                console.log('[Badges] Globales (Helix):', Object.keys(sets).length, 'sets cargados')
                globalRetryAttempts = 0
                return true
            } catch (e) {
                console.warn('[Badges] Fallo al cargar globales con Helix, usando fallback:', e.message)
            }
        }

        try {
            const data = await fetchJson('https://badges.twitch.tv/v1/badges/global/display')
            cache.global = { ...cache.global, ...(data?.badge_sets || {}) }
            console.log('[Badges] Globales (CDN):', Object.keys(cache.global).length, 'sets cargados')
            globalRetryAttempts = 0
            return true
        } catch (e) {
            if (globalRetryAttempts < MAX_GLOBAL_RETRIES) {
                globalRetryAttempts++
                console.warn(`[Badges] Fallo al cargar globales de CDN (intento ${globalRetryAttempts}/${MAX_GLOBAL_RETRIES}):`, e.message)
                setTimeout(() => loadGlobal(token), 60000)
            } else {
                console.error('[Badges] Máximo de reintentos para CDN alcanzado. Emblemas globales no disponibles.')
            }
            return false
        }
    } catch (e) {
        console.error('[Badges] Error catastrófico en loadGlobal:', e.message, e.stack)
        return false
    }
}

export async function loadChannel(channelId, token) {
    try {
        if (!channelId || cache.channel[channelId]) return
        cache.channel[channelId] = {} // Marcar como intentado

        if (token) {
            try {
                const data = await fetchJson(
                    `https://api.twitch.tv/helix/chat/badges?broadcaster_id=${channelId}`,
                    { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${token}` }
                )
                cache.channel[channelId] = helixToSets(data)
                console.log('[Badges] Canal (Helix):', channelId, '→', Object.keys(cache.channel[channelId]).length, 'sets cargados')
                return
            } catch (e) {
                console.warn('[Badges] Fallo al cargar emblemas de canal con Helix, usando fallback:', e.message)
            }
        }

        try {
            const data = await fetchJson(`https://badges.twitch.tv/v1/badges/channels/${channelId}/display`)
            cache.channel[channelId] = data?.badge_sets || {}
        } catch (e) {
            console.warn('[Badges] Fallo al cargar emblemas de canal de CDN:', channelId, e.message)
        }
    } catch (e) {
        console.error(`[Badges] Error catastrófico en loadChannel para ${channelId}:`, e.message, e.stack)
    }
}

function resolve(badgeName, version, channelId) {
    try {
        const vStr = String(version)
        const sets = [channelId && cache.channel[channelId], cache.global].filter(Boolean)
        for (const set of sets) {
            if (!set[badgeName]) continue
            const vers = set[badgeName].versions || {}
            const v = vers[vStr] || vers['1'] || vers['0'] || Object.values(vers)[0]
            if (v) return v.image_url_2x || v.image_url_1x || null
        }
        return null
    } catch (e) {
        console.error(`[Badges] Error en resolve para ${badgeName}:`, e.message)
        return null
    }
}

export function buildBadgeUrls(tags, channelId) {
    try {
        const badges = tags?.badges || {}
        return Object.entries(badges)
            .map(([name, ver]) => { const url = resolve(name, ver, channelId); return url ? { name, url } : null })
            .filter(Boolean)
    } catch (e) {
        console.error(`[Badges] Error en buildBadgeUrls:`, e.message, e.stack)
        return []
    }
}

export function invalidateChannel(channelId) { delete cache.channel[channelId] }
