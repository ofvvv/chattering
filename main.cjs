console.log('--- MAIN.CJS V1 LOADED ---');
const { app, BrowserWindow, ipcMain, screen, shell, safeStorage, nativeTheme } = require('electron')
const path   = require('path')
const fs     = require('fs')
const http   = require('http')
const { fork, exec } = require('child_process')
const ResourceMonitor = require('./resource-monitor.cjs')

let autoUpdater = null
if (app.isPackaged) {
    try { autoUpdater = require('electron-updater').autoUpdater } catch (e) { console.warn('[Updater] Not available:', e?.message) }
}

// ─── LOGGING ─────────────────────────────────────────────────────────────────
const LOG_PATH = path.join(app.getPath('userData'), 'error.log')
try {
    if (fs.existsSync(LOG_PATH) && fs.statSync(LOG_PATH).size > 5 * 1024 * 1024) {
        fs.writeFileSync(LOG_PATH, '')
    }
} catch {}

function writeLog(msg) {
    const line = `[${new Date().toISOString()}] ${msg}\n`
    try { fs.appendFileSync(LOG_PATH, line) } catch {}
    console.log(msg)
}
process.on('uncaughtException',  e => writeLog(`[CRASH] ${e.message}\n${e.stack}`))
process.on('unhandledRejection', e => writeLog(`[REJECT] ${e?.message || e}`))

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json')

function loadConfig() {
    try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) } 
    catch { return null }
}
function saveConfig(cfg) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8')
}

// ─── VERSION & CHANGELOG ───────────────────────────────────────────────────
const APP_VERSION = app.getVersion()
const SEEN_VERSION_PATH = path.join(app.getPath('userData'), 'last_seen_version.txt')

function getLastSeenVersion() {
    try { return fs.readFileSync(SEEN_VERSION_PATH, 'utf8').trim() } 
    catch { return null }
}
function setLastSeenVersion(v) {
    try { fs.writeFileSync(SEEN_VERSION_PATH, v, 'utf8') } catch {}
}

function getStreamerChangelog(version) {
    const notes = {
        '3.5.0': [
            '✨ ¡Soporte completo para emotes de 7TV, BTTV, FFZ y YouTube!',
            '🐛 Corregidos los temas visuales, que no se aplicaban correctamente.',
            '🐛 Arreglado el bug que impedía redimensionar el dock de eventos.',
            '🔧 Mejorada la lógica para priorizar emotes largos (ej: LULW sobre LUL).'
        ],
        '3.4.0': [
            'Modernización Interna del Código a ES Modules.'
        ],
    }
    return notes[version] || ['Mejoras y correcciones generales.']
}

// ─── STATE ───────────────────────────────────────────────────────────────────
let mainWindow = null
let serverProc = null
let pendingPopup = null

// ─── PATHS ───────────────────────────────────────────────────────────────────
const APP_ROOT = app.isPackaged ? path.join(__dirname, '..') : __dirname

function getResourcePath(...parts) {
    return path.join(app.isPackaged ? process.resourcesPath : __dirname, ...parts)
}

// ─── SERVER PROCESS ──────────────────────────────────────────────────────────

async function killPort(port) {
    const command = process.platform === 'win32'
        ? `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /f /pid %a`
        : `lsof -i tcp:${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`
    return new Promise(resolve => {
        exec(command, { shell: process.platform === 'win32' ? 'cmd.exe' : true }, () => resolve())
    })
}

function startServer() {
    return new Promise(async (resolve) => {
        if (serverProc) {
            try { serverProc.kill('SIGKILL') } catch {}
            serverProc = null
            await new Promise(r => setTimeout(r, 500))
        }

        writeLog('[Main] Releasing port 3000...')
        await killPort(3000)
        await new Promise(r => setTimeout(r, 300))

        const serverPath = path.join(__dirname, 'server.js')
        writeLog(`[Main] Starting server: ${serverPath}`)
        writeLog(`[Main] Working directory: ${__dirname}`)

        if (!fs.existsSync(serverPath)) {
            writeLog(`[Main] FATAL: server.js not found at ${serverPath}`)
            return resolve()
        }

        serverProc = fork(serverPath, [], {
            cwd: __dirname,
            env: { ...process.env, CONFIG_PATH, PORT: '3000', ELECTRON_RUN_AS_NODE: '1' },
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        })

        serverProc.stdout?.on('data', d => writeLog(`[Server] ${d.toString().trim()}`))
        serverProc.stderr?.on('data', d => writeLog(`[Server ERR] ${d.toString().trim()}`))
        serverProc.on('error', e => writeLog(`[Server fork error] ${e.message}`))
        serverProc.on('exit', (code, signal) => {
            writeLog(`[Server exit] code=${code} signal=${signal}`)
            serverProc = null
        })

        let resolved = false
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true
                writeLog('[Main] Server start timed out (12s) - proceeding anyway.')
                resolve()
            }
        }, 12000)

        serverProc.on('message', msg => {
            if (msg?.type === 'ready' && !resolved) {
                resolved = true
                clearTimeout(timeout)
                writeLog('[Main] Server is ready ✓')
                resolve()
            }
        })
    })
}

// ─── MAIN WINDOW ─────────────────────────────────────────────────────────────
function createMainWindow(isSetup) {
    const cfg = loadConfig() || {}
    const isTranslucent = cfg.translucent === true
    mainWindow = new BrowserWindow({
        width: 400, height: 700, minWidth: 320, minHeight: 500,
        frame: false,
        transparent: isTranslucent,
        backgroundColor: isTranslucent ? '#00000000' : '#111111',
        alwaysOnTop: cfg.alwaysOnTop === true,
        opacity: isTranslucent ? (cfg.windowOpacity || 90) / 100 : 1,
        icon: getResourcePath('assets', 'icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false,
            devTools: !app.isPackaged
        }
    })

    const fileToLoad = isSetup ? 'setup.html' : 'index.html'
    const filePath = path.join(__dirname, 'public', fileToLoad)
    writeLog(`[Main] Loading file: ${filePath}`)
    mainWindow.loadFile(filePath)

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url); return { action: 'deny' }
    })
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith('file://')) {
            event.preventDefault(); shell.openExternal(url)
        }
    })

    mainWindow.on('closed', () => { app.quit() })
}

// ─── APP LIFECYCLE ───────────────────────────────────────────────────────────

if (!app.requestSingleInstanceLock()) {
    app.quit()
}
app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
    }
})

const initialConfig = loadConfig()
if (initialConfig?.disableHWAccel) app.disableHardwareAcceleration()

app.on('quit', () => {
    if (serverProc) { try { serverProc.kill() } catch {} }
})

app.whenReady().then(async () => {
    writeLog(`[Main] Chattering v${APP_VERSION} starting up`)
    writeLog(`[Main] App Path: ${app.getAppPath()}`)
    writeLog(`[Main] __dirname: ${__dirname}`)
    writeLog(`[Main] isPackaged: ${app.isPackaged}`)

    await startServer()

    const config = loadConfig()
    createMainWindow(!config)
    
    setupAutoUpdater(config)
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

// ─── IPC HANDLERS ────────────────────────────────────────────────────────────
writeLog('--- MAIN.CJS: Registering IPC Handlers ---');

ipcMain.on('log-error', (_event, errorLog) => {
    writeLog(`[Renderer Process] ${errorLog}`);
});

ipcMain.on('win-minimize', () => mainWindow?.minimize())
ipcMain.on('win-maximize', () => { mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize() })
ipcMain.on('win-close', () => mainWindow?.close())
ipcMain.handle('set-always-on-top', (_e, flag) => { mainWindow?.setAlwaysOnTop(!!flag, 'floating'); if(flag) mainWindow?.setMovable(true) })

ipcMain.handle('open-external', (_e, url) => { shell.openExternal(url) })
ipcMain.handle('get-version', () => APP_VERSION)

ipcMain.handle('get-config', () => loadConfig())
ipcMain.handle('save-config', async (_e, cfg) => {
    saveConfig(cfg)
    mainWindow?.setAlwaysOnTop(cfg.alwaysOnTop === true, 'floating')
    await startServer()
    mainWindow?.loadFile(path.join(__dirname, 'public', 'index.html'))
    return true
})
ipcMain.on('setup-complete', async () => {
    await startServer()
    mainWindow?.loadFile(path.join(__dirname, 'public', 'index.html'))
})
ipcMain.handle('reset-config', async () => {
    try { fs.unlinkSync(CONFIG_PATH) } catch {}
    try { 
        await require('electron').session.fromPartition('persist:tiktok').clearStorageData()
    } catch (e) { writeLog('[Reset] Failed to clear TikTok session: ' + e.message) }
    
    await startServer()
    mainWindow?.loadFile(path.join(__dirname, 'public', 'setup.html'))
    return true
})

let settingsWindow = null
ipcMain.handle('open-settings', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) { settingsWindow.focus(); return }
    settingsWindow = new BrowserWindow({
        width: 720, height: 540, minWidth: 600, minHeight: 440,
        frame: false, backgroundColor: '#18181b', parent: mainWindow,
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
    })
    settingsWindow.loadFile(path.join(__dirname, 'public', 'settings.html'))
    settingsWindow.on('closed', () => { settingsWindow = null })
})
ipcMain.handle('close-settings', () => { settingsWindow?.close() })

ipcMain.handle('preview-settings', (event, partialConfig) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('settings-preview', partialConfig);
    }
});


ipcMain.handle('sync-filters', (e, filters) => {
    writeLog(`[Main] SYNC-FILTERS HANDLER EXECUTED. Data: ${JSON.stringify(filters)}`);
    const currentConfig = loadConfig() || {};
    currentConfig.blockedWords = filters.blocked || [];
    currentConfig.highlightWords = filters.highlight || [];
    saveConfig(currentConfig);
    return true;
});

ipcMain.handle('save-settings', async (_e, cfg) => {
    saveConfig(cfg)
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(cfg.alwaysOnTop === true, 'floating')
        if (cfg.translucent) mainWindow.setOpacity((cfg.windowOpacity||90)/100)
        else mainWindow.setOpacity(1)
        mainWindow.webContents.send('settings-saved', cfg)
    }
    if (serverProc) {
        try {
            http.request({ hostname:'localhost', port:3000, path:'/api/reconnect', method:'POST' }).end()
        } catch(e) { writeLog('Failed to send reconnect signal: ' + e.message) }
    }
    if (settingsWindow && !settingsWindow.isDestroyed()) {
         try { settingsWindow.close() } catch {}
    }
    return true
})

ipcMain.handle('get-last-seen-version', () => getLastSeenVersion())
ipcMain.handle('set-last-seen-version', (_e, v) => { setLastSeenVersion(v) })

ipcMain.handle('open-popup', (_e, userData) => { openPopupWindow(userData) })
ipcMain.handle('get-popup-data', () => pendingPopup)

const TWITCH_CLIENT_ID = 'w2q6ngvevmf1gkuu1ngiqwmyzqmjrt'
const REDIRECT_URI     = 'http://localhost:3000/oauth/callback'
const OAUTH_SCOPES     = 'chat:read chat:edit channel:moderate moderator:manage:banned_users user:manage:chat_color'

ipcMain.handle('login-twitch', async () => {
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${encodeURIComponent(OAUTH_SCOPES)}&force_verify=true`
    shell.openExternal(authUrl)
    writeLog('[OAuth] Opening Twitch auth in browser...')
    return { success: true }
})

let updateChangelogWindow = null
function setupAutoUpdater(config) {
    if (!autoUpdater) return
    if (config?.autoUpdateDisabled === true) {
        writeLog('[Updater] Disabled by user.'); return
    }
    autoUpdater.on('update-available', () => { writeLog('[Updater] Update available, downloading...') })
    autoUpdater.on('update-downloaded', (info) => {
        writeLog('[Updater] Download complete: v' + info.version)
        const notes = getStreamerChangelog(info.version)
        if (updateChangelogWindow && !updateChangelogWindow.isDestroyed()) return
        updateChangelogWindow = new BrowserWindow({
            width: 420, height: 380, resizable: false, frame: false, backgroundColor: '#18181b',
            webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
        })
        updateChangelogWindow.loadFile(path.join(__dirname, 'public', 'update-changelog.html'))
        updateChangelogWindow.webContents.on('did-finish-load', () => {
            updateChangelogWindow?.webContents?.send('update-info', { version: info.version, notes })
        })
    })
    autoUpdater.on('error', (e) => { writeLog('[Updater] Error: ' + (e?.message || e)) })
    autoUpdater.checkForUpdates().catch(() => {})
}
ipcMain.handle('quit-and-install', () => {
    if (autoUpdater) autoUpdater.quitAndInstall(true, true)
})