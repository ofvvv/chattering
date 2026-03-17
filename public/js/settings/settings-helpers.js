function set(id, v) { 
    const el = document.getElementById(id); 
    if (el) el.value = v; 
}

function chk(id, v) { 
    const el = document.getElementById(id); 
    if (el) el.checked = !!v; 
}

function openLink(url) {
    window.electronAPI.openExternal(url);
}
