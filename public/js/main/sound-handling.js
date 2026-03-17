
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
    } catch(e){}
}
function playFollow()  { playTone(660,0.12,0.35); setTimeout(()=>playTone(880,0.1,0.25),120) }
function playGift()    { [523,659,784].forEach((f,i)=>setTimeout(()=>playTone(f,0.1,0.3),i*80)) }
function playMention() { playTone(440,0.08,0.2); setTimeout(()=>playTone(554,0.12,0.3),100) }
function testSound(type) {
    const prev=cfg.soundsEnabled; cfg.soundsEnabled=true
    if(type==='follow') playFollow()
    else if(type==='gift') playGift()
    else playMention()
    cfg.soundsEnabled=prev
}
