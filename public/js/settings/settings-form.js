function loadForm() {
    set('s-tt', cfg.tiktokUser || '');
    set('s-yt', cfg.youtubeChannelId || '');
    set('s-tw', cfg.twitchUser || '');

    const ttBtn = document.getElementById('btn-tt-login');
    const ttLbl = document.getElementById('tt-btn-label');
    const ttSt = document.getElementById('tt-status-msg');
    if (cfg.tiktokSessionId && cfg.tiktokUser) {
        ttLbl.textContent = '✓ Conectado como @' + cfg.tiktokUser;
        ttBtn.style.background = '#1a4a1a';
        ttBtn.style.borderColor = '#53fc18';
        ttBtn.style.color = '#53fc18';
        ttSt.textContent = 'Haz clic para reconectar o cambiar cuenta';
        ttSt.className = 'hint status-ok';
    } else if (cfg.tiktokUser) {
        ttLbl.textContent = 'Actualizar conexión a @' + cfg.tiktokUser;
        ttSt.textContent = 'Tu conexión a TikTok es antigua. Por favor revincula.';
        ttSt.style.color = '#ffaa00';
    }

    document.getElementById('s-tw-token').value = cfg.twitchToken || '';

    const btn = document.getElementById('s-tw-oauth-btn');
    const lbl = document.getElementById('s-tw-oauth-label');
    const st = document.getElementById('s-tw-status');
    if (cfg.twitchToken) {
        lbl.textContent = '✓ Conectado como ' + (cfg.twitchUser || '?');
        btn.className = 'btn btn-twitch connected';
        st.textContent = 'Haz clic para reconectar o cambiar cuenta';
        st.className = 'hint';
        const twField = document.getElementById('s-tw');
        if (twField) {
            twField.disabled = true;
            twField.title = 'El usuario se gestiona automáticamente mediante OAuth';
            twField.style.opacity = '0.5';
        }
    } else {
        const twField = document.getElementById('s-tw');
        if (twField) {
            twField.disabled = false;
            twField.style.opacity = '';
            twField.title = '';
        }
    }

    set('s-streamer', cfg.streamerName || '');
    chk('s-filter-subs', cfg.filterSubsOnly);
    chk('s-filter-mods', cfg.filterModsOnly);
    chk('s-hide-bots', cfg.hideBots);
    chk('s-block-enabled', cfg.blockedWordsEnabled);
    chk('s-scroll-pause', cfg.scrollPauseOnHover !== false);
    chk('s-scroll-invert', cfg.scrollInvert === true);
    chk('s-timestamps', cfg.showTimestamps !== false);
    chk('s-link-previews', cfg.linkPreviews !== false);
    chk('s-msg-anim', cfg.msgAnimation !== false);
    chk('s-accessibility', cfg.accessibility === true);

    chk('s-7tv-global', cfg.show7tvGlobal !== false);
    chk('s-7tv-canal', cfg.show7tvCanal !== false);
    chk('s-bttv-global', cfg.showBttvGlobal !== false);
    chk('s-bttv-canal', cfg.showBttvCanal !== false);
    chk('s-ffz-global', cfg.showFfzGlobal !== false);
    chk('s-ffz-canal', cfg.showFfzCanal !== false);
    chk('s-lazy-emotes', cfg.lazyEmotes !== false);

    chk('s-mod-hover', cfg.modHoverMenu !== false);
    chk('s-show-banned', cfg.showBannedMessages === true);
    chk('s-mod-visible', cfg.modButtonsVisible === true);
    chk('s-test-buttons', cfg.showTestButtons === true);

    chk('s-show-follows', cfg.showFollows !== false);
    chk('s-show-gifts', cfg.showGifts !== false);
    chk('s-show-likes', cfg.showLikes !== false);
    chk('s-sounds-enabled', cfg.soundsEnabled === true);
    chk('s-sound-follow', cfg.soundFollow === true);
    chk('s-sound-gift', cfg.soundGift === true);
    chk('s-sound-mention', cfg.soundMention === true);
    const vol = cfg.soundVolume || 60;
    document.getElementById('s-volume').value = vol;
    document.getElementById('vol-val').textContent = vol;
    chk('s-tts-enabled', cfg.ttsEnabled === true);
    chk('s-tts-TT', cfg.ttsTT === true);
    chk('s-tts-YT', cfg.ttsYT === true);
    chk('s-tts-TW', cfg.ttsTW === true);
    chk('s-tts-noname', cfg.ttsNoName === true);
    chk('s-tts-no-emoji', cfg.ttsNoEmoji !== false);
    updateTtsUI();

    const fs = cfg.fontSize || 13.5;
    document.getElementById('s-fontsize').value = fs;
    document.getElementById('font-size-val').textContent = fs + 'px';
    chk('s-compact', cfg.compact === true);
    chk('s-always-top', cfg.alwaysOnTop === true);
    chk('s-translucent', cfg.translucent === true);
    const op = cfg.windowOpacity || 90;
    document.getElementById('s-opacity').value = op;
    document.getElementById('opacity-val').textContent = op + '%';
    updateTranslucent();
    document.getElementById('s-dock-pos').value = cfg.dockPosition || 'top';

    selectedTheme = cfg.theme || 'dark';
    setTheme(selectedTheme);

    chk('s-hw-accel', cfg.disableHWAccel !== true);
    chk('s-auto-update', cfg.autoUpdateDisabled !== true);

    window.electronAPI.getVersion().then(v => { const el = document.getElementById('app-version'); if (el) el.textContent = 'v' + v; }).catch(() => {});

    blockedWords = cfg.blockedWords || [];
    highlights = cfg.customHighlights || [];
    renderTags('blocked-tags-wrap', blockedWords, false);
    renderTags('highlight-tags-wrap', highlights, true);
    makeTagsInput('blocked-tags-wrap', 'blocked-input');
    makeTagsInput('highlight-tags-wrap', 'highlight-input');
}