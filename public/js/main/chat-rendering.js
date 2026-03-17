'use strict'

// ── CHAT ──────────────────────────────────────────────────────────────────────
const chatDiv = document.getElementById('chat');
const pausedBadge = document.getElementById('scroll-paused');

const isAtBottom = () => {
    if(!chatDiv) return true;
    return chatDiv.scrollHeight - chatDiv.scrollTop - chatDiv.clientHeight < 60;
}

function updatePauseBadge() {
    if(!pausedBadge) return;
    if (!isAtBottom()) {
        pausedBadge.classList.add('visible');
    } else {
        pausedBadge.classList.remove('visible');
    }
}

if(chatDiv){
    chatDiv.addEventListener('scroll', () => {
        if (isAtBottom()) {
            pausedBadge.classList.remove('visible');
        }
    }, { passive: true });
}

if(pausedBadge){
    pausedBadge.addEventListener('click', () => {
        if(!chatDiv) return;
        chatDiv.scrollTop = chatDiv.scrollHeight;
        pausedBadge.classList.remove('visible');
    });
}

if(chatDiv){
    chatDiv.addEventListener('click', async e => {
        const link = e.target.closest('.profile-link')
        if (!link) return
        e.stopPropagation()
        if (e.ctrlKey || e.button === 1) {
            if (link.dataset.url) window.electronAPI.openExternal(link.dataset.url)
            return
        }
        showUserContextMenu(link.dataset.user, link.dataset.userid, link.dataset.plat, e)
    });
}

function appendAndScroll(element) {
    if(!chatDiv) return;
    const shouldScroll = isAtBottom();
    chatDiv.appendChild(element);
    if (chatDiv.childElementCount > MAX_CHAT_NODES) {
        chatDiv.firstChild.remove();
    }
    if (shouldScroll) {
        chatDiv.scrollTop = chatDiv.scrollHeight;
    } else {
        if(pausedBadge) pausedBadge.classList.add('visible');
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
    closeAllCtxMenus()
}

function startReply(user, text, msgId) {
    replyTo = { user, text, msgId }
    document.getElementById('reply-bar').classList.add('open')
    document.getElementById('reply-user').textContent = user
    document.getElementById('reply-text').textContent = text.slice(0,60)+(text.length>60?'…':'')
    const chatInputField = document.getElementById('chat-input-field')
    if(chatInputField) chatInputField.focus()
    closeAllCtxMenus()
}

function cancelReply() {
    replyTo = null
    document.getElementById('reply-bar').classList.remove('open')
}
