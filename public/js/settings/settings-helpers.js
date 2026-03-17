function set(id, v) { 
    const el = document.getElementById(id); 
    if (el) el.value = v; 
}

function chk(id, v) { 
    const el = document.getElementById(id); 
    if (el) el.checked = !!v; 
}

function openLink(url) {
    window.electronAPI.openExternal(url);
}

function testSoundPreview(type) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const vol = (parseInt(document.getElementById('s-volume')?.value || '60') / 100) * 0.5;
        const play = (freq, start, dur) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(vol, ctx.currentTime + start);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + dur + 0.05);
        };
        if (type === 'follow')  { play(660, 0, 0.12); play(880, 0.13, 0.1); }
        else if (type === 'gift') { play(523, 0, 0.1); play(659, 0.09, 0.1); play(784, 0.18, 0.1); }
        else { play(440, 0, 0.08); play(554, 0.1, 0.12); }
    } catch {}
}