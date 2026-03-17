'use strict'

// ── DOCK ──────────────────────────────────────────────────────────────────────
const dockScroll=document.getElementById('dock-scroll')
const dockInner=document.getElementById('dock-inner')

let dockAutoScrollTimer = null
let dockUserInteracted = false

function scheduleDockAutoScroll() {
    if(!dockScroll) return
    if (dockAutoScrollTimer) clearTimeout(dockAutoScrollTimer)
    dockAutoScrollTimer = setTimeout(() => {
        if (!dockUserInteracted) {
            dockScroll.scrollTop = dockScroll.scrollHeight
        }
        dockUserInteracted = false
    }, 10000)
}

if(dockScroll){
    dockScroll.addEventListener('scroll', () => {
        dockUserInteracted = true
        scheduleDockAutoScroll()
    })
    
    dockScroll.addEventListener('wheel', () => {
        dockUserInteracted = true
    })
}

function addToDock(type,user,actionText,giftImgUrl,noAnim=false){
    if(!dockInner || !dockScroll) return
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
    if(!dockInner || !dockScroll) return
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
