import { WebcastPushConnection } from 'tiktok-live-connector';

let deps;
let connection = null;
let currentUsername = null;
let reconnectTimer = null;
let reconnectAttempts = 0;

export function init(d) {
    try {
        deps = d;
    } catch (e) {
        console.error('[TikTok] Critical error in init:', e.message, e.stack);
        throw e;
    }
}

export function disconnect() {
    try {
        clearTimeout(reconnectTimer);
        if (connection) {
            console.log('[TikTok] Disconnecting client...');
            try { connection.disconnect(); } catch (e) {
                 console.warn('[TikTok] Inner disconnect call failed:', e.message);
            }
        }
    } catch (e) {
        console.error('[TikTok] Error during disconnect:', e.message, e.stack);
    } finally {
        connection = null;
        deps.updateStatus('TT', false);
        deps.updatePlatformState('TT', 'disconnected');
    }
}

export function connect(username) {
    try {
        disconnect();
        if (!username) return;

        currentUsername = username;
        deps.updatePlatformState('TT', 'loading');
        console.log(`[TikTok] Attempting to connect to @${username}...`);

        const options = {
            processInitialData: false,
            enableExtendedGiftInfo: true,
            enableWebsocketUpgrade: true,
            requestPollingIntervalMs: 2000,
            clientParams: {
                "app_language": "es-ES",
                "device_platform": "web"
            },
            requestHeaders: {}
        };

        if (deps.config?.tiktokSessionId) {
            options.requestHeaders['Cookie'] = `sessionid=${deps.config.tiktokSessionId}`;
        }

        connection = new WebcastPushConnection(username, options);

        connection.connect().then(state => {
            console.log(`[TikTok] Connected to @${username} (Room ID: ${state.roomId})`);
            deps.updateStatus('TT', true);
            deps.updatePlatformState('TT', 'connected');
            reconnectAttempts = 0;
        }).catch(err => {
            const msg = err.message || '';
            if (msg.includes('LIVE has ended') || msg.includes('offline') || msg.includes('not found')) {
                console.log(`[TikTok] @${username} appears to be offline. Retrying in 60s.`);
                deps.updateStatus('TT', false);
                deps.updatePlatformState('TT', 'disconnected');
                clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(() => connect(username), 60000);
            } else {
                console.warn('[TikTok] Connection failed:', msg);
                deps.updateStatus('TT', false);
                deps.updatePlatformState('TT', 'error');
                scheduleReconnect();
            }
        });

        connection.on('chat', data => {
            try {
                deps.emitMsg({
                    plat: 'TT', type: 'msg',
                    user: data.uniqueId, userId: data.userId,
                    avatar: data.profilePictureUrl, text: data.comment,
                    isFirst: deps.procesarUsuario(data.userId, data.uniqueId, 'TT'),
                    badges: { mod: data.isModerator, sub: data.isSubscriber },
                    badgeUrls: []
                });
            } catch (e) { console.error('[TikTok] Error in onChat handler:', e.message, e.stack); }
        });

        connection.on('gift', data => {
            try {
                if (data.giftType === 1 && !data.repeatEnd) return; // Ignore gift streaks until the end
                deps.emitEvento({
                    plat: 'TT', type: 'gift',
                    user: data.uniqueId, userId: data.userId,
                    avatar: data.profilePictureUrl, text: data.giftName,
                    giftImg: data.giftPictureUrl, count: data.repeatCount
                });
            } catch (e) { console.error('[TikTok] Error in onGift handler:', e.message, e.stack); }
        });

        connection.on('like', data => {
            try {
                const total = deps.addLikes(data.likeCount);
                deps.emitEvento({
                    plat: 'TT', type: 'like',
                    user: data.uniqueId, userId: data.userId,
                    avatar: data.profilePictureUrl, count: data.likeCount,
                    total: total
                });
            } catch (e) { console.error('[TikTok] Error in onLike handler:', e.message, e.stack); }
        });

        connection.on('follow', data => {
            try {
                deps.emitEvento({
                    plat: 'TT', type: 'follow',
                    user: data.uniqueId, userId: data.userId,
                    avatar: data.profilePictureUrl, text: 'te ha seguido'
                });
            } catch (e) { console.error('[TikTok] Error in onFollow handler:', e.message, e.stack); }
        });

        connection.on('streamEnd', () => {
            try {
                console.log(`[TikTok] Stream of @${currentUsername} has ended.`);
                disconnect();
                reconnectTimer = setTimeout(() => connect(currentUsername), 60000);
            } catch (e) { console.error('[TikTok] Error in onStreamEnd handler:', e.message, e.stack); }
        });

        connection.on('disconnected', () => {
            try {
                console.log('[TikTok] Client disconnected from stream.');
                deps.updatePlatformState('TT', 'disconnected');
                scheduleReconnect();
            } catch (e) { console.error('[TikTok] Error in onDisconnected handler:', e.message, e.stack); }
        });
        
        connection.on('error', err => {
            try {
                 console.error('[TikTok] Internal connector error:', err.message, err.stack);
                 deps.updatePlatformState('TT', 'error');
                 scheduleReconnect();
            } catch (e) { console.error('[TikTok] FATAL: Error in onError handler:', e.message, e.stack); }
        });

    } catch (e) {
        console.error('[TikTok] Critical error in connect function:', e.message, e.stack);
        deps.updateStatus('TT', false);
        deps.updatePlatformState('TT', 'error');
        scheduleReconnect();
    }
}

function scheduleReconnect() {
    try {
        clearTimeout(reconnectTimer);
        reconnectAttempts++;
        const delay = Math.min(3000 * Math.pow(2, reconnectAttempts - 1), 120000);
        console.log(`[TikTok] Scheduling reconnect in ${delay / 1000}s... (Attempt ${reconnectAttempts})`);
        reconnectTimer = setTimeout(() => {
            if (currentUsername) connect(currentUsername);
        }, delay);
    } catch(e) {
        console.error('[TikTok] Error in scheduleReconnect:', e.message, e.stack);
    }
}
