// server/fetch.js — Chattering v3.1
// Uses native fetch (Node 18+) or falls back to https module
// This avoids the getaddrinfo ENOTFOUND issue that plagues the https module in packaged Electron apps
'use strict'

const https = require('https')
const http  = require('http')

// Try native fetch first (Node 18+ / Electron 28+)
const hasFetch = typeof globalThis.fetch === 'function'

function fetchRaw(url, extraHeaders={}) {
    // Use native fetch if available — much more reliable in packaged apps
    if (hasFetch) {
        return globalThis.fetch(url, {
            headers: { 'User-Agent':'Chattering/3.1', ...extraHeaders },
            signal: AbortSignal.timeout(10000)
        }).then(r => r.text())
    }
    // Fallback: Node https/http
    return new Promise((resolve, reject) => {
        const parsed = new URL(url)
        const opts = {
            hostname: parsed.hostname,
            port:     parsed.port || (parsed.protocol==='https:'?443:80),
            path:     parsed.pathname + parsed.search,
            method:   'GET',
            headers:  { 'User-Agent':'Chattering/3.1', ...extraHeaders },
            timeout:  10000
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

async function fetchJson(url, headers={}) {
    const text = await fetchRaw(url, headers)
    return JSON.parse(text)
}

async function postJson(url, body, headers={}) {
    if (hasFetch) {
        const r = await globalThis.fetch(url, {
            method: 'POST',
            headers: { 'Content-Type':'application/json', 'User-Agent':'Chattering/3.1', ...headers },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000)
        })
        return r.json()
    }
    // Fallback POST
    return new Promise((resolve, reject) => {
        const bodyStr = JSON.stringify(body)
        const parsed  = new URL(url)
        const opts = {
            hostname: parsed.hostname,
            port:     parsed.port || 443,
            path:     parsed.pathname + parsed.search,
            method:   'POST',
            headers:  { 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(bodyStr), 'User-Agent':'Chattering/3.1', ...headers },
            timeout:  10000
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

module.exports = { fetchRaw, fetchJson, postJson }
