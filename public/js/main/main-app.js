
// ── LAYOUT ────────────────────────────────────────────────────────────────────
function setDockPosition(pos) {
    document.getElementById('main-layout').classList.toggle('dock-bottom',pos==='bottom')
    const dockTop = document.getElementById('layout-dock-top');
    const dockBottom = document.getElementById('layout-dock-bottom');
    if (dockTop) dockTop.classList.toggle('active',pos==='top');
    if (dockBottom) dockBottom.classList.toggle('active',pos==='bottom');
    cfg.dockPosition=pos;
}
function setDockHeight(h) {
    document.getElementById('top-dock').style.height=h+'px';
    const dockHeightSlider = document.getElementById('s-dock-height');
    const dockHeightVal = document.getElementById('dock-height-val');
    if (dockHeightSlider) dockHeightSlider.value=h;
    if (dockHeightVal) dockHeightVal.textContent=h+'px';
    cfg.dockHeight=h;
}
;(function initDockResize(){
    const handle=document.getElementById('dock-resize-handle'),dock=document.getElementById('top-dock')
    if (!handle || !dock) return;
    let dragging=false,startY=0,startH=0
    handle.addEventListener('mousedown',e=>{dragging=true;startY=e.clientY;startH=dock.offsetHeight;document.body.style.cursor='ns-resize';e.preventDefault()})
    document.addEventListener('mousemove',e=>{
        if(!dragging)return
        const isBottom=document.getElementById('main-layout').classList.contains('dock-bottom')
        const delta=isBottom?startY-e.clientY:e.clientY-startY
        setDockHeight(Math.max(40,Math.min(240,startH+delta)))
    })
    document.addEventListener('mouseup',()=>{dragging=false;document.body.style.cursor=''})})()

// ── HOTKEYS ───────────────────────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
    const tag=document.activeElement?.tagName
    const inInput=tag==='INPUT'||tag==='TEXTAREA'

    if(e.ctrlKey&&e.key==='f'){e.preventDefault();openSearch();return}
    if(e.ctrlKey&&e.key==='l'){e.preventDefault();document.getElementById('chat').innerHTML='';msgLineCounter=0;totalMsgCount=0;return}
    if(e.key==='F5'){e.preventDefault();location.reload();return}
    if(e.key==='Escape'&&document.querySelector('.popup-open')){/* handled in popup.html */}
    if(e.key===','&&!inInput){e.preventDefault();window.electronAPI.openSettings();return}

    if(e.key==='Escape'){
        if(searchActive){closeSearch();return}
        if(emoteCtx.classList.contains('open')){closeEmoteCtx();return}
        if(document.getElementById('filter-bar')?.classList.contains('open')){document.getElementById('filter-bar').classList.remove('open');return}
        lpDiv.classList.remove('visible')
        return
    }
    if(e.key==='Enter'&&searchActive&&!inInput){searchNext();return}
    if(e.key==='F3'||((e.key==='g')&&e.ctrlKey)){e.preventDefault();searchNext()}
})

// ── SETTINGS ──────────────────────────────────────────────────────────────────
window.electronAPI.on('settings-saved', newCfg => {
    cfg = newCfg
    aplicarConfig()
    syncFilterChips()
    showToast('✓ Configuración guardada')
    if(newCfg.show7tvGlobal!==undefined) cargarEmotes(newCfg)
})
async function resetConfig(){
    if(!confirm('¿Volver al setup inicial? Se borrará la configuración.'))return
    await window.electronAPI.resetConfig()
}
function aplicarConfig(){
    const chat=document.getElementById('chat')
    if(chat) chat.style.fontSize=(cfg.fontSize||13.5)+'px'
    document.getElementById('test-panel')?.classList.toggle('visible',cfg.showTestButtons===true)
    setDockPosition(cfg.dockPosition||'top')
    setDockHeight(cfg.dockHeight||82)

    document.body.classList.toggle('compact', cfg.compact===true)
    document.body.classList.remove('av-none','av-square','av-squircle','av-circle')
    document.body.classList.add('av-'+(cfg.avatarShape||'none'))
    document.body.classList.toggle('accessibility', cfg.accessibility===true)
    document.body.classList.toggle('no-anim', cfg.msgAnimation===false)
    if(chat) chat.classList.toggle('scroll-invert', cfg.scrollInvert===true)
    document.body.classList.toggle('translucent', cfg.translucent===true)
    if(cfg.translucent) {
        const op = (cfg.windowOpacity||90)/100
        document.body.style.setProperty('--translucent-opacity', op)
    }

    // Aplicar tema
    document.body.classList.remove('theme-midnight', 'theme-forest', 'theme-sakura');
    const theme = cfg.theme || 'dark';
    if (theme && theme !== 'dark') {
        document.body.classList.add('theme-' + theme);
    }

    window.electronAPI?.setAlwaysOnTop(cfg.alwaysOnTop===true)

    const bar=document.getElementById('chat-input-bar')
    if(bar){
        const hasAny=!!(cfg.twitchToken||cfg.tiktokUser||cfg.youtubeChannelId)
        bar.classList.toggle('disabled', !hasAny)
        const field=document.getElementById('chat-input-field')
        if(field) field.placeholder=cfg.twitchToken?'Escribe un mensaje... (:emote /cmd)':'Conecta una plataforma en ⚙ para escribir'
    }
}

// ── DOCK ──────────────────────────────────────────────────────────────────────
const dockScroll=document.getElementById('dock-scroll')
const dockInner=document.getElementById('dock-inner')
const dockLikeRow=document.getElementById('dock-like-row')

let dockAutoScrollTimer = null
let dockUserInteracted = false

function scheduleDockAutoScroll() {
    if (dockAutoScrollTimer) clearTimeout(dockAutoScrollTimer)
    dockAutoScrollTimer = setTimeout(() => {
        if (!dockUserInteracted) {
            dockScroll.scrollTop = dockScroll.scrollHeight
        }
        dockUserInteracted = false
    }, 10000)
}

dockScroll.addEventListener('scroll', () => {
    dockUserInteracted = true
    scheduleDockAutoScroll()
})

dockScroll.addEventListener('wheel', () => {
    dockUserInteracted = true
})

function addToDock(type,user,actionText,giftImgUrl,noAnim=false){
    if(type==='follow'&&cfg.showFollows===false)return
    if(type==='gift'&&cfg.showGifts===false)return
    const empty=document.getElementById('dock-empty');if(empty)empty.remove()
    const wasAtBottom=dockScroll.scrollHeight-dockScroll.scrollTop-dockScroll.clientHeight<10
    const row=document.createElement('div');row.className=`dock-event dock-event-${type}`
    if(noAnim)row.style.animation='none'
    const icon=document.createElement('div');icon.className=`dock-event-icon dock-icon-${type}`
    if(type==='gift'&&giftImgUrl){const img=document.createElement('img');img.src=giftImgUrl;img.className='dock-gift-img';img.alt='';img.onerror=()=>img.replaceWith(document.createTextNode('🎁'));icon.appendChild(img)}
    else icon.textContent=type==='follow'?'👤':'🎁'
    const body=document.createElement('div');body.className='dock-event-body'
    const uSpan=document.createElement('span');uSpan.className=`dock-user dock-${type}-color`;uSpan.textContent=user
    const aSpan=document.createElement('span');aSpan.className='dock-action';aSpan.textContent=actionText
    body.appendChild(uSpan);body.appendChild(aSpan);row.appendChild(icon);row.appendChild(body)
    dockInner.appendChild(row)
    const dockEvents=dockInner.querySelectorAll('.dock-event')
    for(let i=0;i<dockEvents.length-MAX_DOCK;i++)dockEvents[i].remove()
    if(wasAtBottom)dockScroll.scrollTop=dockScroll.scrollHeight
    scheduleDockAutoScroll()
}
function updateLikeRow(user,uid,count){
    if(cfg.showLikes===false)return
    const empty=document.getElementById('dock-empty');if(empty)empty.remove()
    const wasAtBottom=dockScroll.scrollHeight-dockScroll.scrollTop-dockScroll.clientHeight<10
    let existingLike = null
    const likeEvents = dockInner.querySelectorAll('.dock-event-like')
    likeEvents.forEach(ev => {
        if(ev.dataset.userId === uid) existingLike = ev
    })
    if(existingLike) {
        const currentCount = parseInt(existingLike.dataset.count || '0')
        const newCount = currentCount + count
        existingLike.dataset.count = newCount
        existingLike.querySelector('.dock-action').textContent = ` ${newCount} ❤`
        dockInner.appendChild(existingLike)
    } else {
        const row=document.createElement('div')
        row.className='dock-event dock-event-like'
        row.dataset.userId = uid
        row.dataset.count = count
        const icon=document.createElement('div')
        icon.className='dock-event-icon dock-icon-like'
        icon.textContent='❤'
        const body=document.createElement('div')
        body.className='dock-event-body'
        const uSpan=document.createElement('span')
        uSpan.className='dock-user dock-like-color'
        uSpan.textContent=user
        const aSpan=document.createElement('span')
        aSpan.className='dock-action'
        aSpan.textContent=` ${count} ❤`
        body.appendChild(uSpan)
        body.appendChild(aSpan)
        row.appendChild(icon)
        row.appendChild(body)
        dockInner.appendChild(row)
    }
    while(dockInner.children.length>MAX_DOCK){
        const first=dockInner.firstElementChild
        if(first&&first.id!=='dock-empty')first.remove()
    }
    if(wasAtBottom||!dockUserInteracted){dockScroll.scrollTop=dockScroll.scrollHeight;dockUserInteracted=false}
    scheduleDockAutoScroll()
}

// ── CHAT ──────────────────────────────────────────────────────────────────────
const chatDiv = document.getElementById('chat');
const pausedBadge = document.getElementById('scroll-paused');

const isAtBottom = () => chatDiv.scrollHeight - chatDiv.scrollTop - chatDiv.clientHeight < 60;

function updatePauseBadge() {
    if (!isAtBottom()) {
        pausedBadge.classList.add('visible');
    } else {
        pausedBadge.classList.remove('visible');
    }
}

chatDiv.addEventListener('scroll', () => {
    if (isAtBottom()) {
        pausedBadge.classList.remove('visible');
    }
}, { passive: true });

pausedBadge.addEventListener('click', () => {
    chatDiv.scrollTop = chatDiv.scrollHeight;
    pausedBadge.classList.remove('visible');
});

function appendAndScroll(element) {
    const shouldScroll = isAtBottom();
    chatDiv.appendChild(element);
    if (chatDiv.childElementCount > MAX_CHAT_NODES) {
        chatDiv.firstChild.remove();
    }
    if (shouldScroll) {
        chatDiv.scrollTop = chatDiv.scrollHeight;
    } else {
        pausedBadge.classList.add('visible');
    }
}

function shouldShowMsg(d) {
    if(!d||!d.user) return false
    const userLow=(d.user||'').toLowerCase()
    if(cfg.hideBots&&KNOWN_BOTS.includes(userLow)) return false
    if(cfg.blockedWordsEnabled&&cfg.blockedWords?.length){
        const textLow=(d.text||'').toLowerCase()
        if(cfg.blockedWords.some(w=>textLow.includes(w))) return false
    }
    if(cfg.filterSubsOnly&&!d.badges?.sub) return false
    if(cfg.filterModsOnly&&!d.badges?.mod) return false
    if(!chipAllowsMsg(d)) return false
    return true
}

function isCustomHighlight(text) {
    if(!cfg.customHighlights?.length) return false
    const tl=(text||'').toLowerCase()
    return cfg.customHighlights.some(w=>tl.includes(w))
}

function crearMsgChat(d,animate=false){
    if(!shouldShowMsg(d)) return null
    const div=document.createElement('div')
    const streamer=cfg.streamerName||''
    const isMention=streamer&&d.text?.toLowerCase().includes(streamer.toLowerCase())
    const isCustom=isCustomHighlight(d.text)
    const bg=nextBg(false)
    if(d.isFirst) div.className=`linea first-chatter ${bg}`
    else if(isMention) div.className=`linea mention-highlight ${bg}`
    else if(isCustom) div.className=`linea custom-highlight ${bg}`
    else div.className=`linea ${bg}`
    if(animate) div.classList.add('linea-new')
    div.dataset.sub=d.badges?.sub?'true':'false'
    div.dataset.mod=d.badges?.mod?'true':'false'
    const now=new Date(),time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    const su=esc(d.user),sid=esc(d.userId),sav=esc(d.avatar??''),spl=esc(d.plat),color=getColor(d.user)
    const url=d.plat==='TT'?`https://www.tiktok.com/@${su}`:d.plat==='TW'?`https://www.twitch.tv/${su.toLowerCase()}`:`https://www.youtube.com/channel/${sid}`
    let html=''
    if(cfg.showTimestamps!==false)html+=`<span class="timestamp">${time}</span>`
    html+=`<span class="plat-icon bg-${spl}" title="${spl}"><svg viewBox="0 0 18 18">${platIconSvg(spl)}</svg></span>`
    html+=`<span class="profile-link" data-user="${su}" data-userid="${sid}" data-color="${esc(color)}" data-avatar="${sav}" data-plat="${spl}" data-url="${esc(url)}">`
    if(d.avatar)html+=`<img src="${sav}" class="avatar" alt="">`
    if(d.badgeUrls?.length){
        d.badgeUrls.forEach(b=>{html+=`<img src="${esc(b.url)}" class="badge-img" title="${esc(b.name)}" alt="${esc(b.name)}">`})
    } else {
        if(d.badges?.mod) html+=`<span class="badge-icon" title="Mod">🛡️</span>`
        if(d.badges?.sub) html+=`<span class="badge-icon" title="Sub">⭐</span>`
    }
    html+=`<span class="user" style="color:${color}">${su}</span></span>`
    html+=`<span class="colon">:</span><span class="text chat-text">${parseEmotes(d.text, d.twitchEmotes, d.plat, d.ytEmotes)}</span>`
    div.setAttribute('data-uid', d.userId||'')
    div.setAttribute('data-user', d.user||'')
    div.innerHTML=html
    if(d.plat==='TW' && cfg.modHoverMenu!==false) {
        const menu=document.createElement('div')
        menu.className='mod-hover-menu'
        const uid=esc(d.userId||''), uname=esc(d.user||''), utxt=esc((d.text||'').slice(0,80).replace(/'/g,"\\'"))
        menu.innerHTML=`<button class="mhm-btn reply" title="Responder" onclick="startReply('${uname}','${utxt}','${uid}')">↩</button><button class="mhm-btn" title="Copiar" onclick="navigator.clipboard.writeText(this.closest('.linea').querySelector('.chat-text')?.textContent||'')">⎘</button>${cfg.twitchToken?`<button class="mhm-btn timeout" title="Timeout 5min" onclick="modAction('${uid}','${uname}','timeout',300)">⏱</button><button class="mhm-btn ban" title="Ban" onclick="modAction('${uid}','${uname}','ban')">🚫</button>`:''}`
        div.style.position='relative'
        div.appendChild(menu)
    }
    if(isMention&&animate){
        showToast(`💬 Mención de ${d.user}`,'mention')
        if(cfg.soundsEnabled&&cfg.soundMention) playMention()
    }
    if(isCustom&&animate) showToast(`🌟 ${d.user}: ${d.text?.slice(0,40)}`)
    return div
}
function crearEventoChat(d){
    const bg=nextBg(false)
    const div=document.createElement('div')

    if(d.type==='follow'){
        div.className=`linea-event linea-event-follow ${bg}`
        const s=document.createElement('span');s.className='linea-event-text'
        s.textContent=`👤 ${d.user} te empezó a seguir`;div.appendChild(s)
        return div
    }
    if(d.type==='gift'&&d.plat!=='TW'){
        div.className=`linea-event linea-event-gift ${bg}`
        if(d.giftImg){const img=document.createElement('img');img.src=d.giftImg;img.className='gift-chat-img';img.alt='';img.onerror=()=>img.remove();div.appendChild(img)}
        const s=document.createElement('span');s.className='linea-event-text'
        s.textContent=`${d.user} envió ${d.text}${d.count>1?` x${d.count}`:''}`
        div.appendChild(s);return div
    }

    const mkLabel=(cls,txt)=>{const l=document.createElement('span');l.className=`ev-label ${cls}`;l.textContent=txt;return l}
    const su=esc(d.user),color=getColor(d.user)
    const userSpan=`<span style="color:${color};font-weight:700">${su}</span>`

    if(d.type==='sub'){
        div.className=`linea ev-sub ${bg}`
        div.innerHTML=`${mkLabel('lb-sub','Sub').outerHTML} ${userSpan} se suscribió${d.text?' — '+esc(d.text):''}`
        return div
    }
    if(d.type==='resub'){
        div.className=`linea ev-resub ${bg}`
        const months=d.count>1?` · ${d.count} meses`: ''
        div.innerHTML=`${mkLabel('lb-resub','Resub').outerHTML} ${userSpan}${months}${d.text?' — <em style="color:#666;font-style:italic">'+esc(d.text)+'</em>':''}`
        return div
    }
    if(d.type==='gift'&&d.plat==='TW'){
        div.className=`linea ev-sub ${bg}`
        div.innerHTML=`${mkLabel('lb-gift','Gift').outerHTML} ${userSpan} — ${esc(d.text||'regaló una sub')}`
        return div
    }
    if(d.type==='raid'){
        div.className=`linea ev-raid ${bg}`
        div.innerHTML=`${mkLabel('lb-raid','Raid').outerHTML} ${userSpan} llegó con ${d.count||'?'} viewers 🚀`
        return div
    }
    if(d.type==='cheer'){
        div.className=`linea ev-cheer ${bg}`
        div.innerHTML=`${mkLabel('lb-cheer','Bits').outerHTML} ${userSpan} donó ${d.count||0} bits${d.text?' — '+esc(d.text):''}`
        return div
    }
    if(d.type==='redeem'){
        div.className=`linea ev-redeem ${bg}`
        div.innerHTML=`${mkLabel('lb-redeem','Canje').outerHTML} ${userSpan}${d.text?' — '+esc(d.text):''}`
        return div
    }

    return null
}
function appendMsg(d,animate=true){
    const el=crearMsgChat(d,animate);if(!el)return
    appendAndScroll(el)
    if(animate) speakMsg(d)
}
function appendEvento(d){const el=crearEventoChat(d);if(!el)return; appendAndScroll(el)}

chatDiv.addEventListener('click', async e => {
    const link = e.target.closest('.profile-link')
    if (!link) return
    e.stopPropagation()
    const url = link.dataset.url
    if (e.ctrlKey || e.button === 1) {
        if (url) window.electronAPI.openExternal(url)
        return
    }
    try {
        await window.electronAPI.openPopup({
            user:    link.dataset.user,
            userId:  link.dataset.userid,
            color:   link.dataset.color,
            avatar:  link.dataset.avatar,
            plat:    link.dataset.plat,
            url
        })
    } catch {}
})


function te(tipo){
    const b={follow:{user:'TestFollow'},gift:{user:'DonadorTest',gift:'Rose',count:3},msg:{user:'TestUser',text:'hola esto es una prueba Kappa POGGERS',plat:'TT'},like:{user:'LikeUser',count:50}}
    fetch(`${SERVER}/test/${tipo}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b[tipo])}).catch(console.error)
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

// ── CHAT INPUT ────────────────────────────────────────────────────────────────
const sentHistory = []
let histIdx = -1

function pushSentHistory(text) {
    if (!text) return
    if (sentHistory[0] === text) return
    sentHistory.unshift(text)
    if (sentHistory.length > 50) sentHistory.pop()
    histIdx = -1
}

async function sendChatMsg(){
    const input=document.getElementById('chat-input-field')
    const plat=document.getElementById('chat-plat-sel')?.value||'TW'
    const text=(input.value||'').trim()
    if(!text) return

    pushSentHistory(text);

    if(text.startsWith('/') && plat==='TW'){
        const parts=text.split(' ')
        const cmd=parts[0].toLowerCase()
        const target=parts[1]?.replace('@','')
        const rest=parts.slice(2).join(' ')

        const tmiCommands=['/ban','/unban','/timeout','/untimeout','/mod','/unmod',
            '/vip','/unvip','/clear','/color','/commercial','/emoteonly','/emoteonlyoff',
            '/subscribers','/subscribersoff','/slow','/slowoff','/me','/w','/host','/unhost']

        if(tmiCommands.includes(cmd)){
            input.value=''
            try{
                const r=await fetch(`${SERVER}/api/send-message`,{
                    method:'POST',headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({text,platform:'TW',isCommand:true})
                })
                const d=await r.json()
                if(!d.ok) showToast(`⚠ ${d.error||'Error al ejecutar comando'}`)
                else showToast(`✓ ${cmd}${target?' → '+target:''}`)
            }catch(e){ showToast('⚠ Sin conexión al servidor') }
            return
        }
    }

    if(replyTo){
        const fullText=`@${replyTo.user} ${text}`
        input.value=''
        cancelReply()
        try{
            const r=await fetch(`${SERVER}/api/send-message`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:fullText,platform:plat})})
            const d=await r.json()
            if(!d.ok) showToast(`⚠ ${d.error||'Error al enviar'}`)
        }catch(e){ showToast('⚠ Sin conexión al servidor') }
        return
    }

    input.value=''
    try{
        const r=await fetch(`${SERVER}/api/send-message`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,platform:plat})})
        const d=await r.json()
        if(!d.ok) showToast(`⚠ ${d.error||'Error al enviar'}`)
    }catch(e){ showToast('⚠ Sin conexión al servidor') }
}

document.addEventListener('click',e=>{
    const link=e.target.closest('a.chat-link')
    if(!link)return
    e.preventDefault()
    const url=link.dataset.href
    if(url) window.electronAPI.openExternal(url)
})

function showSkeleton(){
    document.getElementById('skeleton-overlay').classList.add('visible')
}
function hideSkeleton(){
    document.getElementById('skeleton-overlay').classList.remove('visible')
}

async function settingsLoginTwitch(){
    const btn=document.getElementById('s-tw-oauth-btn')
    const lbl=document.getElementById('s-tw-oauth-label')
    const st=document.getElementById('tw-token-status')
    lbl.textContent='Esperando...'
    st.textContent='Abre el navegador para autorizar...';st.style.color='#888'
    btn.style.pointerEvents='none'
    try{
        const result=await window.electronAPI.loginTwitch()
        if(result?.success && result.token){
            let login=''
            try{
                const r=await fetch(`${SERVER}/api/twitch/validate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:result.token})})
                const d=await r.json()
                if(d.ok) login=d.login||''
            }catch{}
            document.getElementById('s-tw-token').value=result.token
            if(login) document.getElementById('s-tw').value=login
            lbl.textContent='✓ Conectado' +(login?' como '+login:'')
            btn.style.background='#1a4a1a';btn.style.border='1px solid #53fc18';btn.style.color='#53fc18'
            st.textContent='';
            document.getElementById('chat-input-bar').classList.add('visible')
            showToast('✓ Twitch conectado' +(login?' como '+login:''))
        } else {
            lbl.textContent='Conectar con Twitch'
            btn.style.cssText=''
            st.textContent=result?.error||'Cancelado';st.style.color='#666'
        }
    }catch(e){
        lbl.textContent='Conectar con Twitch'
        btn.style.cssText=''
        st.textContent='Error: '+e.message;st.style.color='#ff6060'
    }
    btn.style.pointerEvents=''
}

const TWITCH_COMMANDS=[
    {name:'/ban',desc:'Banear usuario: /ban [usuario] [razón]'},
    {name:'/timeout',desc:'Silenciar: /timeout [usuario] [segundos]'},
    {name:'/unban',desc:'Desbanear: /unban [usuario]'},
    {name:'/mod',desc:'Dar mod: /mod [usuario]'},
    {name:'/unmod',desc:'Quitar mod: /unmod [usuario]'},
    {name:'/vip',desc:'Dar VIP: /vip [usuario]'},
    {name:'/unvip',desc:'Quitar VIP: /unvip [usuario]'},
    {name:'/clear',desc:'Limpiar chat'},
    {name:'/slow',desc:'Modo lento: /slow [segundos]'},
    {name:'/slowoff',desc:'Desactivar modo lento'},
    {name:'/subscribers',desc:'Modo solo subs'},
    {name:'/subscribersoff',desc:'Desactivar modo subs'},
    {name:'/emoteonly',desc:'Solo emotes'},
    {name:'/emoteonlyoff',desc:'Desactivar solo emotes'},
    {name:'/color',desc:'Cambiar color de nombre'},
    {name:'/me',desc:'Acción en el chat'},
    {name:'/w',desc:'Susurro: /w [usuario] [mensaje]'},]

let acItems=[], acIndex=-1

const acDiv=document.getElementById('chat-autocomplete')
const chatField=document.getElementById('chat-input-field')

function closeAC(){acDiv.classList.remove('open');acItems=[];acIndex=-1}

function buildAC(q){
    acDiv.innerHTML='';acItems=[];acIndex=-1
    if(!q){closeAC();return}
    const ql=q.toLowerCase()
    let results=[]
    if(q.startsWith('/')){
        results=TWITCH_COMMANDS.filter(c=>c.name.startsWith(ql)).slice(0,8)
        results.forEach((c,i)=>{
            const d=document.createElement('div')
            d.className='ac-item ac-cmd'
            d.innerHTML=`<span class="ac-name">${esc(c.name)}</span><span style="font-size:10px;color:#555;flex:1;margin-left:8px">${esc(c.desc)}</span>`
            d.addEventListener('mousedown',e=>{e.preventDefault();chatField.value=c.name+' ';closeAC();chatField.focus()})
            acDiv.appendChild(d);acItems.push(d)
        })
    } else {
        results=Object.entries(emoteMap).filter(([n])=>n.toLowerCase().startsWith(ql)).slice(0,10)
        results.forEach(([name,e],i)=>{
            const d=document.createElement('div')
            d.className='ac-item'
            d.innerHTML=`<img src="${esc(e.url)}" alt=""><span class="ac-name">${esc(name)}</span><span class="ac-plat">${esc(e.platform||'')}</span>`
            d.addEventListener('mousedown',ev=>{
                ev.preventDefault()
                const val=chatField.value
                const colon=val.lastIndexOf(':')
                chatField.value=(colon>=0?val.slice(0,colon):val)+name+' '
                closeAC();chatField.focus()
            })
            acDiv.appendChild(d);acItems.push(d)
        })
    }
    if(acItems.length) acDiv.classList.add('open')
    else closeAC()
}

function acNavigate(dir){
    if(!acItems.length)return true
    acItems.forEach(i=>i.classList.remove('selected'))
    acIndex=((acIndex+dir)+acItems.length)%acItems.length
    acItems[acIndex].classList.add('selected')
    acItems[acIndex].scrollIntoView({block:'nearest'})
    return false
}

chatField?.addEventListener('input',()=>{
    const val=chatField.value
    if(val.startsWith('/')){
        buildAC(val)
    } else {
        const m=val.match(/:([a-zA-Z0-9_]{2,})$/)
        if(m) buildAC(m[1])
        else closeAC()
    }
})

chatField?.addEventListener('keydown',e=>{
    if(e.key==='Enter'){
        if(acDiv.classList.contains('open')&&acIndex>=0){
            e.preventDefault();acItems[acIndex].dispatchEvent(new MouseEvent('mousedown'));return
        }
        e.preventDefault();sendChatMsg()
    }
    if(e.key==='Tab'&&acDiv.classList.contains('open')){e.preventDefault();acNavigate(1)}
    if(e.key==='ArrowDown'&&acDiv.classList.contains('open')){e.preventDefault();acNavigate(1)}
    if(e.key==='ArrowUp'&&acDiv.classList.contains('open')){e.preventDefault();acNavigate(-1)}
    if(e.key==='Escape'){closeAC()}
    if(!acDiv.classList.contains('open')){
        if(e.key==='ArrowUp'){
            e.preventDefault()
            if(sentHistory.length===0) return
            histIdx = Math.min(histIdx+1, sentHistory.length-1)
            chatField.value = sentHistory[histIdx] || ''
            setTimeout(()=>chatField.setSelectionRange(chatField.value.length,chatField.value.length),0)
        }
        if(e.key==='ArrowDown'){
            e.preventDefault()
            histIdx = Math.max(histIdx-1, -1)
            chatField.value = histIdx < 0 ? '' : (sentHistory[histIdx] || '')
        }
    }
})

document.addEventListener('click',e=>{
    if(!e.target.closest('#chat-input-bar'))closeAC()
})

let replyTo = null

function startReply(user, text, msgId) {
    replyTo = { user, text, msgId }
    document.getElementById('reply-bar').classList.add('open')
    document.getElementById('reply-user').textContent = user
    document.getElementById('reply-text').textContent = text.slice(0,60)+(text.length>60?'…':'')
    document.getElementById('chat-input-field')?.focus()
}

function cancelReply() {
    replyTo = null
    document.getElementById('reply-bar').classList.remove('open')
}

let epOpen = false

function buildEmotePicker() {
    const grid = document.getElementById('ep-grid')
    if(!grid) return
    grid.innerHTML = ''
    Object.entries(emoteMap).slice(0,200).forEach(([name, e]) => {
        const item = document.createElement('div')
        item.className = 'ep-item'
        item.title = name
        item.dataset.name = name
        item.innerHTML = `<img src="${esc(e.url)}" alt="${esc(name)}" loading="lazy">`
        item.addEventListener('click', () => {
            const field = document.getElementById('chat-input-field')
            if(field){ field.value += name+' '; field.focus() }
            toggleEmotePicker()
        })
        grid.appendChild(item)
    })
}

function toggleEmotePicker() {
    const picker = document.getElementById('emote-picker')
    if(!picker) return
    epOpen = !epOpen
    if(epOpen){ picker.classList.add('open'); buildEmotePicker(); document.getElementById('ep-search')?.focus() }
    else picker.classList.remove('open')
}

function filterEmotePicker(q) {
    const ql = q.toLowerCase()
    document.querySelectorAll('#ep-grid .ep-item').forEach(el => {
        el.style.display = el.dataset.name.toLowerCase().includes(ql) ? '' : 'none'
    })
}

document.addEventListener('click', e => {
    if(!e.target.closest('#emote-picker') && !e.target.closest('#emote-picker-btn') && epOpen) toggleEmotePicker()
})

let viewerPollInterval = null

async function pollViewerCount() {
    try {
        const r = await fetch(`${SERVER}/api/viewer-count`)
        const d = await r.json()
        const el = document.getElementById('viewer-count')
        const num = document.getElementById('viewer-num')
        if(d.ok && d.viewers > 0 && el && num) {
            num.textContent = d.viewers.toLocaleString()
            el.style.display = 'flex'
        } else if(el) {
            el.style.display = 'none'
        }
    } catch {}
}
function startViewerPoll() {
    if(viewerPollInterval) clearInterval(viewerPollInterval)
    pollViewerCount()
    viewerPollInterval = setInterval(pollViewerCount, 120000)
}


async function modAction(userId, username, action, duration=300) {
    if(!cfg.twitchToken){ showToast('⚠ Necesitas autenticarte con Twitch'); return }
    let tmiCmd = ''
    if(action === 'ban')     tmiCmd = `/ban ${username}`
    if(action === 'timeout') tmiCmd = `/timeout ${username} ${duration}`
    if(action === 'unban')   tmiCmd = `/unban ${username}`
    if(action === 'mod')     tmiCmd = `/mod ${username}`
    if(action === 'unmod')   tmiCmd = `/unmod ${username}`
    if(action === 'vip')     tmiCmd = `/vip ${username}`
    if(action === 'unvip')   tmiCmd = `/unvip ${username}`
    if(!tmiCmd) return

    try {
        const r = await fetch(`${SERVER}/api/send-message`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ text: tmiCmd, platform:'TW', isCommand:true })
        })
        const d = await r.json()
        if(d.ok){
            showToast(`✓ ${action} → ${username}`)
            const els = document.querySelectorAll(`.linea[data-uid="${CSS.escape(userId)}"]`)
            if(action==='ban'||action==='timeout'){
                if(cfg.showBannedMessages) els.forEach(el=>el.classList.add('banned-msg'))
                else els.forEach(el=>el.remove())
            }
        } else {
            showToast(`⚠ ${d.error||'Error en '+action}`)
        }
    } catch(e) { showToast('⚠ Sin conexión') }
}

async function init(){
    showSkeleton()
    try {
        try{cfg=(await window.electronAPI.getConfig())||{}}catch(e){console.error('Error loading config',e);cfg={}}
        aplicarConfig()
        try { await cargarEmotes(cfg) } catch(e) { console.warn('[Emotes]',e) }
        setupEmoteObserver()
        await checkChangelog()
        startViewerPoll()
    } finally {
        hideSkeleton()
    }
    socket.on('twitch_auth',d=>{
        if(d.ok){
            aplicarConfig()
            showToast(`✓ Twitch: conectado como ${d.login}`)
        }
    })
}
init()
