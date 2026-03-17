// Contiene las funciones para cargar y recolectar datos del formulario de configuración.

function loadForm(config) {
    try {
        // General
        chk('alwaysOnTop', config.alwaysOnTop);

        // Cuentas (el input de usuario se maneja en accounts.js)
        set('twitchUser', config.twitchLogin);

        // Chat
        set('fontSize', config.fontSize || 13.5);
        set('avatarShape', config.avatarShape || 'circle');
        chk('hideBots', config.hideBots);
        chk('showTimestamps', config.showTimestamps !== false); // Default a true

        // Emotes
        chk('show7tvCanal', config.show7tvCanal);
        chk('showBttvCanal', config.showBttvCanal);

        // Apariencia
        set('theme', config.theme || 'dark');
        chk('compact', config.compact);
        chk('translucent', config.translucent);
        set('windowOpacity', config.windowOpacity || 90);

        // Moderación
        loadTags('blocked-words-list', config.blockedWords || []);
        loadTags('highlighted-words-list', config.highlightedWords || []);

    } catch (e) {
        window.electronAPI.logError(`[settings-form:loadForm] ${e.message}`);
        alert('Error al cargar los datos en el formulario.');
    }
}

function collectFormData() {
    try {
        const newCfg = {};

        // General
        newCfg.alwaysOnTop = get('alwaysOnTop');

        // Cuentas
        newCfg.twitchLogin = get('twitchUser'); // Guardamos el nombre de usuario de Twitch

        // Chat
        newCfg.fontSize = parseFloat(get('fontSize'));
        newCfg.avatarShape = get('avatarShape');
        newCfg.hideBots = get('hideBots');
        newCfg.showTimestamps = get('showTimestamps');

        // Emotes
        newCfg.show7tvCanal = get('show7tvCanal');
        newCfg.showBttvCanal = get('showBttvCanal');

        // Apariencia
        newCfg.theme = get('theme');
        newCfg.compact = get('compact');
        newCfg.translucent = get('translucent');
        newCfg.windowOpacity = parseInt(get('windowOpacity'), 10);

        // Moderación
        newCfg.blockedWords = getTags('blocked-words-list');
        newCfg.highlightedWords = getTags('highlighted-words-list');

        return newCfg;
    } catch (e) {
        window.electronAPI.logError(`[settings-form:collectFormData] ${e.message}`);
        alert('Error al recolectar los datos del formulario.');
        return null;
    }
}
