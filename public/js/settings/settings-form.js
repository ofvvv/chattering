function loadForm(cfg) {
    try {
        // General
        set('theme', cfg.theme || 'dark');
        set('fontSize', cfg.fontSize || 13.5);
        chk('compact', cfg.compact);
        chk('translucent', cfg.translucent);
        set('windowOpacity', cfg.windowOpacity || 90);

        // Chat
        set('avatarShape', cfg.avatarShape || 'circle');
        chk('hideBots', cfg.hideBots);
        chk('showTimestamps', cfg.showTimestamps);

        // Emotes
        chk('show7tvCanal', cfg.show7tvCanal);
        chk('showBttvCanal', cfg.showBttvCanal);

        // Notificaciones
        chk('soundsEnabled', cfg.soundsEnabled);

        // Moderación
        loadTags('blocked-words-list', cfg.blockedWords || []);
        loadTags('highlighted-words-list', cfg.highlightedWords || []);

    } catch (e) {
        window.electronAPI.logError(`[settings-loadForm] ${e.message}`);
        alert('Error al cargar los datos en el formulario de configuración.');
    }
}

function collectFormData() {
    try {
        const newCfg = {};

        // General
        newCfg.theme = get('theme');
        newCfg.fontSize = parseFloat(get('fontSize'));
        newCfg.compact = isChecked('compact');
        newCfg.translucent = isChecked('translucent');
        newCfg.windowOpacity = parseInt(get('windowOpacity'), 10);

        // Chat
        newCfg.avatarShape = get('avatarShape');
        newCfg.hideBots = isChecked('hideBots');
        newCfg.showTimestamps = isChecked('showTimestamps');

        // Emotes
        newCfg.show7tvCanal = isChecked('show7tvCanal');
        newCfg.showBttvCanal = isChecked('showBttvCanal');

        // Notificaciones
        newCfg.soundsEnabled = isChecked('soundsEnabled');

        // Moderación
        newCfg.blockedWords = getTags('blocked-words-list');
        newCfg.highlightedWords = getTags('highlighted-words-list');

        return newCfg;
    } catch (e) {
        window.electronAPI.logError(`[settings-collectFormData] ${e.message}`);
        alert('Error al recolectar los datos del formulario.');
        return null; // Devuelve null para indicar que la recolección falló
    }
}
