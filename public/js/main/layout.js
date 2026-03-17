function setDockPosition(pos) {
    try {
        const dock = document.getElementById('dock');
        if (!dock) return;
        document.body.classList.remove('dock-top', 'dock-bottom');
        document.body.classList.add(`dock-${pos}`);
    } catch (e) {
        window.electronAPI.logError(`[setDockPosition] ${e.message}`);
    }
}

function setDockHeight(h) {
    try {
        const dock = document.getElementById('dock');
        if (!dock) return;
        dock.style.height = `${h}px`;
    } catch (e) {
        window.electronAPI.logError(`[setDockHeight] ${e.message}`);
    }
}

function onMsgCtxMenu(event, msgLine, data) {
    try {
        event.preventDefault();
        closeAllCtxMenus();

        const menu = document.createElement('div');
        menu.className = 'ctx-menu';
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;

        // Opciones del menú
        menu.innerHTML = `
            <div class="ctx-item" onclick="replyToUser('${data.user.nick}')">@ Responder</div>
            <div class="ctx-item" onclick="copyText('${data.text}')">Copiar Mensaje</div>
            <div class="ctx-divider"></div>
            <div class="ctx-item" onclick="timeoutUser('${data.user.id}', '${data.platform}', 600)">Timeout (10min)</div>
            <div class="ctx-item" onclick="banUser('${data.user.id}', '${data.platform}')">Banear Usuario</div>
        `;

        document.body.appendChild(menu);
        document.addEventListener('click', closeAllCtxMenus, { once: true });
    } catch (e) {
        window.electronAPI.logError(`[onMsgCtxMenu] ${e.message}`);
    }
}

function closeAllCtxMenus() {
    try {
        document.querySelectorAll('.ctx-menu').forEach(m => m.remove());
    } catch (e) {
        window.electronAPI.logError(`[closeAllCtxMenus] ${e.message}`);
    }
}

// Funciones de acción (placeholders)
async function replyToUser(nick) {
    try {
        const input = document.getElementById('chat-input-field');
        if (!input) return;
        input.value = `@${nick} ${input.value}`;
        input.focus();
    } catch (e) {
        window.electronAPI.logError(`[replyToUser] ${e.message}`);
    }
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Mensaje copiado al portapapeles');
    } catch (e) {
        window.electronAPI.logError(`[copyText] ${e.message}`);
        showErrorToast('No se pudo copiar el mensaje');
    }
}

async function timeoutUser(userId, platform, duration) {
    try {
        // Lógica para llamar al backend/API de la plataforma
        console.log(`Timeout: ${userId} en ${platform} por ${duration}s`);
        showToast(`Usuario ${userId} ha recibido un timeout.`);
    } catch (e) {
        window.electronAPI.logError(`[timeoutUser] ${e.message}`);
    }
}

async function banUser(userId, platform) {
    try {
        // Lógica para llamar al backend/API de la plataforma
        console.log(`Ban: ${userId} en ${platform}`);
        showToast(`Usuario ${userId} ha sido baneado.`);
    } catch (e) {
        window.electronAPI.logError(`[banUser] ${e.message}`);
    }
}
