
function setupInput() {
    try {
        const input = document.getElementById('chat-input-field');
        if (!input) return;

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });

        const sendButton = document.getElementById('send-button');
        if (sendButton) {
            sendButton.addEventListener('click', sendMessage);
        }
    } catch (e) {
        window.electronAPI.logError(`[setupInput] ${e.message}`);
    }
}

async function sendMessage() {
    try {
        const input = document.getElementById('chat-input-field');
        if (!input || !input.value.trim()) return;

        const message = input.value.trim();
        input.value = '';
        input.focus();

        // Enviar al servidor vía Socket.IO
        socket.emit('send_message', { text: message });

    } catch (e) {
        window.electronAPI.logError(`[sendMessage] ${e.message}`);
        showErrorToast('Error al enviar el mensaje.');
    }
}

// Inicializar
setupInput();
