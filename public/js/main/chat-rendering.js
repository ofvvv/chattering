
function renderMessage(msg) {
    try {
        if (!msg || !msg.user || !msg.text) return;

        if (shouldFilter(msg)) return;

        const chat = document.getElementById('chat');
        if (!chat) return;

        const isScrolled = chat.scrollTop + chat.clientHeight >= chat.scrollHeight - 50;

        const msgLine = document.createElement('div');
        msgLine.className = 'linea'; // CLASE CSS CORRECTA
        msgLine.dataset.msgId = msg.msgId;
        msgLine.dataset.userId = msg.userId;

        if (cfg.alternatingBg) {
            msgLine.classList.add(totalMsgCount % 2 === 0 ? 'linea-bg-even' : 'linea-bg-odd');
        }
        
        if (msg.isHighlight) msgLine.classList.add('linea-highlight');
        if (msg.isMention) msgLine.classList.add('linea-mencion');
        
        if (cfg.msgAnimation) msgLine.classList.add('linea-new');

        // USA INNERHTML PARA CONSTRUIR LA ESTRUCTURA COMPLETA
        msgLine.innerHTML = buildMessageHTML(msg);

        chat.appendChild(msgLine);
        totalMsgCount++;
        msgLineCounter++;

        if (msgLineCounter > MAX_MESSAGES) {
            const first = chat.querySelector('.linea:not(.linea-evento)');
            if (first) first.remove();
            msgLineCounter--;
        }

        if (isScrolled) {
            chat.scrollTop = chat.scrollHeight;
        } else {
            const pausedIndicator = document.getElementById('scroll-paused');
            if (pausedIndicator) pausedIndicator.style.display = 'block';
        }
    } catch (e) {
        window.electronAPI.logError(`[renderMessage] Failed for ${msg?.msgId} msg. User: ${msg?.user}. Error: ${e.message}`);
    }
}

function buildMessageHTML(msg) {
    const timestampHTML = cfg.showTimestamps ? `<span class="timestamp">${new Date(msg.ts || Date.now()).toLocaleTimeString()}</span>` : '';
    
    let badgesHTML = '';
    if (msg.badges) {
        badgesHTML = msg.badges.map(b => `<img src="${b.url}" alt="${b.name}" class="badge" title="${b.name}">`).join('');
    }

    const pronounsHTML = cfg.showPronouns && msg.pronouns ? `<span class="pronouns">${msg.pronouns}</span>` : '';
    
    const usernameHTML = `<span class="username" style="color:${msg.userColor || '#FFFFFF'}" onclick="openUserCtx(event, '${msg.userId}', '${msg.user}')">${msg.user}</span>`;
    
    const textClass = msg.isAction ? 'msg-text accion' : 'msg-text';
    // PROCESA EMOTES Y TEXTO
    const textHTML = `<span class="${textClass}">${processMessageText(msg.text, msg.emotes, msg.ytEmotes)}</span>`;

    return `${timestampHTML}<span class="badges">${badgesHTML}</span>${pronounsHTML}${usernameHTML}: ${textHTML}`;
}

function processMessageText(text, emotes = [], ytEmotes = []) {
    if (!text) return '';

    // Escapa HTML para seguridad
    let processedText = text.replace(/[<>"']/g, char => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

    const allEmotes = [];
    if (emotes) {
        emotes.forEach(e => allEmotes.push({ name: e.name, url: e.url }));
    }
    if (ytEmotes) {
        ytEmotes.forEach(e => allEmotes.push({ name: e.name, url: e.url }));
    }

    // Reemplaza texto de emotes con <img> tags
    if (allEmotes.length > 0) {
        allEmotes.forEach(emote => {
            const emoteRegex = new RegExp(`\b${emote.name}\b`, 'g');
            processedText = processedText.replace(emoteRegex, `<img src="${emote.url}" alt="${emote.name}" title="${emote.name}" class="emote">`);
        });
    }

    // Procesa menciones
    processedText = processedText.replace(/@(\w+)/g, '<span class="mencion">@$1</span>');

    return processedText;
}

function renderEvent(event) {
    // Implementación de renderizado de eventos
}


// --- FILTROS ---
function shouldFilter(msg) {
    if (!cfg.filters) return false;
    const f = cfg.filters;

    if (f.subs && !msg.isSub) return true;
    if (f.mods && !msg.isMod) return true;
    if (f.bots && msg.isBot) return true;
    if (f.first && !msg.isFirst) return true;
    if (f.TT && msg.platform !== 'TT') return true;
    if (f.YT && msg.platform !== 'YT') return true;
    if (f.TW && msg.platform !== 'TW') return true;

    return false;
}

// --- OTROS ---

function handleUserBan(userId, platform) {
    const messages = document.querySelectorAll(`.linea[data-user-id="${userId}"]`);
    messages.forEach(msg => {
        msg.classList.add('linea-deleted');
        msg.innerHTML = '<span class="msg-text">[Mensaje eliminado]</span>';
    });
}

function handleMessageDelete(msgId) {
    const msg = document.querySelector(`.linea[data-msg-id="${msgId}"]`);
    if (msg) {
        msg.classList.add('linea-deleted');
        msg.innerHTML = '<span class="msg-text">[Mensaje eliminado]</span>';
    }
}
