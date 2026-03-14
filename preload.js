const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    minimize:           () => ipcRenderer.send('win-minimize'),
    maximize:           () => ipcRenderer.send('win-maximize'),
    close:              () => ipcRenderer.send('win-close'),
    getConfig:          () => ipcRenderer.invoke('get-config'),
    saveConfig:         (c) => ipcRenderer.invoke('save-config', c),
    saveSettings:       (c) => ipcRenderer.invoke('save-settings', c),
    resetConfig:        () => ipcRenderer.invoke('reset-config'),
    setupComplete:      () => ipcRenderer.send('setup-complete'),
    openPopup:          (d) => ipcRenderer.invoke('open-popup', d),
    getPopupData:       () => ipcRenderer.invoke('get-popup-data'),
    getVersion:         () => ipcRenderer.invoke('get-version'),
    getLastSeenVersion: () => ipcRenderer.invoke('get-last-seen-version'),
    setLastSeenVersion: (v) => ipcRenderer.invoke('set-last-seen-version', v),
    openExternal:       (url)  => ipcRenderer.invoke('open-external', url),
    setAlwaysOnTop:     (flag) => ipcRenderer.invoke('set-always-on-top', flag),
    loginTwitch:        ()     => ipcRenderer.invoke('login-twitch'),
    previewSettings:    (p)    => ipcRenderer.invoke('preview-settings', p),
    openSettings:       ()     => ipcRenderer.invoke('open-settings'),
    closeSettings:      ()     => ipcRenderer.invoke('close-settings'),
    on: (ch, cb) => {
        const allowed = ['popup-data', 'config-updated', 'settings-saved']
        if (allowed.includes(ch)) ipcRenderer.on(ch, (_e, ...a) => cb(...a))
    }
})