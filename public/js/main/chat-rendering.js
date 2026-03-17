function renderMessage(msg) {
    try {
        if (!msg || !msg.user || !msg.text) return;
        if (shouldFilter(msg)) return;

        const chat = document.getElementById('chat');
        if (!chat) return;

        const isScrolled = chat.scrollTop + chat.clientHeight >= chat.scrollHeight - 50;

        const msgLine = document.createElement('div');
        msgLine.className = 'linea';
        msgLine.dataset.msgId = msg.msgId;
        msgLine.dataset.userId = msg.userId;

        // --- Aplicar clases y estilos ---
        if (cfg.alternatingBg) {
            msgLine.classList.add(totalMsgCount % 2 === 0 ? 'linea-bg-even' : 'linea-bg-odd');
        }
        if (msg.isHighlight) msgLine.classList.add('linea-highlight');
        if (msg.isMention) msgLine.classList.add('linea-mencion');
        if (cfg.msgAnimation) msgLine.classList.add('linea-new');

        // --- Construir el HTML del mensaje ---
        msgLine.innerHTML = buildMessageHTML(msg);

        // --- Añadir al DOM y gestionar scroll ---
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
        window.electronAPI.logError(`[renderMessage] Failed for msgId ${msg?.msgId}. User: ${msg?.user}. Error: ${e.message}`);
    }
}

function buildMessageHTML(msg) {
    const timestampHTML = cfg.showTimestamps ? `<span class="timestamp">${new Date(msg.ts || Date.now()).toLocaleTimeString()}</span>` : '';
    
    const badgesHTML = (msg.badges && Array.isArray(msg.badges))
        ? msg.badges.map(b => `<img src="${b.url}" alt="${b.name}" class="badge" title="${b.name}">`).join('') 
        : '';

    const pronounsHTML = cfg.showPronouns && msg.pronouns ? `<span class="pronouns">${msg.pronouns}</span>` : '';
    
    const usernameHTML = `<span class="username" style="color:${msg.userColor || '#FFFFFF'}" onclick="openUserCtx(event, '${msg.userId}', '${msg.user}')">${msg.user}</span>`;
    
    const textClass = msg.isAction ? 'msg-text accion' : 'msg-text';
    const textHTML = `<span class="${textClass}">${processMessageText(msg.text, msg.emotes)}</span>`;

    return `${timestampHTML}<span class="badges">${badgesHTML}</span>${pronounsHTML}${usernameHTML}: ${textHTML}`;
}

function processMessageText(text, emotes) {
    if (!text) return '';

    let processedText = escapeHTML(text);

    if (emotes) {
        const allEmotes = [];
        // Unificar emotes de Twitch (objeto) y YouTube (array)
        if (Array.isArray(emotes)) { // YouTube
            emotes.forEach(e => allEmotes.push({ name: e.name, url: e.url }));
        } else { // Twitch
            for (const emoteId in emotes) {
                for (const range of emotes[emoteId]) {
                    const [start, end] = range.split('-').map(Number);
                    const name = text.substring(start, end + 1);
                    allEmotes.push({ name: name, url: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0` });
                }
            }
        }

        // Reemplazar texto de emotes con <img> tags
        // Es importante ordenar por longitud para evitar reemplazar sub-cadenas (ej. 'LUL' antes de 'LULW')
        allEmotes.sort((a, b) => b.name.length - a.name.length);
        
        allEmotes.forEach(emote => {
            // Usar una función de escape para el nombre del emote en la regex
            const emoteRegex = new RegExp(escapeRegExp(emote.name), 'g');
            processedText = processedText.replace(emoteRegex, `<img src="${emote.url}" alt="${emote.name}" title="${emote.name}" class="emote">`);
        });
    }

    // Procesa menciones al final
    processedText = processedText.replace(/@(\w+)/g, '<span class="mencion">@$1</span>');

    return processedText;
}

// --- Funciones de Utilidad y Filtros ---

function escapeHTML(str) {
    return str.replace(/[<>"']/g, char => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderEvent(event) { /* Implementación... */ }
function shouldFilter(msg) { /* Implementación... */ }
function handleUserBan(userId, platform) { /* Implementación... */ }
function handleMessageDelete(msgId) { /* Implementación... */ }
