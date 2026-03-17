let emotes = {
    twitch: new Map(),
    bttv: new Map(),
    ffz: new Map(),
    '7tv': new Map(),
};

async function cargarEmotes(config) {
    if (!config) {
        console.warn('Configuración no disponible para cargar emotes.');
        return;
    }
    console.log('Cargando emotes...');

    try {
        if (config.twitchChannel) {
            // Lógica para cargar emotes de Twitch, BTTV, FFZ, 7TV para el canal
        }
        if (config.show7tvGlobal) {
            // Lógica para cargar emotes globales de 7TV
        }
    } catch (e) {
        window.electronAPI.logError(`[cargarEmotes] ${e.message}`);
    }
}

function setupEmoteObserver() {
    // Lógica para observar el chat y reemplazar texto con emotes
    // Esto puede ser complejo y requerir un MutationObserver
}

function toggleEmotePicker() {
    const picker = document.getElementById('emote-picker');
    if (picker) {
        picker.classList.toggle('visible');
        if (picker.classList.contains('visible')) {
            renderEmotePicker();
        }
    }
}

function renderEmotePicker() {
    const grid = document.getElementById('ep-grid');
    if (!grid) return;
    grid.innerHTML = ''; // Limpiar

    // Renderizar emotes de todas las fuentes
    // Ejemplo para Twitch:
    for (const [name, url] of emotes.twitch.entries()) {
        const emoteEl = document.createElement('img');
        emoteEl.src = url;
        emoteEl.alt = name;
        emoteEl.title = name;
        emoteEl.classList.add('emote-picker-emote');
        emoteEl.onclick = () => insertEmote(name);
        grid.appendChild(emoteEl);
    }
    // ... repetir para bttv, ffz, 7tv ...
}

function filterEmotePicker(searchTerm) {
    // Lógica para filtrar emotes en el picker
}

function insertEmote(emoteName) {
    const input = document.getElementById('chat-input-field');
    if (input) {
        input.value += ` ${emoteName} `;
        input.focus();
    }
}
