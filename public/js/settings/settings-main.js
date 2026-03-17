// ==========================================================================
// ATENCIÓN: Este es el script principal de la ventana de configuración.
// v5.0.0 - Migración desde settings-old.html
// ==========================================================================

let cfg = {};

async function init() {
    try {
        cfg = await window.electronAPI.getConfig() || {};
        loadForm(cfg);
        setupEventListeners();
        setupInitialUI();
        handlePlatformAuth();
        showInitialContent();
    } catch (e) {
        window.electronAPI.logError(`[settings-init] CRITICAL: ${e.message}`);
        alert('Error fatal al cargar la configuración. Revise los logs.');
    }
}

async function save() {
    try {
        const newConfig = collectFormData();
        const updatedConfig = { ...cfg, ...newConfig };

        await window.electronAPI.saveSettings(updatedConfig);
        
        // Mostramos una notificación (toast) como en la versión antigua
        if (window.electronAPI.showToast) {
            window.electronAPI.showToast('✓ Configuración guardada');
        }

        setTimeout(() => {
            window.electronAPI.closeSettings();
        }, 200);

    } catch (e) {
        window.electronAPI.logError(`[settings-save] ERROR: ${e.message}`);
        alert(`Hubo un error al guardar: ${e.message}.`);
    }
}

async function reset() {
    if (confirm('¿Volver al setup inicial? Se borrará la configuración.')) {
        try {
            await window.electronAPI.resetConfig();
        } catch (e) {
            window.electronAPI.logError(`[settings-reset] ${e.message}`);
            alert('Hubo un error al restaurar la configuración.');
        }
    }
}

// Listener para aplicar cambios guardados desde otras ventanas
window.electronAPI.on('settings-saved', (newCfg) => {
    cfg = newCfg;
    // Aquí podríamos llamar a funciones para actualizar la UI si es necesario
    // por ahora, lo mantenemos simple como en la versión anterior.
});

document.addEventListener('DOMContentLoaded', init);
