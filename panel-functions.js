// ── MULTIPLE PANELS SYSTEM ───────────────────────────────────────────────────
const panelFilters = new Map()
panelFilters.set(1, new Set())
let nextPanelId = 2

function togglePanelFilters(panelId) {
    const filtersDiv = document.querySelector(`.panel-filters[data-panel-id="${panelId}"]`)
    if (!filtersDiv) return
    filtersDiv.classList.toggle('open')
}

function togglePanelFilter(panelId, filterType) {
    if (!panelFilters.has(panelId)) panelFilters.set(panelId, new Set())
    const filters = panelFilters.get(panelId)
    
    if (filters.has(filterType)) filters.delete(filterType)
    else filters.add(filterType)
    
    const btn = document.querySelector(`.panel-filters[data-panel-id="${panelId}"] .pfchip[data-filter="${filterType}"]`)
    if (btn) btn.classList.toggle('active', filters.has(filterType))
    
    refreshPanelMessages(panelId)
}

function clearPanelFilters(panelId) {
    panelFilters.set(panelId, new Set())
    document.querySelectorAll(`.panel-filters[data-panel-id="${panelId}"] .pfchip[data-filter]`).forEach(btn => {
        btn.classList.remove('active')
    })
    refreshPanelMessages(panelId)
}

function panelAllowsMsg(panelId, msgData) {
    const filters = panelFilters.get(panelId)
    if (!filters || filters.size === 0) return true
    
    if (filters.has('subs') && !msgData.badges?.sub) return false
    if (filters.has('mods') && !msgData.badges?.mod) return false
    if (filters.has('bots') && KNOWN_BOTS.includes((msgData.user||'').toLowerCase())) return false
    if (filters.has('first') && !msgData.isFirst) return false
    
    const platFilters = ['TT','YT','TW','KK'].filter(p => filters.has(p))
    if (platFilters.length && !platFilters.includes(msgData.plat)) return false
    
    return true
}

function refreshPanelMessages(panelId) {
    const panelChat = document.querySelector(`.panel-chat[data-panel-id="${panelId}"]`)
    if (!panelChat) return
    
    Array.from(panelChat.children).forEach(msgEl => {
        if (msgEl._msgData) {
            const shouldShow = panelAllowsMsg(panelId, msgEl._msgData)
            msgEl.style.display = shouldShow ? '' : 'none'
        }
    })
}

function addNewPanel() {
    const panelId = nextPanelId++
    const container = document.getElementById('panels-container')
    
    const panel = document.createElement('div')
    panel.className = 'chat-panel'
    panel.dataset.panelId = panelId
    
    panel.innerHTML = `
        <div class="panel-header">
            <span class="panel-title">Panel ${panelId}</span>
            <div class="panel-controls">
                <button class="panel-btn" onclick="togglePanelFilters(${panelId})" title="Filtros del panel">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="10" height="10">
                        <line x1="2" y1="4" x2="14" y2="4"/><line x1="4" y1="8" x2="12" y2="8"/><line x1="6" y1="12" x2="10" y2="12"/>
                    </svg>
                </button>
                <button class="panel-btn" onclick="removePanel(${panelId})" title="Cerrar panel">✕</button>
            </div>
        </div>
        <div class="panel-filters" data-panel-id="${panelId}">
            <button class="pfchip" data-filter="subs" onclick="togglePanelFilter(${panelId}, 'subs')">⭐ Subs</button>
            <button class="pfchip" data-filter="mods" onclick="togglePanelFilter(${panelId}, 'mods')">🛡 Mods</button>
            <button class="pfchip" data-filter="bots" onclick="togglePanelFilter(${panelId}, 'bots')">🤖 Sin bots</button>
            <button class="pfchip" data-filter="first" onclick="togglePanelFilter(${panelId}, 'first')">🌟 First</button>
            <div style="width:1px;background:#1e1e24;margin:0 2px;align-self:stretch"></div>
            <button class="pfchip" data-filter="TT" onclick="togglePanelFilter(${panelId}, 'TT')">TT</button>
            <button class="pfchip" data-filter="YT" onclick="togglePanelFilter(${panelId}, 'YT')">YT</button>
            <button class="pfchip" data-filter="TW" onclick="togglePanelFilter(${panelId}, 'TW')">TW</button>
            <button class="pfchip" data-filter="KK" onclick="togglePanelFilter(${panelId}, 'KK')">KK</button>
            <button class="pfchip" onclick="clearPanelFilters(${panelId})" style="color:#666;margin-left:auto">✕</button>
        </div>
        <div class="panel-chat-wrap">
            <div class="panel-chat" data-panel-id="${panelId}"></div>
            <div class="scroll-paused">▼ nuevos mensajes</div>
        </div>
    `
    
    container.appendChild(panel)
    panelFilters.set(panelId, new Set())
    
    const newPanelChat = panel.querySelector('.panel-chat')
    setupPanelScroll(newPanelChat)
    
    const panel1Chat = document.querySelector('.panel-chat[data-panel-id="1"]')
    if (panel1Chat) {
        Array.from(panel1Chat.children).forEach(msgEl => {
            if (msgEl._msgData) {
                const clone = msgEl.cloneNode(true)
                clone._msgData = msgEl._msgData
                newPanelChat.appendChild(clone)
            }
        })
    }
    
    showToast(`✓ Panel ${panelId} añadido`)
}

function removePanel(panelId) {
    if (panelId === 1) {
        showToast('⚠ No puedes cerrar el panel principal')
        return
    }
    
    const panel = document.querySelector(`.chat-panel[data-panel-id="${panelId}"]`)
    if (panel) {
        panel.remove()
        panelFilters.delete(panelId)
        showToast(`✓ Panel ${panelId} cerrado`)
    }
}
