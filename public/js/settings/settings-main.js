// ==========================================================================
// ATENCIÓN: Este es el script principal de la ventana de configuración.
// v4.0.2 - Lógica de guardado y carga robustecida.
// ==========================================================================

// La variable `cfg` se declara globalmente para ser accesible por los otros scripts.
let cfg = {};

// La función `init` orquesta la inicialización de toda la ventana.
async function init() {
    try {
        // 1. Cargar la configuración desde el proceso principal.
        cfg = await window.electronAPI.getConfig() || {};
        
        // 2. Llenar el formulario con los datos cargados (de settings-form.js)
        loadForm(cfg);
        
        // 3. Configurar el estado inicial de la UI (de settings-ui.js)
        setupInitialUI();
        
        // 4. Conectar todos los listeners de eventos (de settings-ui.js)
        setupEventListeners();
        
        // 5. Gestionar la lógica de autenticación de plataformas (de settings-accounts.js)
        handlePlatformAuth();
        
        // 6. Mostrar la página inicial correcta (de settings-ui.js)
        showInitialContent();

    } catch (e) {
        window.electronAPI.logError(`[settings-main:init] CRITICAL: ${e.message}`);
        alert('Error fatal al cargar la configuración. Revise los logs.');
    }
}

// La función `save` recolecta los datos y los envía al proceso principal.
async function save() {
    try {
        // 1. Recolectar el estado actual del formulario (de settings-form.js)
        const newConfigState = collectFormData();
        if (newConfigState === null) { // `collectFormData` puede devolver null en caso de error
            alert("No se pudieron guardar los datos debido a un error al leer el formulario.");
            return;
        }

        // 2. Combinar la configuración existente con los nuevos datos
        // Esto preserva cualquier configuración que no esté en el formulario.
        const updatedConfig = { ...cfg, ...newConfigState };

        // 3. Enviar la configuración completa al proceso principal para guardarla.
        await window.electronAPI.saveSettings(updatedConfig);

        // 4. Mostrar confirmación al usuario (de settings-ui.js)
        showSaveConfirmation();

        // 5. Cerrar la ventana de configuración automáticamente.
        setTimeout(() => {
            window.electronAPI.closeSettings();
        }, 300); // Un pequeño retardo para que el usuario vea la confirmación.

    } catch (e) {
        window.electronAPI.logError(`[settings-main:save] FATAL: ${e.message}`);
        alert(`Hubo un error al guardar la configuración: ${e.message}. Por favor, revise los logs.`);
    }
}

// La función `reset` restaura la configuración a los valores de fábrica.
async function reset() {
    try {
        if (confirm('¿Está seguro de que desea restaurar toda la configuración a los valores de fábrica? Esta acción es irreversible y reiniciará la aplicación.')) {
            await window.electronAPI.resetConfig();
            // No es necesario cerrar la ventana aquí, el proceso principal se encargará del reinicio.
        }
    } catch (e) {
        window.electronAPI.logError(`[settings-main:reset] ${e.message}`);
        alert('Hubo un error al intentar restaurar la configuración.');
    }
}

// El evento DOMContentLoaded asegura que el script se ejecute solo después de que
// todo el HTML haya sido cargado.
document.addEventListener('DOMContentLoaded', init);
