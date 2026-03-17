console.log('--- ELECTRON.CJS V3 LOADED ---'); // Diagnóstico de recarga

'use strict'

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { fork } = require('child_process')

const IS_MAC = process.platform === 'darwin'
const IS_DEV = process.env.NODE_ENV === 'development'

const APP_DATA = app.getPath('userData')
const CONFIG_PATH = path.join(APP_DATA, 'config.json')

let mainWindow = null
let settingsWindow = null
let serverProcess = null
let serverPort = 3000

function loadConfig() {
    try {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    } catch {
        return {}
    }
}
let config = loadConfig()

function saveConfig(newConfig) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 4))
        config = newConfig
        if (mainWindow) {
            mainWindow.webContents.send('settings-updated');
            console.log('[Electron] Sent settings-updated event to mainWindow.');
        }
        return true
    } catch (e) {
        console.error('[Electron] Error saving config:', e)
        return false
    }
}

function startServer() {
    if (serverProcess) {
        console.log('[Electron] Killing existing server process...')
        serverProcess.kill()
    }
    const serverPath = path.join(__dirname, 'server.js')
    serverProcess = fork(serverPath, [], {
        env: { ...process.env, CONFIG_PATH, PORT: 0 },
        silent: false,
    })

    serverProcess.on('message', (msg) => {
        if (msg.type === 'ready' && msg.port) {
            serverPort = msg.port
            console.log(`[Electron] Server ready on port ${serverPort}`)
            if (mainWindow) {
                mainWindow.webContents.send('port-ready', serverPort)
            }
        }
    })

    serverProcess.on('exit', (code) => {
        console.log(`[Electron] Server process exited with code ${code}`)
    })
}

function createMainWindow() {
    const { width, height, x, y } = config.windowBounds || { width: 400, height: 600 }
    mainWindow = new BrowserWindow({
        width, height, x, y,
        minWidth: 300,
        minHeight: 400,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#111',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    })

    if (IS_DEV) {
        mainWindow.webContents.openDevTools({ mode: 'detach' })
    }

    mainWindow.loadFile('public/index.html')

    mainWindow.on('close', () => {
        if (mainWindow) {
            saveConfig({ ...config, windowBounds: mainWindow.getBounds() })
        }
    })

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

function createSettingsWindow() {
    if (settingsWindow) {
        settingsWindow.focus()
        return
    }
    settingsWindow = new BrowserWindow({
        width: 680, height: 750,
        parent: mainWindow,
        modal: true,
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    })
    settingsWindow.loadFile('public/settings.html')
    settingsWindow.on('closed', () => { settingsWindow = null })
}

app.whenReady().then(() => {
    if (config.disableHWAccel) {
        app.disableHardwareAcceleration()
    }
    startServer()
    createMainWindow()
})

app.on('window-all-closed', () => {
    if (serverProcess) serverProcess.kill()
    if (!IS_MAC) app.quit()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow()
    }
})

// --- IPC Handlers ---
console.log('--- ELECTRON.CJS: Registering IPC Handlers ---'); // Diagnóstico

// General
ipcMain.handle('get-config', () => loadConfig())
ipcMain.handle('save-settings', (e, newCfg) => saveConfig(newCfg))
ipcMain.handle('get-version', () => app.getVersion())
ipcMain.handle('open-external', (e, url) => shell.openExternal(url))
ipcMain.handle('sync-filters', (e, filters) => {
    console.log('[Electron] sync-filters HANDLER EXECUTED', filters); // Diagnóstico
    const currentConfig = loadConfig();
    currentConfig.blockedWords = filters.blocked || [];
    currentConfig.highlightWords = filters.highlight || [];
    return saveConfig(currentConfig);
});

// Main Window
ipcMain.on('open-settings', createSettingsWindow)
ipcMain.on('restart-server', startServer)

// Settings Window
ipcMain.on('close-settings', () => settingsWindow?.close())

// Twitch Auth Flow
ipcMain.handle('login-twitch', async () => {
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=w2q6ngvevmf1gkuu1ngiqwmyzqmjrt&redirect_uri=http://localhost:3000/oauth/callback&response_type=token&scope=chat:read+chat:edit+channel:moderate`
    await shell.openExternal(authUrl)
    return true
})

ipcMain.handle('download-emote', async (e, url, name) => {
    try {
        const saveDialog = await dialog.showSaveDialog({
            defaultPath: `${name}.gif`,
            filters: [{ name: 'Images', extensions: ['gif', 'png', 'jpg'] }]
        });
        if (saveDialog.canceled) return { ok: false, error: 'canceled' };

        const res = await fetch(url);
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(saveDialog.filePath, buffer);
        return { ok: true, path: saveDialog.filePath };
    } catch (err) {
        console.error('[DownloadEmote]', err);
        return { ok: false, error: err.message };
    }
});
