// Contiene la lógica para la interactividad de la UI en la ventana de configuración.

function setupEventListeners() {
    try {
        // Navegación del Menú Lateral
        document.querySelector('.main-menu').addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                const pageId = e.target.getAttribute('href').substring(1);
                navigateTo(pageId);
            }
        });

        // Botones de Acción Principales
        document.getElementById('save-button').addEventListener('click', save);
        document.getElementById('reset-button').addEventListener('click', reset);
        document.getElementById('cancel-button').addEventListener('click', () => {
            window.electronAPI.closeSettings();
        });

        // Búsqueda de Configuración
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => searchSettings(e.target.value));

        // Listeners para previsualización y actualización de valores en la UI
        const fontSizeSlider = document.getElementById('fontSize');
        const fontSizeValue = document.getElementById('font-size-value');
        fontSizeSlider.addEventListener('input', () => {
            fontSizeValue.textContent = fontSizeSlider.value;
        });

        const opacitySlider = document.getElementById('windowOpacity');
        const opacityValue = document.getElementById('window-opacity-value');
        opacitySlider.addEventListener('input', () => {
            opacityValue.textContent = opacitySlider.value;
            handleOpacityPreview(opacitySlider.value);
        });

    } catch (e) {
        window.electronAPI.logError(`[settings-ui:setupEventListeners] ${e.message}`);
    }
}

function setupInitialUI() {
    aplicarConfig(); // Aplicar configuración inicial al cargar
}

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';

    document.querySelectorAll('.main-menu a').forEach(a => a.classList.remove('active'));
    document.querySelector(`.main-menu a[href="#${pageId}"]`).classList.add('active');
}

function searchSettings(term) {
    // Lógica para la búsqueda (se puede implementar más adelante)
}

function handleOpacityPreview(value) {
    try {
        if (window.electronAPI.previewSettings) {
            window.electronAPI.previewSettings({ windowOpacity: parseInt(value, 10) });
        }
    } catch (e) {
        window.electronAPI.logError(`[settings-ui:handleOpacityPreview] ${e.message}`);
    }
}

function aplicarConfig() {
    // Esta función refleja el estado de `cfg` en la UI.
    // Es una migración directa de la lógica en settings-old.html

    // General
    document.getElementById('alwaysOnTop').checked = cfg.alwaysOnTop === true;

    // Chat
    const fontSizeSlider = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('font-size-value');
    fontSizeSlider.value = cfg.fontSize || 13.5;
    fontSizeValue.textContent = fontSizeSlider.value;

    document.getElementById('avatarShape').value = cfg.avatarShape || 'circle';
    document.getElementById('hideBots').checked = cfg.hideBots === true;
    document.getElementById('showTimestamps').checked = cfg.showTimestamps !== false;

    // Emotes
    document.getElementById('show7tvCanal').checked = cfg.show7tvCanal === true;
    document.getElementById('showBttvCanal').checked = cfg.showBttvCanal === true;

    // Apariencia
    document.getElementById('theme').value = cfg.theme || 'dark';
    document.getElementById('compact').checked = cfg.compact === true;
    document.getElementById('translucent').checked = cfg.translucent === true;
    
    const opacitySlider = document.getElementById('windowOpacity');
    const opacityValue = document.getElementById('window-opacity-value');
    opacitySlider.value = cfg.windowOpacity || 90;
    opacityValue.textContent = opacitySlider.value;
}

function showInitialContent() {
    navigateTo('page-general');
}
