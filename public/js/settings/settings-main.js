const SERVER = 'http://localhost:3000';
let cfg = {};

async function init() {
    cfg = (await window.electronAPI.getConfig()) || {};
    loadForm();
}

async function guardar() {
    const statusEl = document.getElementById('save-status');
    statusEl.textContent = 'Guardando...';
    const newCfg = {
        ...cfg,
        tiktokUser: document.getElementById('s-tt').value.replace('@', '').trim(),
        youtubeChannelId: document.getElementById('s-yt').value.trim(),
        twitchUser: document.getElementById('s-tw').value.trim() || cfg.twitchUser || '',
        twitchToken: document.getElementById('s-tw-token').value.trim(),
        streamerName: document.getElementById('s-streamer').value.trim(),
        filterSubsOnly: document.getElementById('s-filter-subs').checked,
        filterModsOnly: document.getElementById('s-filter-mods').checked,
        hideBots: document.getElementById('s-hide-bots').checked,
        blockedWordsEnabled: document.getElementById('s-block-enabled').checked,
        blockedWords,
        customHighlights: highlights,
        scrollPauseOnHover: document.getElementById('s-scroll-pause').checked,
        scrollInvert: document.getElementById('s-scroll-invert').checked,
        showTimestamps: document.getElementById('s-timestamps').checked,
        linkPreviews: document.getElementById('s-link-previews').checked,
        msgAnimation: document.getElementById('s-msg-anim').checked,
        accessibility: document.getElementById('s-accessibility').checked,
        show7tvGlobal: document.getElementById('s-7tv-global').checked,
        show7tvCanal: document.getElementById('s-7tv-canal').checked,
        showBttvGlobal: document.getElementById('s-bttv-global').checked,
        showBttvCanal: document.getElementById('s-bttv-canal').checked,
        showFfzGlobal: document.getElementById('s-ffz-global').checked,
        showFfzCanal: document.getElementById('s-ffz-canal').checked,
        lazyEmotes: document.getElementById('s-lazy-emotes').checked,
        modHoverMenu: document.getElementById('s-mod-hover').checked,
        showBannedMessages: document.getElementById('s-show-banned').checked,
        modButtonsVisible: document.getElementById('s-mod-visible').checked,
        showTestButtons: document.getElementById('s-test-buttons').checked,
        showFollows: document.getElementById('s-show-follows').checked,
        showGifts: document.getElementById('s-show-gifts').checked,
        showLikes: document.getElementById('s-show-likes').checked,
        soundsEnabled: document.getElementById('s-sounds-enabled').checked,
        soundFollow: document.getElementById('s-sound-follow').checked,
        soundGift: document.getElementById('s-sound-gift').checked,
        soundMention: document.getElementById('s-sound-mention').checked,
        soundVolume: parseInt(document.getElementById('s-volume').value),
        ttsEnabled: document.getElementById('s-tts-enabled').checked,
        ttsTT: document.getElementById('s-tts-TT').checked,
        ttsYT: document.getElementById('s-tts-YT').checked,
        ttsTW: document.getElementById('s-tts-TW').checked,
        ttsNoName: document.getElementById('s-tts-noname').checked,
        ttsNoEmoji: document.getElementById('s-tts-no-emoji').checked,
        fontSize: parseFloat(document.getElementById('s-fontsize').value),
        compact: document.getElementById('s-compact').checked,
        alwaysOnTop: document.getElementById('s-always-top').checked,
        translucent: document.getElementById('s-translucent').checked,
        windowOpacity: parseInt(document.getElementById('s-opacity').value),
        dockPosition: document.getElementById('s-dock-pos').value,
        theme: selectedTheme,
        disableHWAccel: !document.getElementById('s-hw-accel').checked,
        autoUpdateDisabled: !document.getElementById('s-auto-update')?.checked,
    };
    const r = await window.electronAPI.saveSettings(newCfg);
    cfg = newCfg;
    statusEl.textContent = '✓ Guardado — reconectando plataformas...';
}

async function resetConfig() {
    if (!confirm('¿Restablecer toda la configuración y volver al setup inicial?')) return;
    await window.electronAPI.resetConfig();
    window.close();
}

init();