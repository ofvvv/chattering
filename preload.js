const { contextBridge, ipcRenderer } = require('electron')

// Lista blanca de canales seguros para la comunicación bidireccional
const ALLOWED_CHANNELS = [
    'update-info', 'settings-saved', 'settings-preview', 'dock-detached', 'dock-reattached'
];

contextBridge.exposeInMainWorld('electronAPI', {
    // --- Invocaciones (Renderer -> Main) ---
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
    quitAndInstall:     () => ipcRenderer.invoke('quit-and-install'),
    openExternal:       (url)  => ipcRenderer.invoke('open-external', url),
    setAlwaysOnTop:     (flag) => ipcRenderer.invoke('set-always-on-top', flag),
    loginTwitch:        ()     => ipcRenderer.invoke('login-twitch'),
    loginTiktok:        ()     => ipcRenderer.invoke('login-tiktok'),
    previewSettings:    (p)    => ipcRenderer.invoke('preview-settings', p),
    openSettings:       ()     => ipcRenderer.invoke('open-settings'),
    closeSettings:      ()     => ipcRenderer.invoke('close-settings'),

    // --- Eventos (Main -> Renderer) ---
    on: (channel, callback) => {
        if (ALLOWED_CHANNELS.includes(channel)) {
            // Envuelve la llamada para pasar solo los argumentos de datos, no el objeto del evento
            const subscription = (_event, ...args) => callback(...args);
            ipcRenderer.on(channel, subscription);
            
            // Devuelve una función para anular la suscripción, buena práctica
            return () => {
                ipcRenderer.removeListener(channel, subscription);
            };
        } else {
            console.warn(`[Preload] Attempted to subscribe to an unallowed channel: ${channel}`);
            return () => {}; // Devuelve una función no-op si el canal no está permitido
        }
    }
});
