
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
        closeAllCtxMenus()
        if(document.getElementById('filter-bar')?.classList.contains('open')){document.getElementById('filter-bar').classList.remove('open');return}
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