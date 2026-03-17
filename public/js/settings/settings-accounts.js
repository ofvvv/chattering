async function loginTiktokSeamless() {
    const btn = document.getElementById('btn-tt-login');
    const status = document.getElementById('tt-status-msg');
    const ttInput = document.getElementById('s-tt');

    btn.disabled = true;
    status.textContent = "Abriendo ventana segura...";
    
    try {
        const res = await window.electronAPI.loginTiktok();
        if (res.success && res.sessionId) {
            cfg.tiktokSessionId = res.sessionId; // Guardar en memoria para que guardar() lo tome
            const user = res.username;
            
            if(user) {
                cfg.tiktokUser = user;
                ttInput.value = user;
                await window.electronAPI.saveSettings(cfg); 
                
                btn.style.background = '#1a4a1a';
                btn.style.color = '#53fc18';
                document.getElementById('tt-btn-label').textContent = '✓ TikTok Vinculado';
                status.textContent = 'Sesión guardada correctamente.';
                status.style.color = '#53fc18';
            } else {
                status.textContent = "⚠️ Sesión capturada. Por favor, escribe tu usuario en la caja de arriba y guarda los cambios.";
                status.style.color = "#ffcc00";
                ttInput.removeAttribute('readonly');
                ttInput.focus();
            }
        } else {
            status.textContent = "Error: " + (res.error || "Desconocido");
            status.style.color = "#ff6060";
        }
    } catch (e) {
        status.textContent = "Error interno: " + e.message;
        status.style.color = "#ff6060";
    }
    btn.disabled = false;
}

async function settingsLoginTwitch() {
    const btn = document.getElementById('s-tw-oauth-btn');
    const lbl = document.getElementById('s-tw-oauth-label');
    lbl.textContent = 'Esperando conexión...';
    try {
        const result = await window.electronAPI.loginTwitch();
        if (result?.polling) {
            const poll = setInterval(async () => {
                const r = await fetch(`${SERVER}/api/twitch/auth-status`);
                const d = await r.json();
                if (d.token) {
                    clearInterval(poll);
                    document.getElementById('s-tw-token').value = d.token;
                    document.getElementById('s-tw').value = d.login;
                    lbl.textContent = '✓ Conectado: ' + d.login;
                    btn.classList.add('connected');
                }
            }, 1000);
        }
    } catch (e) { console.error(e); }
}
