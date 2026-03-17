function set(id, v) { 
    try {
        const el = document.getElementById(id); 
        if (el) el.value = v; 
    } catch (e) {
        window.electronAPI.logError(`[set] Helper failed for id=${id}: ${e.message}`);
    }
}

function chk(id, v) { 
    try {
        const el = document.getElementById(id); 
        if (el) el.checked = !!v; 
    } catch (e) {
        window.electronAPI.logError(`[chk] Helper failed for id=${id}: ${e.message}`);
    }
}

function openLink(url) {
    try {
        window.electronAPI.openExternal(url);
    } catch (e) {
        window.electronAPI.logError(`[openLink] Helper failed: ${e.message}`);
    }
}
