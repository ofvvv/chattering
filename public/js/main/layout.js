function toggleFilterBar() {
    const bar = document.getElementById('filter-bar');
    if (bar) bar.classList.toggle('open');
}

function setDockPosition(position) {
    const dock = document.getElementById('top-dock');
    const handle = document.getElementById('dock-resize-handle');
    if (!dock || !handle) return;

    if (position === 'top') {
        document.body.classList.remove('dock-bottom');
        document.body.classList.add('dock-top');
    } else {
        document.body.classList.remove('dock-top');
        document.body.classList.add('dock-bottom');
    }
    // Re-init drag para el nuevo layout
    initDockDrag(handle, dock);
}

function setDockHeight(height) {
    const dock = document.getElementById('top-dock');
    if (dock) dock.style.setProperty('--dock-height', `${height}px`);
}

function initDockDrag(handle, dock) {
    let isResizing = false;

    handle.onmousedown = (e) => {
        isResizing = true;
        document.body.style.userSelect = 'none';
        document.body.style.pointerEvents = 'none'; // Prevenir selección de texto/eventos de otros elementos
    };

    document.onmousemove = (e) => {
        if (!isResizing) return;

        const isDockTop = document.body.classList.contains('dock-top');
        let newHeight;

        if (isDockTop) {
            newHeight = e.clientY - dock.offsetTop;
        } else { // Dock bottom
            newHeight = window.innerHeight - e.clientY;
        }

        // Limitar altura
        if (newHeight > 50 && newHeight < window.innerHeight * 0.7) {
            setDockHeight(newHeight);
        }
    };

    document.onmouseup = (e) => {
        if (isResizing) {
            isResizing = false;
            document.body.style.userSelect = 'auto';
            document.body.style.pointerEvents = 'auto';
            // Guardar la nueva altura en la config
            const newHeight = parseInt(dock.style.getPropertyValue('--dock-height'));
            if (cfg.dockHeight !== newHeight) {
                cfg.dockHeight = newHeight;
                window.electronAPI.saveConfig(cfg);
            }
        }
    };
}

// Inicializar drag en el arranque
document.addEventListener('DOMContentLoaded', () => {
    const handle = document.getElementById('dock-resize-handle');
    const dock = document.getElementById('top-dock');
    if (handle && dock) {
        initDockDrag(handle, dock);
    }
});
