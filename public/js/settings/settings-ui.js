function setupEventListeners() {
    try {
        // Navegación principal
        document.querySelector('.main-menu').addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                const page = e.target.getAttribute('href').substring(1);
                navigateTo(page);
            }
        });

        // Botones de acción
        document.getElementById('save-button').addEventListener('click', save);
        document.getElementById('reset-button').addEventListener('click', reset);

        // Búsqueda
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => searchSettings(e.target.value));

        // Previsualizaciones en vivo
        document.querySelectorAll('[data-preview]').forEach(el => {
            el.addEventListener('input', (e) => handlePreview(e.target));
        });
    } catch (e) {
        window.electronAPI.logError(`[settings-setupEventListeners] ${e.message}`);
    }
}

function setupInitialUI() {
    try {
        // Lógica para establecer el estado inicial de la UI, como el tema.
        const initialTheme = cfg.theme || 'dark';
        document.body.className = `theme-${initialTheme}`;
    } catch (e) {
        window.electronAPI.logError(`[settings-setupInitialUI] ${e.message}`);
    }
}

function navigateTo(pageId) {
    try {
        document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
        document.getElementById(pageId).style.display = 'block';

        document.querySelectorAll('.main-menu a').forEach(a => a.classList.remove('active'));
        document.querySelector(`.main-menu a[href="#${pageId}"]`).classList.add('active');
    } catch (e) {
        window.electronAPI.logError(`[settings-navigateTo] ${e.message}`);
    }
}

function searchSettings(term) {
    // Lógica para la búsqueda
    // ...
}

function handlePreview(element) {
    try {
        const { setting, value } = getPreviewData(element);
        if (setting) {
            window.electronAPI.previewSettings({ [setting]: value });
        }
    } catch (e) {
        window.electronAPI.logError(`[settings-handlePreview] ${e.message}`);
    }
}

function getPreviewData(element) {
    try {
        const setting = element.dataset.preview;
        let value = element.type === 'checkbox' ? element.checked : element.value;
        if (element.dataset.type === 'number') {
            value = parseFloat(value);
        }
        return { setting, value };
    } catch (e) {
        window.electronAPI.logError(`[settings-getPreviewData] ${e.message}`);
        return {};
    }
}

function showInitialContent() {
    try {
        // Muestra la primera página por defecto
        navigateTo('page-general');
    } catch (e) {
        window.electronAPI.logError(`[settings-showInitialContent] ${e.message}`);
    }
}
