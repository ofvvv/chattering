function loadForm() {
    // Cuentas
    set('s-tt', cfg.tiktokUser || '');
    set('s-yt', cfg.youtubeChannelId || '');
    set('s-tw', cfg.twitchUser || '');
    set('s-tw-token', cfg.twitchToken || '');
    updateAccountStates();

    // Chat
    set('s-streamer', cfg.streamerName || '');
    chk('s-filter-subs', cfg.filterSubsOnly);
    chk('s-filter-mods', cfg.filterModsOnly);
    chk('s-hide-bots', cfg.hideBots);
    chk('s-block-enabled', cfg.blockedWordsEnabled);
    chk('s-show-own-messages', cfg.showOwnMessages !== false);
    chk('s-scroll-invert', cfg.scrollInvert === true);
    chk('s-timestamps', cfg.showTimestamps !== false);
    chk('s-link-previews', cfg.linkPreviews !== false);
    chk('s-msg-anim', cfg.msgAnimation !== false);
    chk('s-accessibility', cfg.accessibility === true);

    // Emotes
    chk('s-7tv-global', cfg.show7tvGlobal !== false);
    chk('s-7tv-canal', cfg.show7tvCanal !== false);
    chk('s-bttv-global', cfg.showBttvGlobal !== false);
    chk('s-bttv-canal', cfg.showBttvCanal !== false);
    chk('s-ffz-global', cfg.showFfzGlobal !== false);
    chk('s-ffz-canal', cfg.showFfzCanal !== false);

    // Moderación y Alertas
    chk('s-mod-hover', cfg.modHoverMenu !== false);
    chk('s-show-banned', cfg.showBannedMessages === true);
    chk('s-test-buttons', cfg.showTestButtons === true);
    chk('s-show-follows', cfg.showFollows !== false);
    chk('s-show-gifts', cfg.showGifts !== false);
    chk('s-show-likes', cfg.showLikes !== false);

    // Sonidos y TTS
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

    // Apariencia
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

    // Sistema
    chk('s-hw-accel', cfg.disableHWAccel !== true);
    chk('s-auto-update', cfg.autoUpdateDisabled !== true);
    
    // Tags
    blockedWords = cfg.blockedWords || [];
    highlights = cfg.customHighlights || [];
    renderTags('blocked-tags-wrap', blockedWords, false);
    renderTags('highlight-tags-wrap', highlights, true);
    initTagsInput('blocked-tags-wrap', 'blocked-input', false);
    initTagsInput('highlight-tags-wrap', 'highlight-input', true);
}

function updateAccountStates() {
    const ttBtn = document.getElementById('btn-tt-login');
    const ttLbl = document.getElementById('tt-btn-label');
    const ttSt  = document.getElementById('tt-status-msg');
    if (cfg.tiktokSessionId && cfg.tiktokUser) {
        ttLbl.textContent = '✓ Conectado como @' + cfg.tiktokUser;
        ttBtn.style.background = '#1a4a1a';
        ttBtn.style.borderColor = '#53fc18';
        ttBtn.style.color = '#53fc18';
        ttSt.textContent = 'Haz clic para reconectar o cambiar cuenta';
        ttSt.className = 'hint status-ok';
    } else {
        ttLbl.textContent = '🔗 Vincular sesión de TikTok';
    }

    const twBtn = document.getElementById('s-tw-oauth-btn');
    const twLbl = document.getElementById('s-tw-oauth-label');
    const twSt  = document.getElementById('s-tw-status');
    if (cfg.twitchToken && cfg.twitchUser) {
        twLbl.textContent = '✓ Conectado como ' + (cfg.twitchUser);
        twBtn.className = 'btn btn-twitch connected';
        twSt.textContent = 'Haz clic para reconectar o cambiar cuenta';
    } else {
        twLbl.textContent = 'Conectar con Twitch';
    }
}

function collectFormData() {
    return {
        ...cfg,
        tiktokUser: document.getElementById('s-tt').value.replace('@','').trim(),
        youtubeChannelId: document.getElementById('s-yt').value.trim(),
        twitchUser: document.getElementById('s-tw').value.trim() || cfg.twitchUser || '',
        twitchToken: document.getElementById('s-tw-token').value.trim(),
        streamerName: document.getElementById('s-streamer').value.trim(),
        filterSubsOnly: document.getElementById('s-filter-subs').checked,
        filterModsOnly: document.getElementById('s-filter-mods').checked,
        hideBots: document.getElementById('s-hide-bots').checked,
        blockedWordsEnabled: document.getElementById('s-block-enabled').checked,
        blockedWords: blockedWords,
        customHighlights: highlights,
        showOwnMessages: document.getElementById('s-show-own-messages').checked,
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
        modHoverMenu: document.getElementById('s-mod-hover').checked,
        showBannedMessages: document.getElementById('s-show-banned').checked,
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
}
