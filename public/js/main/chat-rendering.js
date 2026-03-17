async function renderMessage(data) {
    try {
        // Filtros iniciales
        if (shouldFilter(data)) return;

        const chat = document.getElementById('chat');
        if (!chat) return;

        const isScrolledToBottom = chat.scrollHeight - chat.clientHeight <= chat.scrollTop + 50;

        const msgLine = document.createElement('div');
        msgLine.className = 'msg-line';
        msgLine.dataset.msgId = data.msgId;
        msgLine.dataset.userId = data.user.id;
        msgLine.dataset.platform = data.platform;
        msgLine.addEventListener('contextmenu', (e) => onMsgCtxMenu(e, msgLine, data));

        // Renderizado del mensaje
        await buildMessageHTML(msgLine, data);

        chat.appendChild(msgLine);
        msgLineCounter++;

        // Auto-scroll y limpieza
        if (isScrolledToBottom) {
            chat.scrollTop = chat.scrollHeight;
        }

        if (msgLineCounter > MAX_MESSAGES) {
            chat.firstChild?.remove();
            msgLineCounter--;
        }
    } catch (e) {
        window.electronAPI.logError(`[renderMessage] Failed for ${data?.platform} msg. User: ${data?.user?.nick}. Error: ${e.message}`);
    }
}

async function buildMessageHTML(msgLine, data) {
    try {
        const { user, text, platform, isAction, isGift, subInfo } = data;
        const { nick, badges, color } = user;

        // Insignias
        const badgesSpan = document.createElement('span');
        badgesSpan.className = 'badges';
        if (badges) {
            badges.forEach(b => {
                const badgeImg = document.createElement('img');
                badgeImg.src = b.url;
                badgeImg.alt = b.type;
                badgeImg.className = `badge ${b.type}`;
                badgesSpan.appendChild(badgeImg);
            });
        }

        // Nombre de usuario
        const nameSpan = document.createElement('span');
        nameSpan.className = 'username';
        nameSpan.textContent = nick;
        nameSpan.style.color = color || '#ccc';

        // Dos puntos
        const colonSpan = document.createElement('span');
        colonSpan.className = 'colon';
        colonSpan.textContent = ':';

        // Texto del mensaje
        const textSpan = document.createElement('span');
        textSpan.className = 'msg-text';
        textSpan.innerHTML = await processMessageText(text, data.emotes);

        // Ensamblar
        msgLine.append(badgesSpan, nameSpan, colonSpan, textSpan);

    } catch (e) {
        window.electronAPI.logError(`[buildMessageHTML] ${e.message}`);
        // Fallback: mostrar mensaje de error en la línea
        msgLine.innerHTML = '<span class="error-tag">Error al renderizar</span>';
    }
}

async function processMessageText(text, emotes) {
    try {
        let processedText = escapeHTML(text);
        if (emotes && emotes.length > 0) {
            processedText = replaceEmotes(processedText, emotes);
        }
        // Podrían ir más procesadores aquí (links, etc.)
        return processedText;
    } catch (e) {
        window.electronAPI.logError(`[processMessageText] ${e.message}`);
        return escapeHTML(text); // Devuelve texto seguro como fallback
    }
}

function renderEvent(data) {
    try {
        const chat = document.getElementById('chat');
        if (!chat) return;
        const isScrolledToBottom = chat.scrollHeight - chat.clientHeight <= chat.scrollTop + 50;

        const eventLine = document.createElement('div');
        eventLine.className = `event-line ${data.type}`;
        eventLine.innerHTML = data.html;
        chat.appendChild(eventLine);

        if (isScrolledToBottom) {
            chat.scrollTop = chat.scrollHeight;
        }
    } catch (e) {
        window.electronAPI.logError(`[renderEvent] Failed for event ${data?.type}. Error: ${e.message}`);
    }
}

function shouldFilter(data) {
    try {
        if (cfg.hideBots && data.user.isBot) return true;
        if (cfg.filterModsOnly && !data.user.isMod) return true;
        if (cfg.filterSubsOnly && !data.user.isSub) return true;
        if (cfg.blockedWordsEnabled && cfg.blockedWords?.some(word => data.text.toLowerCase().includes(word.toLowerCase()))) {
            return true;
        }
        return false;
    } catch (e) {
        window.electronAPI.logError(`[shouldFilter] ${e.message}`);
        return false; // No filtrar en caso de error
    }
}

function escapeHTML(str) {
    // No reemplazar espacios con &nbsp; para permitir el ajuste de línea natural.
    return str.replace(/[&<>\"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}