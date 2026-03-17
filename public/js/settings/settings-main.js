// ==========================================================================
// ATENCIÓN: Este es el script principal de la ventana de configuración.
// v4.0.1 - Lógica de guardado centralizada
// ==========================================================================

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
        console.log('[settings-save] Iniciando proceso de guardado...');

        // Paso 1: Sincronizar los filtros de etiquetas (si la función existe)
        if (typeof syncFilterChips === 'function') {
            console.log('[settings-save] Ejecutando syncFilterChips...');
            syncFilterChips();
        } else {
            console.warn('[settings-save] syncFilterChips no está definida. Saltando sincronización de filtros.');
        }

        // Paso 2: Recolectar todos los datos del formulario
        console.log('[settings-save] Recolectando datos del formulario...');
        const newConfig = collectFormData();
        const updatedConfig = { ...cfg, ...newConfig };

        // Paso 3: Guardar la configuración a través del proceso principal
        console.log('[settings-save] Enviando configuración para guardar...');
        await window.electronAPI.saveSettings(updatedConfig);
        
        // Paso 4: Cerrar la ventana con un pequeño retardo
        console.log('[settings-save] Guardado completado. Cerrando ventana...');
        setTimeout(() => {
            window.electronAPI.closeSettings();
        }, 200);

    } catch (e) {
        window.electronAPI.logError(`[settings-save] ERROR FATAL DURANTE GUARDADO: ${e.message}`);
        alert(`Hubo un error al guardar la configuración: ${e.message}. Por favor, revise los logs.`);
    }
}

async function reset() {
    try {
        if (confirm('¿Está seguro de que desea restaurar toda la configuración a los valores de fábrica? Esta acción es irreversible.')) {
            await window.electronAPI.resetConfig();
            alert('La configuración ha sido restaurada. La aplicación se reiniciará en la pantalla de configuración inicial.');
            window.electronAPI.closeSettings();
        }
    } catch (e) {
        window.electronAPI.logError(`[settings-reset] ${e.message}`);
        alert('Hubo un error al restaurar la configuración.');
    }
}

document.addEventListener('DOMContentLoaded', init);
