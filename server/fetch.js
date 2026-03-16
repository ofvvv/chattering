// server/fetch.js — Chattering v4.0 (ESM)
'use strict'

import https from 'https'
import http from 'http'

// Node 18+ tiene fetch nativo, que es más robusto en apps Electron empaquetadas.
const hasFetch = typeof globalThis.fetch === 'function'

export function fetchRaw(url, extraHeaders = {}) {
    if (hasFetch) {
        return globalThis.fetch(url, {
            headers: { 'User-Agent': 'Chattering/3.1', ...extraHeaders },
            signal: AbortSignal.timeout(10000)
        }).then(r => r.text())
    }

    // Fallback para Node < 18
    return new Promise((resolve, reject) => {
        const parsed = new URL(url)
        const opts = {
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: 'GET',
            headers: { 'User-Agent': 'Chattering/3.1', ...extraHeaders },
            timeout: 10000
        }
        const mod = parsed.protocol === 'https:' ? https : http
        const req = mod.request(opts, res => {
            let d = ''
            res.on('data', c => d += c)
            res.on('end', () => resolve(d))
        })
        req.on('error', reject)
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
        req.end()
    })
}

export async function fetchJson(url, headers = {}) {
    const text = await fetchRaw(url, headers)
    return JSON.parse(text)
}

export async function postJson(url, body, headers = {}) {
    if (hasFetch) {
        const r = await globalThis.fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Chattering/3.1', ...headers },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000)
        })
        return r.json()
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
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr), 'User-Agent': 'Chattering/3.1', ...headers },
            timeout: 10000
        }
        const req = https.request(opts, res => {
            let d = ''
            res.on('data', c => d += c)
            res.on('end', () => { try { resolve(JSON.parse(d)) } catch { resolve({}) } })
        })
        req.on('error', reject)
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
        req.write(bodyStr)
        req.end()
    })
}
