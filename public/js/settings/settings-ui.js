let selectedTheme = 'dark';

function initUIEventListeners() {
    // Navegación de la barra lateral
    document.querySelectorAll('.sb-item').forEach(item => {
        const page = item.getAttribute('onclick').match(/\('(.+?)'/)[1];
        item.addEventListener('click', () => goTo(page, item));
    });

    // Búsqueda en la barra lateral
    document.getElementById('sb-search').addEventListener('input', (e) => filterSettings(e.target.value));

    // Cambio de tema
    document.querySelectorAll('.shape-card[id^="theme-"]').forEach(card => {
        const theme = card.id.replace('theme-', '');
        card.addEventListener('click', () => setTheme(theme));
    });

    // Controladores de previsualización en vivo
    const previewElements = [
        's-compact', 's-fontsize', 's-msg-anim', 's-scroll-invert', 's-always-top', 
        's-translucent', 's-opacity', 's-timestamps', 's-link-previews', 's-mod-hover', 's-dock-pos'
    ];
    previewElements.forEach(id => {
        document.getElementById(id)?.addEventListener('change', previewChange);
        if (document.getElementById(id)?.type === 'range-one') {
            document.getElementById(id)?.addEventListener('input', previewChange);
        }
    });

    // Lógica específica para UI
    document.getElementById('s-tts-enabled').addEventListener('change', updateTtsUI);
    document.getElementById('s-translucent').addEventListener('change', updateTranslucent);
    document.querySelector('.btn-secondary[onclick*="testSoundPreview"]').addEventListener('click', () => testSoundPreview('follow'));
}

function goTo(page, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    el.classList.add('active');
}

function filterSettings(q) {
    const ql = q.toLowerCase().trim();
    document.querySelectorAll('.sb-item').forEach(item => {
        const match = item.textContent.toLowerCase().includes(ql);
        item.style.display = match ? '' : 'none';
    });
    document.querySelectorAll('.row').forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.background = (ql && text.includes(ql)) ? 'rgba(155,155,245,.08)' : '';
    });
}

function setTheme(t) {
    selectedTheme = t;
    document.querySelectorAll('.shape-card[id^="theme-"]').forEach(c => c.classList.remove('active'));
    const el = document.getElementById('theme-' + t);
    if (el) el.classList.add('active');
    previewChange();
}

async function previewChange() {
    const partial = {
        compact: document.getElementById('s-compact')?.checked,
        fontSize: parseFloat(document.getElementById('s-fontsize')?.value || '13.5'),
        msgAnimation: document.getElementById('s-msg-anim')?.checked,
        scrollInvert: document.getElementById('s-scroll-invert')?.checked,
        alwaysOnTop: document.getElementById('s-always-top')?.checked,
        translucent: document.getElementById('s-translucent')?.checked,
        windowOpacity: parseInt(document.getElementById('s-opacity')?.value || '90'),
        showTimestamps: document.getElementById('s-timestamps')?.checked,
        linkPreviews: document.getElementById('s-link-previews')?.checked,
        modHoverMenu: document.getElementById('s-mod-hover')?.checked,
        theme: selectedTheme,
        dockPosition: document.getElementById('s-dock-pos')?.value
    };
    try { await window.electronAPI.previewSettings(partial); } catch (e) { console.error('Preview failed:', e); }
}

function updateTtsUI() {
    const on = document.getElementById('s-tts-enabled').checked;
    const opts = document.getElementById('tts-opts');
    opts.style.opacity = on ? '1' : '0.3';
    opts.style.pointerEvents = on ? 'auto' : 'none';
}

function updateTranslucent() {
    const on = document.getElementById('s-translucent').checked;
    const row = document.getElementById('opacity-row');
    row.style.opacity = on ? '1' : '0.3';
    row.style.pointerEvents = on ? 'auto' : 'none';
}

function testSoundPreview(type) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const vol = (parseInt(document.getElementById('s-volume')?.value || '60') / 100) * 0.5;
        const play = (freq, start, dur) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(vol, ctx.currentTime + start);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + dur + 0.05);
        };
        if (type === 'follow')  { play(660, 0, 0.12); play(880, 0.13, 0.1); }
        else { play(440, 0, 0.08); play(554, 0.1, 0.12); }
    } catch (e) { console.error('Sound preview failed:', e); }
}
