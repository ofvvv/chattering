
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

function te(tipo){
    const b={follow:{user:'TestFollow'},gift:{user:'DonadorTest',gift:'Rose',count:3},msg:{user:'TestUser',text:'hola esto es una prueba Kappa POGGERS',plat:'TT'},like:{user:'LikeUser',count:50}}
    fetch(`${SERVER}/test/${tipo}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b[tipo])}).catch(console.error)
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