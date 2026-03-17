
// ── EMOTES ────────────────────────────────────────────────────────────────────
async function cargarEmotes(config) {
    Object.keys(emoteMap).forEach(key => delete emoteMap[key]);
    const statusEl = document.getElementById('emote-status');
    if (statusEl) statusEl.textContent = 'Cargando emotes...';
    let twitchId = null;

    if (config.twitchUser) {
        try {
            if (config.twitchToken) {
                const r = await fetch(`https://api.twitch.tv/helix/users?login=${config.twitchUser}`, {
                    headers: { 
                        'Client-ID': 'w2q6ngvevmf1gkuu1ngiqwmyzqmjrt', 
                        'Authorization': `Bearer ${config.twitchToken.replace('oauth:', '')}` 
                    }
                });
                const d = await r.json();
                if (d.data && d.data.length > 0) twitchId = d.data[0].id;
            } else {
                const r = await fetch(`https://decapi.me/twitch/id/${config.twitchUser}`);
                const id = (await r.text()).trim();
                if (id && !isNaN(id) && !id.includes('User not found')) twitchId = id;
            }
        } catch (e) { console.warn('[Emotes] Error obteniendo ID', e); }
    }

    const tasks =[];
    
    if (config.show7tvGlobal !== false) tasks.push(fetch('https://7tv.io/v3/emote-sets/global').then(r=>r.json()).then(d=>{d?.emotes?.forEach(e=>{emoteMap[e.name]={url:`https://cdn.7tv.app/emote/${e.id}/2x.webp`,zw:(e.flags&256)!==0,platform:'7TV',id:e.id}})}).catch(()=>{}));
    if (config.show7tvCanal !== false && twitchId) tasks.push(fetch(`https://7tv.io/v3/users/twitch/${twitchId}`).then(r=>r.ok?r.json():null).then(u=>{const sid=u?.emote_set?.id;if(!sid)return;return fetch(`https://7tv.io/v3/emote-sets/${sid}`).then(r=>r.json()).then(d=>{d?.emotes?.forEach(e=>{emoteMap[e.name]={url:`https://cdn.7tv.app/emote/${e.id}/2x.webp`,zw:(e.flags&256)!==0,platform:'7TV',id:e.id}})})}).catch(()=>{}));
    
    if (config.showBttvGlobal !== false) tasks.push(fetch('https://api.betterttv.net/3/cached/emotes/global').then(r=>r.json()).then(d=>{d?.forEach(e=>{emoteMap[e.code]={url:`https://cdn.betterttv.net/emote/${e.id}/2x`,zw:false,platform:'BTTV',id:e.id}})}).catch(()=>{}));
    if (config.showBttvCanal !== false && twitchId) tasks.push(fetch(`https://api.betterttv.net/3/cached/users/twitch/${twitchId}`).then(r=>r.ok?r.json():null).then(d=>{if(!d)return;[...(d.channelEmotes||[]),...(d.sharedEmotes||[])].forEach(e=>{emoteMap[e.code]={url:`https://cdn.betterttv.net/emote/${e.id}/2x`,zw:false,platform:'BTTV',id:e.id}})}).catch(()=>{}));
    
    if (config.showFfzGlobal !== false) tasks.push(fetch('https://api.frankerfacez.com/v1/set/global').then(r=>r.json()).then(d=>{Object.values(d?.sets||{}).forEach(s=>{s.emoticons?.forEach(e=>{emoteMap[e.name]={url:`https:${Object.values(e.urls)[0]}`,zw:false,platform:'FFZ',id:e.id}})})}).catch(()=>{}));
    if (config.showFfzCanal !== false && config.twitchUser) tasks.push(fetch(`https://api.frankerfacez.com/v1/room/${config.twitchUser.toLowerCase()}`).then(r=>r.ok?r.json():null).then(d=>{if(!d)return;Object.values(d?.sets||{}).forEach(s=>{s.emoticons?.forEach(e=>{emoteMap[e.name]={url:`https:${Object.values(e.urls)[0]}`,zw:false,platform:'FFZ',id:e.id}})})}).catch(()=>{}));

    await Promise.allSettled(tasks);
    const total = Object.keys(emoteMap).length;
    console.log(`[Emotes] Cargados ${total} emotes custom.`);
    if (statusEl) statusEl.textContent = total > 0 ? `✓ ${total} emotes cargados` : (twitchId ? '⚠ Sin emotes en el canal' : '⚠ Configura Twitch primero');
}

function parseEmotes(text, twitchEmotes, plat, ytEmotes) {
    if (!text) return '';

    // 1. Tokenize by space to handle words and emotes
    let tokens = [{ type: 'text', content: text }];

    // 2. PRIORIDAD NATIVA: Parsear emotes nativos de Twitch
    if (plat === 'TW' && twitchEmotes) {
        const nativeEmotes = [];
        for (const [id, positions] of Object.entries(twitchEmotes)) {
            for (const pos of positions) {
                const [start, end] = pos.split('-').map(Number);
                const name = text.substring(start, end + 1);
                nativeEmotes.push({ name, start, end, id });
            }
        }
        // Ordenar por posición de inicio para procesar en orden
        nativeEmotes.sort((a, b) => a.start - b.start);

        let lastIndex = 0;
        const newTokens = [];
        for (const emote of nativeEmotes) {
            if (emote.start > lastIndex) {
                newTokens.push({ type: 'text', content: text.substring(lastIndex, emote.start) });
            }
            newTokens.push({ type: 'emote', html: `<img src="https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/2.0" class="emote" alt="${esc(emote.name)}" data-platform="Twitch" data-emote="${esc(emote.name)}" data-url="https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/2.0">` });
            lastIndex = emote.end + 1;
        }
        if (lastIndex < text.length) {
            newTokens.push({ type: 'text', content: text.substring(lastIndex) });
        }
        tokens = newTokens;
    }

    // 3. Parsear emotes de YouTube (si los hay)
    if (plat === 'YT' && ytEmotes) {
        // Similar al de Twitch, pero con la data de YT
        let lastIndex = 0;
        const newTokens = [];
        const sortedYtEmotes = [...ytEmotes].sort((a,b) => text.indexOf(a.placeholder) - text.indexOf(b.placeholder));
        sortedYtEmotes.forEach(emote => {
             let from = 0;
            while ((from = text.indexOf(emote.placeholder, from)) !== -1) {
                if (from > lastIndex) {
                    newTokens.push({ type: 'text', content: text.substring(lastIndex, from) });
                }
                newTokens.push({ type: 'emote', html: `<img src="${emote.url}" class="emote" alt="${esc(emote.name)}" data-platform="YouTube" data-emote="${esc(emote.name)}" data-url="${emote.url}">` });
                lastIndex = from + emote.placeholder.length;
                from += emote.placeholder.length;
            }
        });
         if (lastIndex < text.length) {
            newTokens.push({ type: 'text', content: text.substring(lastIndex) });
        }
        tokens = newTokens;
    }

    // 4. Parsear emotes de terceros (7TV, BTTV, FFZ) SOLO en los tokens de texto restantes
    const finalTokens = [];
    const thirdPartyEmoteKeys = Object.keys(emoteMap).sort((a, b) => b.length - a.length);

    for (const token of tokens) {
        if (token.type === 'emote') {
            finalTokens.push(token);
            continue;
        }

        let currentText = token.content;
        const parts = [];
        const words = currentText.split(' ');
        
        words.forEach((word, index) => {
            const emoteData = emoteMap[word];
            if (emoteData) {
                parts.push(`<img src="${esc(emoteData.url)}" class="emote${emoteData.zw ? ' zw' : ''}" alt="${esc(word)}" data-platform="${esc(emoteData.platform || '')}" data-emote="${esc(word)}" data-url="${esc(emoteData.url)}">`);
            } else {
                parts.push(esc(word));
            }
            if (index < words.length - 1) {
                parts.push(' '); // Re-add space
            }
        });
        
        finalTokens.push({ type: 'text', content: parts.join('') });
    }

    // 5. Unir todos los tokens en el string final
    return finalTokens.map(t => t.type === 'emote' ? t.html : t.content).join('');
}

let emoteObserver = null;

function setupEmoteObserver() {
    if(!cfg.lazyEmotes) return;
    if(emoteObserver) emoteObserver.disconnect();
    emoteObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const img = entry.target;
            if(entry.isIntersecting) {
                if(img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
            } else {
                if(img.classList.contains('emote-animated') && img.src) {
                    img.dataset.lazysrc = img.src;
                }
            }
        });
    }, { rootMargin:'200px' });
}
