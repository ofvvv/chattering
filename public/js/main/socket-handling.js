
const socket=io(SERVER,{reconnectionDelay:2000,reconnectionAttempts:20})

socket.on('connect',()=>console.log('[Socket] Conectado'))
socket.on('connect_error',e=>console.warn('[Socket] Error:',e.message))

socket.on('history',msgs=>{
    chatDiv.innerHTML='';msgLineCounter=0
    msgs.forEach(d=>{if(d.type==='msg')appendMsg(d,false)})
})
socket.on('dock_history',events=>{
    events.forEach(d=>{
        if(d.type==='follow') addToDock('follow',d.user||d.username,' te empezó a seguir',null,true)
        else if(d.type==='gift') addToDock('gift',d.user||d.username,` envió ${d.text}`,null,true)
    })
})
socket.on('likes_init',()=>{
    // Esta función podría usarse para inicializar o limpiar el estado de los likes si fuera necesario
})
socket.on('msg',d=>appendMsg(d,true))
socket.on('status',isLive=>{
    const live=isLive.TT||isLive.YT||isLive.TW
    const s=document.getElementById('status-text')
    s.textContent=live?'LIVE':'NOT LIVE';s.classList.toggle('text-live',live)
    
    if(live) pollViewerCount()
})
socket.on('platform_states', states => {
    Object.keys(states).forEach(plat => {
        updatePlatformIcon(plat, states[plat])
    })
})
socket.on('platform_state', ({ plat, state }) => {
    updatePlatformIcon(plat, state)
})

function updatePlatformIcon(plat, state) {
    const icon = document.querySelector(`.plat-status-icon[data-plat="${plat}"]`)
    if (!icon) return
    icon.classList.remove('state-loading', 'state-error', 'state-connected', 'state-disconnected')
    icon.classList.add(`state-${state}`)
    const titles = {
        loading: 'Conectando...',
        connected: 'Conectado',
        error: 'Error de conexión',
        disconnected: 'Desconectado'
    }
    const platNames = { TT: 'TikTok', YT: 'YouTube', TW: 'Twitch' }
    icon.title = `${platNames[plat]}: ${titles[state] || state}`
}

socket.on('evento',d=>{
    if(d.type==='like'){updateLikeRow(d.user,d.userId,d.count||1)}
    else if(d.type==='follow'){
        addToDock('follow',d.user,' te empezó a seguir',null)
        appendEvento(d)
        showToast(`👤 ${d.user} te siguió`,'follow')
        if(cfg.soundsEnabled&&cfg.soundFollow) playFollow()
    }
    else if(d.type==='gift'&&d.plat!=='TW'){
        addToDock('gift',d.user,` envió ${d.text}`,d.giftImg??null)
        appendEvento(d)
        showToast(`🎁 ${d.user} envió ${d.text} x${d.count??1}`,'gift')
        if(cfg.soundsEnabled&&cfg.soundGift) playGift()
    }
    else if(d.type==='sub'||d.type==='resub'||(d.type==='gift'&&d.plat==='TW')){
        appendEvento(d)
        addToDock('gift',d.user,` ${d.type==='resub'?'resub':'se suscribió'}`,null)
        showToast(`⭐ ${d.user} ${d.type==='resub'?'resub':'sub'}${d.count>1?` x${d.count}`:''}`)
        if(cfg.soundsEnabled&&cfg.soundGift) playGift()
    }
    else if(d.type==='raid'){
        appendEvento(d)
        showToast(`🚀 Raid de ${d.user} con ${d.count||'?'} viewers`)
    }
    else if(d.type==='cheer'){
        appendEvento(d)
        showToast(`💎 ${d.user} donó ${d.count||0} bits`)
    }
    else if(d.type==='redeem'){
        appendEvento(d)
    }
})
