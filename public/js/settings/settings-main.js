const SERVER = 'http://localhost:3000';
let cfg = {};
let blockedWords = [], highlights = [];

// Los manejadores de socket y la lógica de cuentas estarán en su propio archivo,
// pero la instancia del socket se crea aquí para ser exportada si es necesario.
const socket = io(SERVER);

async function init() {
    // 1. Obtener la configuración
    cfg = (await window.electronAPI.getConfig()) || {};

    // 2. Cargar los datos en el formulario (esta función estará en settings-form.js)
    loadForm();

    // 3. Inicializar manejadores de eventos de la UI (estarán en settings-ui.js)
    initUIEventListeners();

    // 4. Inicializar manejadores de autenticación (estarán en settings-accounts.js)
    initAccountListeners();

    // 5. Obtener versión de la app
    window.electronAPI.getVersion().then(v => { 
        const el = document.getElementById('app-version'); 
        if(el) el.textContent = 'v' + v 
    }).catch(() => {});
}

async function guardar() {
    const statusEl = document.getElementById('save-status');
    statusEl.textContent = 'Guardando...';

    // La función que recolecta todos los datos del form estará en settings-form.js
    const newCfg = collectFormData();

    // Guardamos la nueva configuración
    await window.electronAPI.saveSettings(newCfg);
    cfg = newCfg; // Actualizamos la config en memoria

    statusEl.textContent = '✓ Guardado';
    setTimeout(() => statusEl.textContent = '', 3000);
}

async function resetConfig() {
    if (!confirm('¿Restablecer toda la configuración y volver al setup inicial?')) return;
    await window.electronAPI.resetConfig();
    window.close(); // Se cierra la ventana de configuración
}

// Arrancamos la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);
