// server/fetch.js — Chattering v4.0 (ESM)
'use strict'

import https from 'https'
import http from 'http'

const hasFetch = typeof globalThis.fetch === 'function'

export async function fetchRaw(url, extraHeaders = {}) {
    try {
        if (hasFetch) {
            const response = await globalThis.fetch(url, {
                headers: { 'User-Agent': 'Chattering/4.0', ...extraHeaders },
                signal: AbortSignal.timeout(10000)
            })
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            return await response.text()
        }

        // Fallback para Node < 18
        return new Promise((resolve, reject) => {
            const parsed = new URL(url)
            const opts = {
                hostname: parsed.hostname,
                port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
                path: parsed.pathname + parsed.search,
                method: 'GET',
                headers: { 'User-Agent': 'Chattering/4.0', ...extraHeaders },
                timeout: 10000
            }
            const mod = parsed.protocol === 'https:' ? https : http
            const req = mod.request(opts, res => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return reject(new Error(`HTTP error! status: ${res.statusCode}`))
                }
                let d = ''
                res.on('data', c => d += c)
                res.on('end', () => resolve(d))
            })
            req.on('error', reject)
            req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
            req.end()
        })
    } catch (e) {
        console.error(`[Fetch] Error in fetchRaw for ${url}:`, e.message)
        throw e // Re-throw para que el llamante maneje el error
    }
}

export async function fetchJson(url, headers = {}) {
    try {
        const text = await fetchRaw(url, headers)
        return JSON.parse(text)
    } catch (e) {
        console.error(`[Fetch] Error in fetchJson parsing for ${url}:`, e.message)
        throw e
    }
}

export async function postJson(url, body, headers = {}) {
    try {
        if (hasFetch) {
            const response = await globalThis.fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'User-Agent': 'Chattering/4.0', ...headers },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(10000)
            })
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            return await response.json()
        }
        
        // Fallback para POST
        return new Promise((resolve, reject) => {
            const bodyStr = JSON.stringify(body)
            const parsed = new URL(url)
            const opts = {
                hostname: parsed.hostname,
                port: parsed.port || 443,
                path: parsed.pathname + parsed.search,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr), 'User-Agent': 'Chattering/4.0', ...headers },
                timeout: 10000
            }
            const req = https.request(opts, res => {
                 if (res.statusCode < 200 || res.statusCode >= 300) {
                    return reject(new Error(`HTTP error! status: ${res.statusCode}`))
                }
                let d = ''
                res.on('data', c => d += c)
                res.on('end', () => { try { resolve(JSON.parse(d)) } catch (e) { reject(new Error('JSON parse error')) } })
            })
            req.on('error', reject)
            req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
            req.write(bodyStr)
            req.end()
        })
    } catch(e) {
        console.error(`[Fetch] Error in postJson for ${url}:`, e.message)
        throw e
    }
}
