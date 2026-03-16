const { WebcastPushConnection } = require('tiktok-live-connector');

let deps;
let connection = null;
let currentUsername = null;
let reconnectTimer = null;
let reconnectAttempts = 0;

function init(d) { deps = d; }

function disconnect() {
    clearTimeout(reconnectTimer);
    if (connection) {
        try { connection.disconnect(); } catch (e) {}
        connection = null;
    }
    deps.updateStatus('TT', false);
    deps.updatePlatformState('TT', 'disconnected');
}

function connect(username) {
    disconnect();
    if (!username) return;

    currentUsername = username;
    deps.updatePlatformState('TT', 'loading');

    const options = {
        processInitialData: false,
        enableExtendedGiftInfo: true,
        enableWebsocketUpgrade: true,
        requestPollingIntervalMs: 2000,
        clientParams: {
            "app_language": "es-ES",
            "device_platform": "web",
            "tt-target-idc": "useast5" 
        },
        requestHeaders: {}
    };

    // WORKAROUND: Inyectar la cookie directamente en los headers para evitar el bug 
    // de validación estricta de "tt-target-idc" en la librería tiktok-live-connector
    if (deps.config && deps.config.tiktokSessionId) {
        options.requestHeaders['Cookie'] = `sessionid=${deps.config.tiktokSessionId}`;
    }

    connection = new WebcastPushConnection(username, options);

    connection.connect().then(state => {
        console.log(`[TikTok] Conectado a ${username} (Room: ${state.roomId})`);
        deps.updateStatus('TT', true);
        deps.updatePlatformState('TT', 'connected');
        reconnectAttempts = 0; 
    }).catch(err => {
        const msg = err.message || '';
        if (msg.includes('LIVE has ended') || msg.includes('offline') || msg.includes('not found')) {
            console.log(`[TikTok] @${username} está offline. Reintentando en silencio en 60s...`);
            deps.updateStatus('TT', false);
            deps.updatePlatformState('TT', 'disconnected');
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => connect(username), 60000);
        } else {
            console.warn('[TikTok] Error al conectar:', msg);
            deps.updateStatus('TT', false);
            deps.updatePlatformState('TT', 'error');
            scheduleReconnect(); 
        }
    });

    connection.on('chat', data => {
        deps.emitMsg({
            plat: 'TT', type: 'msg',
            user: data.uniqueId, userId: data.userId,
            avatar: data.profilePictureUrl, text: data.comment,
            isFirst: data.isFirstScreen,
            badges: { mod: data.isModerator, sub: data.isSubscriber },
            badgeUrls:[]
        });
    });

    connection.on('gift', data => {
        if (data.giftType === 1 && !data.repeatEnd) return; 
        deps.emitEvento({
            plat: 'TT', type: 'gift',
            user: data.uniqueId, userId: data.userId,
            avatar: data.profilePictureUrl, text: data.giftName,
            giftImg: data.giftPictureUrl, count: data.repeatCount
        });
    });

    connection.on('like', data => {
        const total = deps.addLikes(data.likeCount);
        deps.emitEvento({
            plat: 'TT', type: 'like',
            user: data.uniqueId, userId: data.userId,
            avatar: data.profilePictureUrl, count: data.likeCount,
            total: total
        });
    });

    connection.on('follow', data => {
        deps.emitEvento({
            plat: 'TT', type: 'follow',
            user: data.uniqueId, userId: data.userId,
            avatar: data.profilePictureUrl, text: 'te siguió'
        });
    });

    connection.on('streamEnd', () => { 
        console.log(`[TikTok] Stream de @${username} ha terminado.`);
        disconnect(); 
        reconnectTimer = setTimeout(() => connect(username), 60000);
    });
    
    connection.on('disconnected', () => { scheduleReconnect(); });
    connection.on('error', err => { console.error('[TikTok] Error interno:', err.message); });
}

function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectAttempts++;
    const delay = Math.min(2000 * Math.pow(2, reconnectAttempts - 1), 60000); 
    console.log(`[TikTok] Reconectando en ${delay/1000}s... (Intento ${reconnectAttempts})`);
    reconnectTimer = setTimeout(() => {
        if (currentUsername) connect(currentUsername);
    }, delay);
}

module.exports = { init, connect, disconnect };