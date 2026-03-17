'use strict'

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

function initDockResize(){
    const handle=document.getElementById('dock-resize-handle');
    const dock=document.getElementById('top-dock');
    if (!handle || !dock) return;

    let dragging=false,startY=0,startH=0

    const onMouseDown = e => {
        dragging=true;
        startY=e.clientY;
        startH=dock.offsetHeight;
        document.body.style.cursor='ns-resize';
        e.preventDefault();
    };

    const onMouseMove = e => {
        if(!dragging) return;
        const isBottom=document.getElementById('main-layout').classList.contains('dock-bottom');
        const delta=isBottom?startY-e.clientY:e.clientY-startY;
        setDockHeight(Math.max(40,Math.min(240,startH+delta)));
    };

    const onMouseUp = () => {
        dragging=false;
        document.body.style.cursor='';
    };

    handle.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

initDockResize();
