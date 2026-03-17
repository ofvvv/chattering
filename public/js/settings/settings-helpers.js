// Funciones de ayuda para obtener y establecer valores en el formulario.

function get(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    return el.type === 'checkbox' ? el.checked : el.value;
}

function set(id, value) {
    const el = document.getElementById(id);
    if (el) {
        if (el.type === 'checkbox') {
            el.checked = !!value;
        } else {
            el.value = value;
        }
    }
}

function chk(id, value) {
    const el = document.getElementById(id);
    if (el && el.type === 'checkbox') {
        el.checked = !!value;
    }
}

// Función para abrir enlaces externos, como en la versión antigua
function openLink(url) {
    window.electronAPI.openExternal(url);
}
