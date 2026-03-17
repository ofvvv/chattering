socket.on('msg', (data) => {
    try {
        renderMessage(data);
    } catch (e) {
        window.electronAPI.logError(`[socket-msg] Error de renderizado: ${e.message}`);
    }
});

socket.on('evento', (data) => {
    try {
        renderEvent(data);
        if (cfg.soundsEnabled && data.sound) {
            playSound(data.sound);
        }
    } catch (e) {
        window.electronAPI.logError(`[socket-evento] Error de renderizado/sonido: ${e.message}`);
    }
});

socket.on('platform_state', ({ plat, state }) => {
    try {
        const icon = document.querySelector(`.plat-status-icon[data-plat="${plat}"]`);
        if (icon) {
            icon.className = 'plat-status-icon'; // Reset
            icon.classList.add(`plat-${state}`);
        }
    } catch (e) {
        window.electronAPI.logError(`[socket-platform_state] ${e.message}`);
    }
});

socket.on('platform_states', (states) => {
    try {
        for (const [plat, state] of Object.entries(states)) {
            const icon = document.querySelector(`.plat-status-icon[data-plat="${plat}"]`);
            if (icon) {
                icon.className = 'plat-status-icon'; // Reset
                icon.classList.add(`plat-${state}`);
            }
        }
    } catch (e) {
        window.electronAPI.logError(`[socket-platform_states] ${e.message}`);
    }
});

socket.on('user_banned', (data) => {
    try {
        handleUserBan(data.userId, data.platform);
    } catch (e) {
        window.electronAPI.logError(`[socket-user_banned] ${e.message}`);
    }
});

socket.on('message_deleted', (data) => {
    try {
        handleMessageDelete(data.messageId);
    } catch (e) {
        window.electronAPI.logError(`[socket-message_deleted] ${e.message}`);
    }
});

function clearChat() {
    try {
        const chat = document.getElementById('chat');
        if (chat) {
            chat.innerHTML = '';
            msgLineCounter = 0;
            totalMsgCount = 0;
        }
    } catch (e) {
        window.electronAPI.logError(`[clearChat] ${e.message}`);
    }
}
