let cfg = {};

async function init() {
    try {
        cfg = await window.electronAPI.getConfig() || {};
        loadForm(cfg);
        setupEventListeners();
        setupInitialUI();
        showInitialContent();
        handlePlatformAuth();
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
        
        // Cerrar la ventana después de un pequeño retraso para asegurar que se guarda
        setTimeout(() => {
            window.electronAPI.closeSettings();
        }, 200);

    } catch (e) {
        window.electronAPI.logError(`[settings-save] ${e.message}`);
        alert('Hubo un error al guardar la configuración.');
    }
}

async function reset() {
    try {
        if (confirm('¿Está seguro de que desea restaurar toda la configuración a los valores de fábrica? Esta acción es irreversible.')) {
            await window.electronAPI.resetConfig();
            alert('La configuración ha sido restaurada. La aplicación se reiniciará en la pantalla de configuración inicial.');
            // La ventana principal se recargará automáticamente por el proceso principal
            window.electronAPI.closeSettings();
        }
    } catch (e) {
        window.electronAPI.logError(`[settings-reset] ${e.message}`);
        alert('Hubo un error al restaurar la configuración.');
    }
}

document.addEventListener('DOMContentLoaded', init);
