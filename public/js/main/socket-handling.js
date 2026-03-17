socket.on('chat_message', (data) => {
    window.electronAPI.logError(`[DIAGNÓSTICO] chat_message recibido: ${JSON.stringify(data)}`);
    try {
        renderMessage(data);
    } catch (e) {
        window.electronAPI.logError(`[socket-chat_message] Error de renderizado: ${e.message}`);
    }
});

socket.on('stream_event', (data) => {
    try {
        renderEvent(data);
        if (cfg.soundsEnabled && data.sound) {
            playSound(data.sound);
        }
    } catch (e) {
        window.electronAPI.logError(`[socket-stream_event] Error de renderizado/sonido: ${e.message}`);
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
