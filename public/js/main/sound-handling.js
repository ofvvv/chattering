const audioCache = {};

function playSound(soundName) {
    try {
        if (!cfg.soundsEnabled) return;

        const soundFile = `/assets/sounds/${soundName}.mp3`;

        let audio = audioCache[soundFile];
        if (!audio) {
            audio = new Audio(soundFile);
            audioCache[soundFile] = audio;
        }

        audio.currentTime = 0;
        audio.play().catch(e => {
            // El navegador puede bloquear la reproducción automática si no hay interacción del usuario
            if (e.name === 'NotAllowedError') {
                console.warn(`Playback of ${soundName} blocked by browser.`);
            } else {
                window.electronAPI.logError(`[playSound] Playback Error for ${soundName}: ${e.message}`);
            }
        });

    } catch (e) {
        window.electronAPI.logError(`[playSound] General Error for ${soundName}: ${e.message}`);
    }
}
