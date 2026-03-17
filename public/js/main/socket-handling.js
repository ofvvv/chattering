'use strict'

let socket = null;
let port = 3000; // Default port

function connectAll() {
    if (socket) {
        socket.disconnect();
    }

    socket = io(`http://localhost:${port}`);

    socket.on('connect', () => {
        console.log('[Socket]', `Connected to server on port ${port}`);
        showToast('Conectado al servidor local');
    });

    socket.on('connect_error', (err) => {
        console.error('[Socket]', 'Connection error:', err.message);
        showToast('Error de conexión con el servidor');
    });

    socket.on('disconnect', (reason) => {
        console.log('[Socket]', 'Disconnected:', reason);
        showToast('Desconectado del servidor local');
    });

    // Listener principal de mensajes
    socket.on('msg', (data) => {
        addChatMessage(data);
    });

    // Listener para el historial de chat al conectar
    socket.on('history', (history) => {
        chat.innerHTML = '';
        history.forEach(msg => addChatMessage(msg));
        scrollToBottom(true);
    });

    // Listener para estados de conexión de plataformas (TT, YT, TW)
    socket.on('platform_states', (states) => {
        for (const plat in states) {
            updatePlatformStatus(plat, states[plat]);
        }
    });
    
    socket.on('platform_state', ({ plat, state }) => {
        updatePlatformStatus(plat, state);
    });

     // Listener para el número de espectadores
    socket.on('status', (liveStatus) => {
        // Esta es una implementación básica, asumimos que quieres sumar los espectadores
        // de todas las plataformas o mostrar el de la principal.
        // Por ahora, solo actualizamos el estado general.
        const isLive = Object.values(liveStatus).some(status => status);
        const statusText = document.getElementById('status-text');
        statusText.textContent = isLive ? 'LIVE' : 'OFFLINE';
        statusText.style.color = isLive ? '#ff4040' : '';
    });

    window.electronAPI.onPortReady((p) => {
        if (p && port !== p) {
            console.log(`[Port] Port updated from ${port} to ${p}. Reconnecting...`);
            port = p;
            connectAll();
        }
    });
}

function updatePlatformStatus(plat, status) {
    const icon = document.querySelector(`.plat-status-icon[data-plat="${plat}"]`);
    if (icon) {
        icon.classList.remove('connected', 'disconnected', 'live');
        icon.classList.add(status); // status puede ser 'connected', 'disconnected', 'live'
        
        let statusTooltip = `Desconectado de ${plat}`;
        if (status === 'connected') statusTooltip = `Conectado a ${plat}`;
        if (status === 'live') statusTooltip = `En vivo en ${plat}`;
        icon.title = statusTooltip;
    }
}
