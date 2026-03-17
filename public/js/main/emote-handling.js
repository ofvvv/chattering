async function cargarEmotes(cfg) {
    try {
        const twitchId = cfg.twitchUserId;
        if (!twitchId) {
            console.warn('No hay ID de usuario de Twitch para cargar emotes de canal.');
            return;
        }

        let emoteLoaded = false;
        const providers = [
            { name: '7TV', enabled: cfg.show7tvCanal, url: `https://7tv.io/v3/users/twitch/${twitchId}` },
            { name: 'BTTV', enabled: cfg.showBttvCanal, url: `https://api.betterttv.net/3/cached/users/twitch/${twitchId}` },
            { name: 'FFZ', enabled: cfg.showFfzCanal, url: `https://api.frankerfacez.com/v1/room/id/${twitchId}` }
        ];

        for (const provider of providers) {
            if (provider.enabled) {
                try {
                    const response = await fetch(provider.url);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();
                    // Aquí iría la lógica para procesar y almacenar los emotes de cada proveedor
                    // ej: process7TV(data), processBTTV(data), etc.
                    console.log(`Emotes de canal de ${provider.name} cargados.`);
                    emoteLoaded = true;
                } catch (e) {
                    window.electronAPI.logError(`[cargarEmotes] Failed to load ${provider.name} emotes: ${e.message}`);
                }
            }
        }

        if (emoteLoaded) {
            console.log('Emotes de canal actualizados.');
        }
    } catch (e) {
        window.electronAPI.logError(`[cargarEmotes] General Error: ${e.message}`);
    }
}

function replaceEmotes(text, messageEmotes) {
    try {
        let processedText = text;
        // Lógica para reemplazar emotes. Primero los emotes del mensaje, luego los globales.
        // Esta es una simplificación. La lógica real necesitaría manejar solapamientos y prioridades.
        
        const allEmotes = [...(messageEmotes || []), ...globalEmotes]; // Simplificación

        allEmotes.forEach(emote => {
            const emoteHTML = `<img src="${emote.url}" alt="${emote.name}" class="emote">`;
            // Usar un regex global para reemplazar todas las ocurrencias
            const regex = new RegExp(`\\b${emote.name}\\b`, 'g');
            processedText = processedText.replace(regex, emoteHTML);
        });

        return processedText;
    } catch (e) {
        window.electronAPI.logError(`[replaceEmotes] Error: ${e.message}`);
        return text; // Devuelve el texto original en caso de error
    }
}

function setupEmoteObserver() {
    // Lógica para el IntersectionObserver que anima solo los emotes visibles
    try {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.dataset.src; // Asumiendo que la URL del emote animado está en data-src
                    if (src) {
                        img.src = src;
                        observer.unobserve(img); // Dejar de observar una vez cargado
                    }
                }
            });
        }, { root: document.getElementById('chat'), rootMargin: '100px' });

        // Esto debería ser llamado cada vez que se añaden nuevos mensajes
        // O usar MutationObserver para detectar nuevos emotes y observarlos.
    } catch (e) {
        window.electronAPI.logError(`[setupEmoteObserver] Error: ${e.message}`);
    }
}

let globalEmotes = []; // Placeholder para emotes globales
