const SERVER = 'http://localhost:3000'
const socket = io(SERVER, { transports: ['websocket'], upgrade: false });

socket.on('connect', () => {
    try {
        document.getElementById('conn-status-dot').style.backgroundColor = '#2ecc71';
        document.getElementById('conn-status-text').textContent = 'Conectado';
        socket.emit('join', { room: 'stream' });
        clearChat();
    } catch (e) {
        window.electronAPI.logError(`[socket-connect] ${e.message}`);
    }
});

socket.on('disconnect', () => {
    try {
        document.getElementById('conn-status-dot').style.backgroundColor = '#e74c3c';
        document.getElementById('conn-status-text').textContent = 'Desconectado';
    } catch (e) {
        window.electronAPI.logError(`[socket-disconnect] ${e.message}`);
    }
});

socket.on('connect_error', (err) => {
    try {
        document.getElementById('conn-status-dot').style.backgroundColor = '#f39c12';
        document.getElementById('conn-status-text').textContent = 'Error de conexión';
        window.electronAPI.logError(`[socket-connect_error] ${err.message}`);
    } catch (e) {
        window.electronAPI.logError(`[socket-connect_error-handler] ${e.message}`);
    }
});

socket.on('chat_message', (data) => {
    try {
        renderMessage(data);
    } catch (e) {
        window.electronAPI.logError(`[socket-chat_message] Render Error: ${e.message}`);
    }
});

socket.on('stream_event', (data) => {
    try {
        renderEvent(data);
        if (cfg.soundsEnabled && data.sound) {
            playSound(data.sound);
        }
    } catch (e) {
        window.electronAPI.logError(`[socket-stream_event] Render/Sound Error: ${e.message}`);
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
