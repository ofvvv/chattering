const { app, BrowserWindow, ipcMain, screen, shell, safeStorage, nativeTheme } = require('electron')
const path   = require('path')
const fs     = require('fs')
const http   = require('http')
const { fork, exec } = require('child_process')
const ResourceMonitor = require('./resource-monitor.cjs')

let autoUpdater = null
if (app.isPackaged) {
    try { autoUpdater = require('electron-updater').autoUpdater } catch (e) { console.warn('[Updater] No disponible:', e?.message) }
}

// ─── LOG DE ERRORES Y LIMPIEZA ───────────────────────────────────────────────
const LOG_PATH = path.join(app.getPath('userData'), 'error.log')
try {
    // Si el log pesa más de 5MB, lo vaciamos para que no te llene el disco
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

// ─── TIKTOK SEAMLESS LOGIN (Automático) ──────────────────────────────────────
ipcMain.handle('login-tiktok', async () => {
    return new Promise((resolve) => {
        const ttWin = new BrowserWindow({
            width: 450, height: 700, title: "Iniciar sesión en TikTok",
            autoHideMenuBar: true, webPreferences: { partition: 'persist:tiktok', contextIsolation: true }
        });
        ttWin.loadURL('https://www.tiktok.com/login');
        
        const checkCookie = setInterval(async () => {
            if (ttWin.isDestroyed()) {
                clearInterval(checkCookie);
                resolve({ success: false, error: 'Ventana cerrada por el usuario' });
                return;
            }
            try {
                const cookies = await ttWin.webContents.session.cookies.get({ url: 'https://www.tiktok.com' });
                const sessionCookie = cookies.find(c => c.name === 'sessionid');
                
                if (sessionCookie && sessionCookie.value) {
                    clearInterval(checkCookie);
                    // Magia: Extraer tu @usuario de TikTok automáticamente
                    try {
                        const username = await ttWin.webContents.executeJavaScript(`
                            new Promise((resolve) => {
                                fetch('https://www.tiktok.com/passport/web/account/info/?aid=1459')
                                .then(r => r.json())
                                .then(d => {
                                    if (d && d.data && d.data.unique_id) resolve(d.data.unique_id);
                                    else throw new Error('No unique_id');
                                })
                                .catch(() => {
                                    try {
                                        const match = document.body.innerHTML.match(/"uniqueId":"([^"]+)"/);
                                        resolve(match ? match[1] : null);
                                    } catch(e) { resolve(null); }
                                });
                            });
                        `);
                        ttWin.close();
                        resolve({ success: true, sessionId: sessionCookie.value, username: username });
                    } catch (e) {
                        ttWin.close();
                        resolve({ success: true, sessionId: sessionCookie.value, username: null });
                    }
                }
            } catch (e) {}
        }, 2000);
    });
});
// ─── VERSIÓN ─────────────────────────────────────────────────────────────────
const APP_VERSION = app.getVersion() // v3.1
const SEEN_VERSION_PATH = path.join(app.getPath('userData'), 'last_seen_version.txt')

function getLastSeenVersion() {
    try { return fs.readFileSync(SEEN_VERSION_PATH, 'utf8').trim() }
    catch { return null }
}
function setLastSeenVersion(v) {
    try { fs.writeFileSync(SEEN_VERSION_PATH, v, 'utf8') } catch {}
}

// Changelog para streamers (mostrado tras actualización). Actualizar en cada release.
function getStreamerChangelog(version) {
    const notes = {
        '3.2.1': [
            'Fix de mejora en el sistema, rendimiento y estabilidad general.',
            'Nuevo sistema de vinculación de TikTok y Twitch.',
            'Corrección en fuga de memoria, límites y optimizaciones a CPU y RAM.',
            'Mejoras en la interfaz de configuración y setup.'
        ],
        // ... versiones anteriores
    }
    return notes[version] || notes['3.2.1'] || ['Mejoras y correcciones.']
}

// ─── ESTADO ──────────────────────────────────────────────────────────────────
let mainWindow   = null
let serverProc   = null
let pendingPopup = null
let dockWindow   = null
let isDockDetached = false
let resourceMonitor = null

// ─── PATHS según modo ────────────────────────────────────────────────────────
function getServerPath() {
    return app.isPackaged
        ? path.join(process.resourcesPath, 'server.js')
        : path.join(__dirname, 'server.js')
}
function getPublicPath() {
    return app.isPackaged
        ? path.join(process.resourcesPath, 'public')
        : path.join(__dirname, 'public')
}
function getNodeModulesPath() {
    return app.isPackaged
        ? path.join(app.getAppPath(), 'node_modules')
        : path.join(__dirname, 'node_modules')
}

// ─── KILL PORT ROBUSTO ───────────────────────────────────────────────────────
function killPort(port) {
    return new Promise(resolve => {
        // Intenta PowerShell primero, luego netstat como fallback
        const ps = `powershell -NoProfile -NonInteractive -Command "` +
            `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue ` +
            `| Select-Object -ExpandProperty OwningProcess ` +
            `| ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"`

        exec(ps, { timeout: 5000 }, (err) => {
            if (err) {
                // Fallback: CMD netstat
                exec(
                    `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /f /pid %a`,
                    { timeout: 5000, shell: 'cmd.exe' },
                    () => resolve()
                )
            } else {
                resolve()
            }
        })
    })
}

// ─── SERVER ──────────────────────────────────────────────────────────────────
// Arranca el servidor y espera señal 'ready' antes de resolver
// Si el servidor no responde en 10s, resuelve igual (timeout de seguridad)
function startServer() {
    return new Promise(async (resolve) => {
        // 1. Matar proceso anterior
        if (serverProc) {
            try { serverProc.kill('SIGKILL') } catch {}
            serverProc = null
            await new Promise(r => setTimeout(r, 600))
        }

        // 2. Liberar el puerto
        writeLog('[Main] Liberando puerto 3000...')
        await killPort(3000)
        await new Promise(r => setTimeout(r, 400))

        const serverPath  = getServerPath()
        const nodeModules = getNodeModulesPath()

        writeLog(`[Main] Arrancando servidor: ${serverPath}`)
        writeLog(`[Main] NODE_PATH: ${nodeModules}`)
        writeLog(`[Main] CONFIG_PATH: ${CONFIG_PATH}`)
        writeLog(`[Main] isPackaged: ${app.isPackaged}`)

        // Verificar que server.js existe
        if (!fs.existsSync(serverPath)) {
            writeLog(`[Main] ERROR: server.js no encontrado en ${serverPath}`)
            resolve()
            return
        }

        // 3. Fork del servidor
        serverProc = fork(serverPath, [], {
            env: {
                ...process.env,
                CONFIG_PATH,
                PORT: '3000',
                NODE_PATH: nodeModules,
                ELECTRON_RUN_AS_NODE: '1'
            },
            cwd: path.dirname(serverPath),
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        })

        // Capturar stdout/stderr del servidor al log
        serverProc.stdout?.on('data', d => writeLog(`[Server] ${d.toString().trim()}`))
        serverProc.stderr?.on('data', d => writeLog(`[Server ERR] ${d.toString().trim()}`))
        serverProc.on('error', e => writeLog(`[Server fork error] ${e.message}`))
        serverProc.on('exit', (code, signal) => {
            writeLog(`[Server exit] code=${code} signal=${signal}`)
            serverProc = null
        })

        // 4. Esperar señal 'ready' del servidor (con timeout de 12s)
        let resolved = false
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true
                writeLog('[Main] Timeout esperando servidor (12s) — cargando igual')
                resolve()
            }
        }, 12000)

        serverProc.on('message', msg => {
            writeLog(`[Server msg] ${JSON.stringify(msg)}`)
            if (msg?.type === 'ready' && !resolved) {
                resolved = true
                clearTimeout(timeout)
                writeLog('[Main] Servidor listo ✓')
                resolve()
            }
        })
    })
}

// ─── VENTANA PRINCIPAL ───────────────────────────────────────────────────────
function createMainWindow(isSetup) {
    const cfg = loadConfig() || {}
    const isTranslucent = cfg.translucent === true
    mainWindow = new BrowserWindow({
        width:           400,
        height:          700,
        minWidth:        320,
        minHeight:       500,
        frame:           false,
        transparent:     isTranslucent,
        backgroundColor: isTranslucent ? '#00000000' : '#111111',
        alwaysOnTop:     cfg.alwaysOnTop === true,
        opacity:         isTranslucent ? (cfg.windowOpacity||90)/100 : 1,
        webPreferences: {
            preload:          path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration:  false,
            webSecurity:      false,
            devTools:         !app.isPackaged
        }
    })

    const file = path.join(getPublicPath(), isSetup ? 'setup.html' : 'index.html')
    writeLog(`[Main] Cargando: ${file}`)
    mainWindow.loadFile(file)

    // Interceptar navegación — abrir cualquier URL externa en el navegador del sistema
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url)
        return { action: 'deny' }
    })
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith('file://')) {
            event.preventDefault()
            shell.openExternal(url)
        }
    })

    // F12 solo en desarrollo
    mainWindow.webContents.on('before-input-event', (event, input) => {
        // F5 = reload in dev and production
        if (input.key === 'F5') {
            event.preventDefault()
            mainWindow.webContents.reload()
            return
        }
        if (!app.isPackaged) {
            if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
                mainWindow.webContents.toggleDevTools()
            }
        }
    })

    mainWindow.on('closed', () => {
        if (serverProc) { try { serverProc.kill() } catch {} }
        app.quit()
    })
}

// ─── POPUP DE USUARIO ────────────────────────────────────────────────────────
const popupWindows = new Map()

function openPopupWindow(userData) {
    if (popupWindows.has(userData.userId)) {
        try { popupWindows.get(userData.userId).close() } catch {}
    }
    pendingPopup = userData

    const { x, y } = screen.getCursorScreenPoint()
    const display   = screen.getDisplayNearestPoint({ x, y })
    const { bounds } = display
    const W = 260, H = 400
    let px = x + 12, py = y + 12
    if (px + W > bounds.x + bounds.width)  px = x - W - 12
    if (py + H > bounds.y + bounds.height) py = y - H - 12

    const popup = new BrowserWindow({
        x: px, y: py, width: W, height: H,
        frame: false, backgroundColor: '#18181b',
        alwaysOnTop: true, resizable: false, skipTaskbar: true,
        webPreferences: {
            preload:          path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration:  false,
            webSecurity:      false,
            devTools:         false
        }
    })

    popup.loadFile(path.join(getPublicPath(), 'popup.html'))
    // Note: removed blur-to-close — causes issues with always-on-top mode
    // User closes popup with X button or Escape key
    popup.on('closed', () => popupWindows.delete(userData.userId))
    popupWindows.set(userData.userId, popup)
}

// ─── HARDWARE ACCELERATION ──────────────────────────────────────────────────
const cfg0 = (() => { try { return JSON.parse(require('fs').readFileSync(require('path').join(app.getPath('userData'), 'config.json'), 'utf8')) } catch { return {} } })()
if (cfg0.disableHWAccel) app.disableHardwareAcceleration()

app.whenReady().then(async () => {
    writeLog(`[Main] Chattering v${APP_VERSION} arrancando`)
    writeLog(`[Main] userData: ${app.getPath('userData')}`)

    const config = loadConfig()
    writeLog(`[Main] Config: ${config ? 'encontrada' : 'primera vez (setup)'}`)

    // Arrancamos el servidor SIEMPRE para que el Login de Twitch funcione en el Setup
    await startServer()

    if (config) {
        createMainWindow(false)
        mainWindow.loadFile(path.join(getPublicPath(), 'index.html'))
    } else {
        createMainWindow(true)
    }
    
    resourceMonitor = new ResourceMonitor(mainWindow, serverProc)
    resourceMonitor.start()
    setupAutoUpdater(config)
})

app.on('window-all-closed', () => {
    if (serverProc) { try { serverProc.kill() } catch {} }
    if (process.platform !== 'darwin') app.quit()
})

// ─── IPC ─────────────────────────────────────────────────────────────────────
ipcMain.on('win-minimize', () => mainWindow?.minimize())
ipcMain.handle('open-external',    (_e, url)  => { shell.openExternal(url); return true })
ipcMain.handle('set-always-on-top',(_e, flag) => { mainWindow?.setAlwaysOnTop(!!flag, flag ? 'floating' : 'normal'); if(flag) mainWindow?.setMovable(true); return true })
ipcMain.on('win-maximize', () => {
    if (!mainWindow) return
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
})
ipcMain.on('win-close', () => mainWindow?.close())

ipcMain.handle('get-config',  () => loadConfig())
ipcMain.handle('get-version', () => APP_VERSION)
ipcMain.handle('get-last-seen-version', () => getLastSeenVersion())
ipcMain.handle('set-last-seen-version', (_e, v) => { setLastSeenVersion(v); return true })

ipcMain.handle('save-config', async (_e, cfg) => {
    saveConfig(cfg)
    // Apply always-on-top immediately from saved config
    if (mainWindow) mainWindow.setAlwaysOnTop(cfg.alwaysOnTop === true, cfg.alwaysOnTop ? 'floating' : 'normal'); if(cfg.alwaysOnTop) mainWindow.setMovable(true)
    await startServer()
    mainWindow?.loadFile(path.join(getPublicPath(), 'index.html'))
    return true
})

ipcMain.on('setup-complete', async () => {
    await startServer()
    mainWindow?.loadFile(path.join(getPublicPath(), 'index.html'))
})


// ─── SETTINGS WINDOW ────────────────────────────────────────────────────────
let settingsWindow = null

function openSettingsWindow() {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.focus()
        return
    }
    settingsWindow = new BrowserWindow({
        width: 720, height: 540,
        minWidth: 600, minHeight: 440,
        frame: false,
        backgroundColor: '#18181b',
        parent: mainWindow,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false,
            devTools: !app.isPackaged
        }
    })
    settingsWindow.loadFile(path.join(getPublicPath(), 'settings.html'))
    settingsWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
    settingsWindow.on('closed', () => { settingsWindow = null })
}

ipcMain.handle('open-settings', () => { openSettingsWindow(); return true })
ipcMain.handle('close-settings', () => { settingsWindow?.close(); return true })

ipcMain.handle('save-settings', async (_e, cfg) => {
    saveConfig(cfg)
    if (mainWindow && !mainWindow.isDestroyed()) {
        // Apply always-on-top immediately
        mainWindow.setAlwaysOnTop(cfg.alwaysOnTop === true, cfg.alwaysOnTop ? 'floating' : 'normal'); if(cfg.alwaysOnTop) mainWindow.setMovable(true)
        // Apply opacity if translucent
        if (cfg.translucent) mainWindow.setOpacity((cfg.windowOpacity||90)/100)
        else mainWindow.setOpacity(1)
        // Notify frontend to update visual settings live (no reload)
        mainWindow.webContents.send('settings-saved', cfg)
    }
    // Tell the server to reload config and reconnect platforms
    if (serverProc) {
        try {
            const http = require('http')
            const req = http.request({ hostname:'localhost', port:3000, path:'/api/reconnect', method:'POST', headers:{'Content-Type':'application/json'} }, () => {})
            req.on('error', () => {}) // ignore if server not ready
            req.write('{}')
            req.end()
        } catch {}
    }
    // Close settings window after save
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        setTimeout(() => { try { settingsWindow.close() } catch {} }, 300)
    }
    return true
})

ipcMain.handle('preview-settings', (_e, partial) => {
    // Send partial config to main window for live preview (no server restart)
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('settings-saved', { ...((() => { try { return JSON.parse(require('fs').readFileSync(require('path').join(app.getPath('userData'), 'config.json'), 'utf8')) } catch { return {} } })()), ...partial })
    }
    return true
})

ipcMain.handle('open-popup',     (_e, userData) => { openPopupWindow(userData); return true })
ipcMain.handle('get-popup-data', () => pendingPopup)

ipcMain.handle('reset-config', async () => {
    try { fs.unlinkSync(CONFIG_PATH) } catch {}
    
    // Limpiar las cookies de TikTok para que pida login de nuevo
    try { 
        const { session } = require('electron');
        await session.fromPartition('persist:tiktok').clearStorageData();
    } catch (e) { writeLog('[Reset] Error borrando cookies de TT: ' + e.message); }
    
    if (serverProc) { try { serverProc.kill() } catch {}; serverProc = null }
    
    // SOLUCIÓN: Volver a arrancar el servidor para que Twitch OAuth funcione en el Setup
    await startServer()
    
    mainWindow?.loadFile(path.join(getPublicPath(), 'setup.html'))
    return true
})

// ─── AUTO-UPDATER (solo en build empaquetado) ─────────────────────────────────
let updateChangelogWindow = null

function showUpdateChangelogWindow(version, notes) {
    if (updateChangelogWindow && !updateChangelogWindow.isDestroyed()) return
    updateChangelogWindow = new BrowserWindow({
        width: 420,
        height: 380,
        resizable: false,
        frame: false,
        backgroundColor: '#18181b',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    })
    updateChangelogWindow.loadFile(path.join(getPublicPath(), 'update-changelog.html'))
    updateChangelogWindow.webContents.on('did-finish-load', () => {
        updateChangelogWindow?.webContents?.send('update-info', { version, notes })
    })
    updateChangelogWindow.on('closed', () => { updateChangelogWindow = null })
}

function setupAutoUpdater(config) {
    if (!autoUpdater) return
    if (config && config.autoUpdateDisabled === true) {
        writeLog('[Updater] Desactivado por el usuario')
        return
    }
    autoUpdater.on('update-available', () => { writeLog('[Updater] Actualización disponible, descargando...') })
    autoUpdater.on('update-not-available', () => { writeLog('[Updater] Ya estás al día') })
    autoUpdater.on('update-downloaded', (event, info) => {
        writeLog('[Updater] Descarga completada: v' + (info?.version || '?'))
        const notes = getStreamerChangelog(info?.version)
        showUpdateChangelogWindow(info?.version || app.getVersion(), notes)
    })
    autoUpdater.on('error', (e) => { writeLog('[Updater] Error: ' + (e?.message || e)) })
    autoUpdater.checkForUpdates().catch(() => {})
}

ipcMain.handle('quit-and-install', () => {
    if (autoUpdater) autoUpdater.quitAndInstall(false, true)
    return true
})

// ─── TWITCH OAUTH — usa Express en puerto 3000 como callback ─────────────────
// Ventaja: sin servidor extra, sin conflictos de puerto, solo 1 URL en Twitch console
// Configura en dev.twitch.tv → tu app → OAuth Redirect URLs: http://localhost:3000/oauth/callback
const TWITCH_CLIENT_ID = 'w2q6ngvevmf1gkuu1ngiqwmyzqmjrt'
const REDIRECT_URI     = 'http://localhost:3000/oauth/callback'
const OAUTH_SCOPES     = 'chat:read chat:edit channel:moderate moderator:manage:banned_users moderator:read:chat_settings'

// Pending promise resolver — set by login-twitch, resolved by /oauth/callback in Express
let _oauthResolve = null

// Express registers this route when it gets the token from the browser redirect
// main.js can't register Express routes directly, so we IPC it via the server process.
// Instead we just open the browser and poll /api/twitch/auth-status from the renderer.
ipcMain.handle('login-twitch', async () => {
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${encodeURIComponent(OAUTH_SCOPES)}&force_verify=true`
    shell.openExternal(authUrl)
    writeLog('[OAuth] Abriendo Twitch en navegador: ' + authUrl.slice(0, 80) + '...')

    // Return immediately — renderer polls /api/twitch/auth-status
    return { success: true, polling: true }
})

// ─── DOCK WINDOW (desacoplable) ──────────────────────────────────────────────
function createDockWindow() {
    if (dockWindow && !dockWindow.isDestroyed()) {
        dockWindow.focus()
        return
    }
    
    dockWindow = new BrowserWindow({
        width: 320,
        height: 180,
        minWidth: 280,
        minHeight: 140,
        frame: false,
        backgroundColor: '#18181b',
        alwaysOnTop: true,
        resizable: true,
        skipTaskbar: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false,
            devTools: !app.isPackaged
        }
    })
    
    dockWindow.loadFile(path.join(getPublicPath(), 'dock.html'))
    
    dockWindow.on('closed', () => {
        dockWindow = null
        isDockDetached = false
        // Notify main window to re-attach dock
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('dock-reattached')
        }
    })
    
    writeLog('[Dock] Ventana independiente creada')
}

ipcMain.handle('undock-dock', () => {
    if (isDockDetached) return { success: false, error: 'Dock already detached' }
    
    isDockDetached = true
    createDockWindow()
    
    // Notify main window to hide its dock
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('dock-detached')
    }
    
    return { success: true }
})

ipcMain.handle('redock-dock', () => {
    if (!isDockDetached) return { success: false, error: 'Dock not detached' }
    
    isDockDetached = false
    
    // Close dock window
    if (dockWindow && !dockWindow.isDestroyed()) {
        dockWindow.close()
    }
    
    // Notify main window to show its dock
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('dock-reattached')
    }
    
    return { success: true }
})

ipcMain.handle('send-dock-message', async (_e, data) => {
    // Forward message from dock window to server via HTTP
    const { platform, text } = data
    if (!text || !platform) return { success: false, error: 'Missing data' }
    
    try {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/send-message',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let body = ''
            res.on('data', chunk => body += chunk)
            res.on('end', () => {
                try {
                    const result = JSON.parse(body)
                    writeLog(`[Dock] Message sent: ${result.ok ? 'OK' : 'FAIL'}`)
                } catch {}
            })
        })
        
        req.on('error', (e) => {
            writeLog(`[Dock] Error sending message: ${e.message}`)
        })
        
        req.write(JSON.stringify({ platform, text }))
        req.end()
        
        return { success: true }
    } catch (e) {
        writeLog(`[Dock] Error: ${e.message}`)
        return { success: false, error: e.message }
    }
})