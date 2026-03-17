'use strict'

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

        if(TWITCH_COMMANDS.some(c => c.name === cmd)){
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

function closeAC(){ if(acDiv) acDiv.classList.remove('open'); acItems=[]; acIndex=-1 }

function buildAC(q){
    if(!acDiv) return;
    acDiv.innerHTML='';acItems=[];acIndex=-1
    if(!q){closeAC();return}
    const ql=q.toLowerCase()
    let results=[]
    if(q.startsWith('/')){
        results=TWITCH_COMMANDS.filter(c=>c.name.startsWith(ql)).slice(0,8)
        results.forEach((c,i)=>{
            const d=document.createElement('div')
            d.className='ac-item ac-cmd'
            d.innerHTML=`<span class="ac-name">${esc(c.name)}</span><span class="ac-desc">${esc(c.desc)}</span>`
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
                const lastColon=val.lastIndexOf(':')
                chatField.value=(lastColon>=0?val.slice(0,lastColon):val)+name+' '
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

if(chatField){
    chatField.addEventListener('input',()=>{
        const val=chatField.value
        if(val.startsWith('/')){
            buildAC(val)
        } else {
            const m=val.match(/:([a-zA-Z0-9_]{2,})$/)
            if(m) buildAC(m[1])
            else closeAC()
        }
    })
    
    chatField.addEventListener('keydown',e=>{
        if(acDiv && acDiv.classList.contains('open')){
            if(e.key==='Enter'){ e.preventDefault(); if(acIndex>=0) acItems[acIndex].dispatchEvent(new MouseEvent('mousedown')); return }
            if(e.key==='Tab'){ e.preventDefault(); acNavigate(1) }
            if(e.key==='ArrowDown'){ e.preventDefault(); acNavigate(1) }
            if(e.key==='ArrowUp'){ e.preventDefault(); acNavigate(-1) }
            if(e.key==='Escape'){ closeAC() }
        } else {
            if(e.key==='Enter'){ e.preventDefault();sendChatMsg() }
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
}

document.addEventListener('click',e=>{
    if(acDiv && !e.target.closest('#chat-input-bar'))closeAC()
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
            if(chatField){ chatField.value += name+' '; chatField.focus() }
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
    const picker = document.getElementById('emote-picker')
    if(picker && epOpen && !e.target.closest('#emote-picker') && !e.target.closest('#emote-picker-btn')){
        toggleEmotePicker()
    }
})