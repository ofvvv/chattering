function showToast(msg,type=''){
    try {
        const t=document.getElementById('toast')
        if(!t) return;
        t.textContent=msg; t.className=`show${type?' toast-'+type:''}`;
        clearTimeout(t._t); t._t=setTimeout(()=>t.className='',3000);
    } catch (e) {
        const errorMessage = `ERROR IN showToast: ${e.message}\n${e.stack}`;
        if (window.electronAPI && typeof window.electronAPI.logError === 'function') window.electronAPI.logError(errorMessage);
        else console.error('Fallback: ', errorMessage);
    }
}

// ── CHANGELOG ─────────────────────────────────────────────────────────────────
async function checkChangelog() {
    try {
        const version = await window.electronAPI.getVersion()
        const lastSeen = await window.electronAPI.getLastSeenVersion()
        document.getElementById('changelog-version').textContent=`Chattering v${version}`
        if(lastSeen !== version) {
            document.getElementById('changelog-overlay').classList.add('open')
        }
    } catch (e) {
        const errorMessage = `ERROR IN checkChangelog: ${e.message}\n${e.stack}`;
        if (window.electronAPI && typeof window.electronAPI.logError === 'function') window.electronAPI.logError(errorMessage);
        else console.error('Fallback: ', errorMessage);
    }
}
async function closeChangelog() {
    try {
        document.getElementById('changelog-overlay').classList.remove('open')
        const version = await window.electronAPI.getVersion()
        await window.electronAPI.setLastSeenVersion(version)
    } catch (e) {
        const errorMessage = `ERROR IN closeChangelog: ${e.message}\n${e.stack}`;
        if (window.electronAPI && typeof window.electronAPI.logError === 'function') window.electronAPI.logError(errorMessage);
        else console.error('Fallback: ', errorMessage);
    }
}

// ── FILTER CHIPS (multi-select) ──────────────────────────────────────────────
const activeFilters = new Set()

function toggleFilterBar() {
    const bar = document.getElementById('filter-bar')
    bar.classList.toggle('open')
}
function toggleFilter(type) {
    if(activeFilters.has(type)) activeFilters.delete(type)
    else activeFilters.add(type)
    document.getElementById('fc-'+type)?.classList.toggle('active', activeFilters.has(type))
    updateFilterButton()
}
function clearFilters() {
    activeFilters.clear()
    document.querySelectorAll('.fchip').forEach(c=>c.classList.remove('active'))
    updateFilterButton()
}
function updateFilterButton() {
    document.getElementById('btn-filter')?.classList.toggle('has-filters', activeFilters.size > 0)
}
function syncFilterChips() {
    document.querySelectorAll('.fchip').forEach(c=>c.classList.remove('active'))
    activeFilters.forEach(f=>document.getElementById('fc-'+f)?.classList.add('active'))
    updateFilterButton()
}
function chipAllowsMsg(d) {
    if(activeFilters.size === 0) return true;

    if(activeFilters.has('bots') && KNOWN_BOTS.includes((d.user||'').toLowerCase())) return false;

    const platFilters = ['TT','YT','TW'].filter(p => activeFilters.has(p));
    if(platFilters.length > 0 && !platFilters.includes(d.plat)) return false;

    const roleFilters = ['subs', 'mods', 'first'].filter(r => activeFilters.has(r));
    if(roleFilters.length > 0) {
        let hasRole = false;
        if(activeFilters.has('subs') && d.badges?.sub) hasRole = true;
        if(activeFilters.has('mods') && d.badges?.mod) hasRole = true;
        if(activeFilters.has('first') && d.isFirst) hasRole = true;
        
        if(!hasRole) return false;
    }

    return true;
}

// ── EMOTE TOOLTIP + CONTEXT MENU ─────────────────────────────────────────────
const etTip=document.getElementById('emote-tooltip')
const etImg=document.getElementById('et-img'),etName=document.getElementById('et-name'),etPlat=document.getElementById('et-platform')
let etTimer=null, currentCtxEmote=null

document.addEventListener('mouseover',e=>{
    try {
        const img=e.target.closest('img.emote')
        if(!img){clearTimeout(etTimer);etTip.classList.remove('visible');return}
        clearTimeout(etTimer)
        etTimer=setTimeout(()=>{
            etImg.src=img.dataset.url||img.src
            etName.textContent=img.dataset.emote||img.alt
            etPlat.textContent=img.dataset.platform||''
            const r=img.getBoundingClientRect()
            etTip.style.left=Math.min(r.left+r.width/2-40,window.innerWidth-130)+'px'
            etTip.style.top=(r.top-90)+'px'
            etTip.classList.add('visible')
        },400)
    } catch (e) {
        const errorMessage = `ERROR IN emote mouseover: ${e.message}\n${e.stack}`;
        if (window.electronAPI && typeof window.electronAPI.logError === 'function') window.electronAPI.logError(errorMessage);
        else console.error('Fallback: ', errorMessage);
    }
})
document.addEventListener('mouseout',e=>{
    if(!e.target.closest('img.emote')){clearTimeout(etTimer);etTip.classList.remove('visible')}
})

const emoteCtx=document.getElementById('emote-ctx')
document.addEventListener('contextmenu',e=>{
    try {
        const img=e.target.closest('img.emote')
        if(!img)return
        e.preventDefault()
        currentCtxEmote={name:img.dataset.emote||img.alt,url:img.dataset.url||img.src,platform:img.dataset.platform}
        document.getElementById('ctx-emote-name').textContent=currentCtxEmote.name
        emoteCtx.style.left=Math.min(e.clientX,window.innerWidth-170)+'px'
        emoteCtx.style.top=Math.min(e.clientY,window.innerHeight-150)+'px'
        emoteCtx.classList.add('open')
    } catch (e) {
        const errorMessage = `ERROR IN emote contextmenu: ${e.message}\n${e.stack}`;
        if (window.electronAPI && typeof window.electronAPI.logError === 'function') window.electronAPI.logError(errorMessage);
        else console.error('Fallback: ', errorMessage);
    }
})
document.addEventListener('click',e=>{if(!e.target.closest('#emote-ctx'))closeEmoteCtx()})

function closeEmoteCtx(){
    try { emoteCtx.classList.remove('open') }
    catch (e) {
        const errorMessage = `ERROR IN closeEmoteCtx: ${e.message}\n${e.stack}`;
        if (window.electronAPI && typeof window.electronAPI.logError === 'function') window.electronAPI.logError(errorMessage);
        else console.error('Fallback: ', errorMessage);
    }
}
function ctxCopyName(){
    try {
        if(currentCtxEmote)navigator.clipboard.writeText(currentCtxEmote.name);closeEmoteCtx();showToast('📋 Nombre copiado')
    } catch (e) {
        const errorMessage = `ERROR IN ctxCopyName: ${e.message}\n${e.stack}`;
        if (window.electronAPI && typeof window.electronAPI.logError === 'function') window.electronAPI.logError(errorMessage);
        else console.error('Fallback: ', errorMessage);
    }
}
function ctxCopyUrl(){
    try {
        if(currentCtxEmote)navigator.clipboard.writeText(currentCtxEmote.url);closeEmoteCtx();showToast('🔗 Link copiado')
    } catch (e) {
        const errorMessage = `ERROR IN ctxCopyUrl: ${e.message}\n${e.stack}`;
        if (window.electronAPI && typeof window.electronAPI.logError === 'function') window.electronAPI.logError(errorMessage);
        else console.error('Fallback: ', errorMessage);
    }
}
function ctxDownload(){
    try {
        if(!currentCtxEmote)return
        const a=document.createElement('a');a.href=currentCtxEmote.url;a.download=currentCtxEmote.name;a.target='_blank';a.click()
        closeEmoteCtx()
    } catch (e) {
        const errorMessage = `ERROR IN ctxDownload: ${e.message}\n${e.stack}`;
        if (window.electronAPI && typeof window.electronAPI.logError === 'function') window.electronAPI.logError(errorMessage);
        else console.error('Fallback: ', errorMessage);
    }
}

// ── LINK PREVIEW ─────────────────────────────────────────────────────────────
const lpDiv=document.getElementById('link-preview')
const lpTitle=document.getElementById('lp-title'),lpDesc=document.getElementById('lp-desc')
const lpImg=document.getElementById('lp-img'),lpDomain=document.getElementById('lp-domain')
let lpTimer=null, lpCache={}

document.addEventListener('mouseover',e=>{
    const link=e.target.closest('a.chat-link')
    if(!link||cfg.linkPreviews===false){lpDiv.classList.remove('visible');return}
    const url=link.dataset.href
    if(!url)return
    clearTimeout(lpTimer)
    lpTimer=setTimeout(async()=>{
        if(lpCache[url]){showPreview(lpCache[url],link);return}
        try{
            const r=await fetch(`${SERVER}/api/preview_html?url=${encodeURIComponent(url)}`)
            const d=await r.json()
            lpCache[url]=d
            showPreview(d,link)
        }catch{}
    },600)
})
document.addEventListener('mouseout',e=>{
    if(!e.target.closest('a.chat-link')){clearTimeout(lpTimer);lpDiv.classList.remove('visible')}
})
function showPreview(d,el){
    try {
        if(!d||d.error||((!d.title)&&(!d.description)&&(!d.image))){return}
        lpTitle.textContent=d.title||''
        lpDesc.textContent=d.description||''
        if(d.image){lpImg.src=d.image;lpImg.style.display='block';lpImg.onerror=()=>img.style.display='none'}else{lpImg.style.display='none'}
        try{lpDomain.textContent=new URL(d.url||el.dataset.href||'').hostname}catch{lpDomain.textContent=el.dataset.href||''}
        lpDiv.style.opacity='0';lpDiv.style.left='-999px';lpDiv.style.top='-999px';lpDiv.classList.add('visible')
        requestAnimationFrame(()=>{
            const r=el.getBoundingClientRect(),h=lpDiv.offsetHeight||120
            const top=r.top>h+10?r.top-h-6:r.bottom+6
            lpDiv.style.left=Math.max(4,Math.min(r.left,window.innerWidth-294))+'px'
            lpDiv.style.top=top+'px'
            lpDiv.style.opacity=''
        })
    } catch (e) {
        const errorMessage = `ERROR IN showPreview: ${e.message}\n${e.stack}`;
        if (window.electronAPI && typeof window.electronAPI.logError === 'function') window.electronAPI.logError(errorMessage);
        else console.error('Fallback: ', errorMessage);
    }
}


// ── SEARCH ────────────────────────────────────────────────────────────────────
let searchActive=false, searchResults=[], searchIndex=0

function openSearch() {
    searchActive=true
    document.getElementById('search-bar').classList.add('open')
    document.getElementById('search-input').focus()
}
function closeSearch() {
    searchActive=false
    document.getElementById('search-bar').classList.remove('open')
    document.getElementById('search-input').value=''
    clearSearchHighlights()
    document.getElementById('search-count').textContent=''
}
function clearSearchHighlights() {
    document.querySelectorAll('.search-match,.search-match-current').forEach(el=>{
        el.classList.remove('search-match','search-match-current')
    })
    searchResults=[]
}
function runSearch(query) {
    try {
        clearSearchHighlights()
        if(!query.trim()){document.getElementById('search-count').textContent='';return}
        const q=query.trim().toLowerCase()
        let userFilter=null, typeFilter=null, text=q
        const fromM=q.match(/from:(\S+)/)
        if(fromM){userFilter=fromM[1];text=text.replace(fromM[0],'').trim()}
        const isM=q.match(/is:(\S+)/)
        if(isM){typeFilter=isM[1];text=text.replace(isM[0],'').trim()}

        const lines=[...document.querySelectorAll('#chat .linea')]
        lines.forEach(line=>{
            let match=true
            const lineUser=(line.querySelector('.user')?.textContent||'').toLowerCase()
            const lineText=(line.querySelector('.text')?.textContent||'').toLowerCase()
            const isSub=line.dataset.sub==='true'
            const isMod=line.dataset.mod==='true'
            if(userFilter&&!lineUser.includes(userFilter)) match=false
            if(typeFilter==='sub'&&!isSub) match=false
            if(typeFilter==='mod'&&!isMod) match=false
            if(text&&!lineText.includes(text)&&!lineUser.includes(text)) match=false
            if(match){line.classList.add('search-match');searchResults.push(line)}
        })
        searchIndex=0
        if(searchResults.length){
            searchResults[0].classList.add('search-match-current')
            searchResults[0].scrollIntoView({block:'nearest'})
        }
        document.getElementById('search-count').textContent=searchResults.length?`${searchIndex+1}/${searchResults.length}`:'0 resultados'
    } catch (e) {
        const errorMessage = `ERROR IN runSearch: ${e.message}\n${e.stack}`;
        if (window.electronAPI && typeof window.electronAPI.logError === 'function') window.electronAPI.logError(errorMessage);
        else console.error('Fallback: ', errorMessage);
    }
}
function searchNext() {
    try {
        if(!searchResults.length)return
        searchResults[searchIndex].classList.remove('search-match-current')
        searchIndex=(searchIndex+1)%searchResults.length
        searchResults[searchIndex].classList.add('search-match-current')
        searchResults[searchIndex].scrollIntoView({block:'nearest'})
        document.getElementById('search-count').textContent=`${searchIndex+1}/${searchResults.length}`
    } catch (e) {
        const errorMessage = `ERROR IN searchNext: ${e.message}\n${e.stack}`;
        if (window.electronAPI && typeof window.electronAPI.logError === 'function') window.electronAPI.logError(errorMessage);
        else console.error('Fallback: ', errorMessage);
    }
}
