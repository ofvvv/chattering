// Contiene la lógica para la interactividad de la UI en la ventana de configuración.

function setupEventListeners() {
    try {
        // Navegación del Menú Lateral
        document.querySelector('.main-menu').addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                const pageId = e.target.getAttribute('href').substring(1);
                navigateTo(pageId);
            }
        });

        // Botones de Acción Principales
        document.getElementById('save-button').addEventListener('click', save);
        document.getElementById('reset-button').addEventListener('click', reset);
        document.getElementById('cancel-button').addEventListener('click', () => {
            window.electronAPI.closeSettings(); // Cierra la ventana sin guardar
        });

        // Búsqueda de Configuración
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => searchSettings(e.target.value));

        // Previsualizaciones en Vivo (para opacidad, etc.)
        document.getElementById('windowOpacity').addEventListener('input', handleOpacityPreview);

    } catch (e) {
        window.electronAPI.logError(`[settings-ui:setupEventListeners] ${e.message}`);
    }
}

function setupInitialUI() {
    try {
        // Actualiza el valor numérico del slider de opacidad al iniciar
        const opacitySlider = document.getElementById('windowOpacity');
        const opacityValue = document.getElementById('window-opacity-value');
        if (opacitySlider && opacityValue) {
            opacityValue.textContent = opacitySlider.value;
        }
    } catch (e) {
        window.electronAPI.logError(`[settings-ui:setupInitialUI] ${e.message}`);
    }
}

function navigateTo(pageId) {
    try {
        // Oculta todas las páginas
        document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
        
        // Muestra la página solicitada
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.style.display = 'block';
        }

        // Actualiza el estado activo en el menú
        document.querySelectorAll('.main-menu a').forEach(a => a.classList.remove('active'));
        const activeLink = document.querySelector(`.main-menu a[href="#${pageId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    } catch (e) {
        window.electronAPI.logError(`[settings-ui:navigateTo] ${e.message}`);
    }
}

function searchSettings(term) {
    // La implementación de la búsqueda se puede añadir aquí si se desea.
    // Por ahora, esta función está vacía pero conectada.
}

function handleOpacityPreview(event) {
    try {
        const opacityValue = parseInt(event.target.value, 10);
        
        // Actualiza el texto del porcentaje en la UI
        const opacityValueLabel = document.getElementById('window-opacity-value');
        if (opacityValueLabel) {
            opacityValueLabel.textContent = opacityValue;
        }

        // Envía el valor de previsualización al proceso principal
        window.electronAPI.previewSettings({ windowOpacity: opacityValue });
    } catch (e) {
        window.electronAPI.logError(`[settings-ui:handleOpacityPreview] ${e.message}`);
    }
}

function showSaveConfirmation() {
    // Esta es una forma simple. Si tienes un sistema de "toasts" o notificaciones,
    // sería mejor usarlo aquí.
    alert('Configuración guardada con éxito.');
}

// Esta función asegura que el contenido inicial sea visible al cargar.
function showInitialContent() {
    navigateTo('page-general');
}
