// server/badges.js — Chattering v3.1
'use strict'
const { fetchJson } = require('./fetch')

const TWITCH_CLIENT_ID = 'w2q6ngvevmf1gkuu1ngiqwmyzqmjrt'
const cache = { global: {}, channel: {} }

// Convert Helix badge response array → { set_id: { versions: { id: {url1x, url2x} } } }
function helixToSets(data) {
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
}

async function loadGlobal(token) {
    // 1. Try Helix with token (most reliable, bypasses CDN DNS issues)
    if (token) {
        try {
            const data = await fetchJson('https://api.twitch.tv/helix/chat/badges/global', {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            })
            const sets = helixToSets(data)
            cache.global = { ...cache.global, ...sets }
            console.log('[Badges] Global (Helix):', Object.keys(sets).length, 'sets')
            return true
        } catch(e) { console.warn('[Badges] Helix global falló:', e.message) }
    }
    // 2. Fallback: legacy CDN
    try {
        const data = await fetchJson('https://badges.twitch.tv/v1/badges/global/display')
        cache.global = { ...cache.global, ...(data?.badge_sets||{}) }
        console.log('[Badges] Global (CDN):', Object.keys(cache.global).length, 'sets')
        return true
    } catch(e) {
        console.warn('[Badges] Global CDN falló:', e.message)
        // Schedule retry in 60s
        setTimeout(() => loadGlobal(token), 60000)
        return false
    }
}

async function loadChannel(channelId, token) {
    if (!channelId || cache.channel[channelId]) return
    cache.channel[channelId] = {} // mark attempted

    if (token) {
        try {
            const data = await fetchJson(
                `https://api.twitch.tv/helix/chat/badges?broadcaster_id=${channelId}`,
                { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${token}` }
            )
            cache.channel[channelId] = helixToSets(data)
            console.log('[Badges] Channel (Helix):', channelId, '→', Object.keys(cache.channel[channelId]).length, 'sets')
            return
        } catch(e) { console.warn('[Badges] Helix channel falló:', e.message) }
    }
    try {
        const data = await fetchJson(`https://badges.twitch.tv/v1/badges/channels/${channelId}/display`)
        cache.channel[channelId] = data?.badge_sets || {}
    } catch(e) { console.warn('[Badges] Channel CDN falló:', channelId, e.message) }
}

function resolve(badgeName, version, channelId) {
    const vStr = String(version)
    const sets = [channelId && cache.channel[channelId], cache.global].filter(Boolean)
    for (const set of sets) {
        if (!set[badgeName]) continue
        const vers = set[badgeName].versions || {}
        const v = vers[vStr] || vers['1'] || vers['0'] || Object.values(vers)[0]
        if (v) return v.image_url_2x || v.image_url_1x || null
    }
    return null
}

function buildBadgeUrls(tags, channelId) {
    const badges = tags?.badges || {}
    return Object.entries(badges)
        .map(([name, ver]) => { const url=resolve(name, ver, channelId); return url?{name,url}:null })
        .filter(Boolean)
}

function invalidateChannel(channelId) { delete cache.channel[channelId] }

module.exports = { loadGlobal, loadChannel, buildBadgeUrls, invalidateChannel }
