
// ── SOUND ─────────────────────────────────────────────────────────────────────
let audioCtx = null
function getAudioCtx() { if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)(); return audioCtx }
function playTone(freq=440, dur=0.15, vol=0.4, type='sine') {
    if(!cfg.soundsEnabled) return
    try {
        const ctx=getAudioCtx(), osc=ctx.createOscillator(), gain=ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value=freq; osc.type=type
        const v=(cfg.soundVolume||60)/100*vol
        gain.gain.setValueAtTime(v, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+dur)
        osc.start(); osc.stop(ctx.currentTime+dur)
    } catch(e){
        const errorMessage = `ERROR IN playTone: ${e.message}\n${e.stack}`;
        if (window.electronAPI && typeof window.electronAPI.logError === 'function') window.electronAPI.logError(errorMessage);
        else console.error('Fallback: ', errorMessage);
    }
}
function playFollow() {
    try { playTone(660,0.12,0.35); setTimeout(()=>playTone(880,0.1,0.25),120) }
    catch (e) {
        const errorMessage = `ERROR IN playFollow: ${e.message}\n${e.stack}`;
        if (window.electronAPI && typeof window.electronAPI.logError === 'function') window.electronAPI.logError(errorMessage);
        else console.error('Fallback: ', errorMessage);
    }
}
function playGift() {
    try { [523,659,784].forEach((f,i)=>setTimeout(()=>playTone(f,0.1,0.3),i*80)) }
    catch (e) {
        const errorMessage = `ERROR IN playGift: ${e.message}\n${e.stack}`;
        if (window.electronAPI && typeof window.electronAPI.logError === 'function') window.electronAPI.logError(errorMessage);
        else console.error('Fallback: ', errorMessage);
    }
}
function playMention() {
    try { playTone(440,0.08,0.2); setTimeout(()=>playTone(554,0.12,0.3),100) }
    catch (e) {
        const errorMessage = `ERROR IN playMention: ${e.message}\n${e.stack}`;
        if (window.electronAPI && typeof window.electronAPI.logError === 'function') window.electronAPI.logError(errorMessage);
        else console.error('Fallback: ', errorMessage);
    }
}
function testSound(type) {
    const prev=cfg.soundsEnabled; cfg.soundsEnabled=true
    if(type==='follow') playFollow()
    else if(type==='gift') playGift()
    else playMention()
    cfg.soundsEnabled=prev
}

// ── TTS ───────────────────────────────────────────────────────────────────────
let ttsQueue=[], ttsBusy=false
let ttsVoiceIdx=0
let ttsVoiceList=[]

function getTTSVoices(){
    if(ttsVoiceList.length) return ttsVoiceList
    const all=speechSynthesis.getVoices()
    const es=all.filter(v=>v.lang.startsWith('es'))
    const en=all.filter(v=>v.lang.startsWith('en'))
    ttsVoiceList = es.length >= 2 ? es : es.length === 1 ? [...es,...en] : en.length ? en : all
    return ttsVoiceList
}
speechSynthesis.addEventListener('voiceschanged',()=>{ ttsVoiceList=[] })

function speakMsg(d){
    if(!cfg.ttsEnabled || !cfg['tts'+d.plat]) return;

    let textToSpeak = d.text || '';

    if (cfg.ttsNoEmoji !== false) {
        // Regex para eliminar emojis, incluidos los que tienen variaciones de tono de piel y género
        textToSpeak = textToSpeak.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F004}-\u{1F0CF}]/gu, '');
        // Eliminar también los emotes de Twitch/7TV por su nombre
        if (d.plat === 'TW') {
            Object.keys(emoteMap).forEach(emoteName => {
                textToSpeak = textToSpeak.replace(new RegExp(`\b${emoteName}\b`, 'g'), '');
            });
        }
    }

    // Limpiar texto restante y añadir nombre de usuario si es necesario
    const cleanText = textToSpeak.replace(/https?:\/\/\S+/g, 'link').trim();
    const text = cfg.ttsNoName ? cleanText : `${d.user}: ${cleanText}`;
    if(!text) return;

    const MAX_TTS_QUEUE=50;
    if(ttsQueue.length>=MAX_TTS_QUEUE)ttsQueue.shift();
    ttsQueue.push({text,plat:d.plat,user:d.user});
    if(!ttsBusy) flushTTS();
}
function flushTTS(){
    if(!ttsQueue.length){ttsBusy=false;return}
    ttsBusy=true
    const {text,plat}=ttsQueue.shift()
    const utt=new SpeechSynthesisUtterance(text)
    utt.lang='es-MX'
    utt.volume=Math.min((cfg.soundVolume||60)/100,1)

    const voices=getTTSVoices()
    if(voices.length>0){
        utt.voice=voices[ttsVoiceIdx % voices.length]
        ttsVoiceIdx++
        const variation=ttsVoiceIdx%4
        utt.rate  = [1.0, 1.08, 0.95, 1.05][variation]
        utt.pitch = [1.0, 1.15, 0.88, 1.08][variation]
    } else {
        const v=ttsVoiceIdx++%4
        utt.rate  = [1.0, 1.08, 0.95, 1.05][v]
        utt.pitch = [1.0, 1.15, 0.88, 1.08][v]
    }

    utt.onend=()=>flushTTS()
    utt.onerror=()=>{ ttsVoiceIdx++; flushTTS() }
    speechSynthesis.speak(utt)
}
