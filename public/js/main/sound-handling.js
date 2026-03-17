const audioCache = {};

function playSound(soundName) {
    if (!cfg.soundsEnabled) return;

    try {
        let audio = audioCache[soundName];
        if (!audio) {
            const soundFile = `../sounds/${soundName}.mp3`;
            audio = new Audio(soundFile);
            audioCache[soundName] = audio;
        }
        
        audio.currentTime = 0;
        audio.play().catch(e => {
            window.electronAPI.logError(`Error al reproducir sonido (${soundName}): ${e.message}`);
        });
    } catch (e) {
        window.electronAPI.logError(`[playSound] ${e.message}`);
    }
}
