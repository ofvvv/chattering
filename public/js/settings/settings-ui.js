let selectedTheme = 'dark';

function filterSettings(q) {
    const ql = q.toLowerCase().trim();
    if (!ql) {
        document.querySelectorAll('.sb-item').forEach(i => { i.style.display = ''; i.style.background = ''; });
        document.querySelectorAll('.row, .section').forEach(r => r.style.display = '');
        return;
    }
    document.querySelectorAll('.sb-item').forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(ql) ? '' : 'none';
    });
    document.querySelectorAll('.row').forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.background = text.includes(ql) ? 'rgba(155,155,245,.08)' : '';
        row.style.display = '';
    });
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
    try { await window.electronAPI.previewSettings(partial); } catch {}
}

function goTo(page, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    el.classList.add('active');
}

function setTheme(t) {
    selectedTheme = t;
    document.querySelectorAll('.shape-card[id^="theme-"]').forEach(c => c.classList.remove('active'));
    const el = document.getElementById('theme-' + t);
    if (el) el.classList.add('active');
    previewChange();
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
