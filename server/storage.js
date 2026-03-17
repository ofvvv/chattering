// server/storage.js — Chattering v4.0 (ESM)
'use strict'

import fs from 'fs'
import path from 'path'
import initSqlJs from 'sql.js'

let db = null
let granTotalLikes = 0
let saveTimer = null

export const SESSION_START = Date.now()

let DATA_DIR, LOGS_DIR, DB_PATH

function init(dataDir) {
    try {
        DATA_DIR = dataDir
        DB_PATH = path.join(dataDir, 'stats.db')
        LOGS_DIR = path.join(dataDir, 'logs')
        if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })
        const OLD = path.join(dataDir, 'chat.db')
        if (fs.existsSync(OLD)) { try { fs.unlinkSync(OLD) } catch (e) { console.error('[Storage] Failed to delete old chat.db:', e.message)} }
    } catch (e) {
        console.error('[Storage] Critical error in init:', e.message, e.stack);
        throw e; // Re-throw to stop initialization
    }
}

export async function initDB(dataDir) {
    try {
        init(dataDir)
        const SQL = await initSqlJs()
        db = fs.existsSync(DB_PATH) ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database()
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                userId TEXT PRIMARY KEY, username TEXT, platform TEXT,
                firstSeen INTEGER DEFAULT (strftime('%s','now'))
            );
            CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT);
        `)
        granTotalLikes = parseInt(getState('totalLikes') ?? '0')
        console.log('[Storage] DB lista, logs en:', LOGS_DIR)
    } catch(e) {
        console.error('[Storage] FATAL: Could not initialize database:', e.message, e.stack);
        throw e;
    }
}

function scheduleSave() {
    if (saveTimer) return
    saveTimer = setTimeout(() => {
        saveTimer = null
        try { fs.writeFileSync(DB_PATH, Buffer.from(db.export())) } catch (e) { console.error('[Storage] Error saving database to disk:', e.message, e.stack) }
    }, 30000)
}

function dbRun(sql, params = []) { 
    try { db.run(sql, params) } 
    catch (e) { console.error('[Storage] DB run error:', e.message, `SQL: ${sql}`, `Params: ${params}`) } 
}
function dbGet(sql, params = []) { 
    try {
        const s = db.prepare(sql), r = s.getAsObject(params); s.free();
        return Object.keys(r).length ? r : null 
    } catch (e) {
        console.error('[Storage] DB get error:', e.message, `SQL: ${sql}`, `Params: ${params}`)
        return null
    }
}

export function procesarUsuario(userId, username, platform) {
    try {
        const existing = dbGet('SELECT 1 FROM users WHERE userId=?', [userId])
        dbRun('INSERT OR IGNORE INTO users (userId,username,platform) VALUES (?,?,?)', [userId, username, platform])
        scheduleSave()
        return !existing
    } catch(e) {
        console.error(`[Storage] Error in procesarUsuario for ${username} (${userId}):`, e.message, e.stack);
        return false;
    }
}

export function getState(key) { 
    try {
        return dbGet('SELECT value FROM state WHERE key=?', [key])?.value ?? null 
    } catch(e) {
        console.error(`[Storage] Error in getState for key ${key}:`, e.message, e.stack);
        return null;
    }
}
export function setState(key, value) { 
    try {
        dbRun('INSERT OR REPLACE INTO state (key,value) VALUES (?,?)', [key, String(value)])
        scheduleSave()
    } catch(e) {
        console.error(`[Storage] Error in setState for key ${key}:`, e.message, e.stack);
    }
}

function getLogPath() {
    const d = new Date()
    return path.join(LOGS_DIR, `chat-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.jsonl`)
}

export function appendLog(obj) { 
    try { fs.appendFileSync(getLogPath(), JSON.stringify(obj) + '\n') } 
    catch (e) { console.error('[Storage] Error in appendLog:', e.message, e.stack) }
}

function readLastLines(filepath, n) {
    try {
        if (!fs.existsSync(filepath)) return []
        const lines = fs.readFileSync(filepath, 'utf8').trim().split('\n').filter(Boolean)
        return lines.slice(-n).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
    } catch (e) {
        console.error(`[Storage] Error in readLastLines for ${filepath}:`, e.message, e.stack);
        return [];
    }
}

export function getHistory() { 
    try { return readLastLines(getLogPath(), 200).filter(l => l.type === 'msg').slice(-50) } 
    catch(e) { console.error(`[Storage] Error in getHistory:`, e.message, e.stack); return [] }
}
export function getDockHistory() { 
    try { return readLastLines(getLogPath(), 500).filter(l => (l.type === 'follow' || l.type === 'gift') && l.sessionStart === SESSION_START) } 
    catch(e) { console.error(`[Storage] Error in getDockHistory:`, e.message, e.stack); return [] }
}
export function getUserHistory(uid) {
    try {
        const results = []
        for (let i = 0; i < 7; i++) {
            const d = new Date(); d.setDate(d.getDate() - i)
            const p = path.join(LOGS_DIR, `chat-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.jsonl`)
            readLastLines(p, 1000).filter(l => l.userId === uid && l.type === 'msg').forEach(l => results.push(l))
        }
        return {
            prev: results.filter(l => l.sessionStart !== SESSION_START).map(l => l.text),
            curr: results.filter(l => l.sessionStart === SESSION_START).map(l => l.text)
        }
    } catch(e) {
        console.error(`[Storage] Error in getUserHistory for ${uid}:`, e.message, e.stack);
        return { prev: [], curr: [] };
    }
}

export function getTotalLikes() { return granTotalLikes }
export function addLikes(n) { 
    try {
        granTotalLikes += n; 
        setState('totalLikes', granTotalLikes); 
        return granTotalLikes 
    } catch(e) {
        console.error(`[Storage] Error in addLikes:`, e.message, e.stack);
        return granTotalLikes;
    }
}
