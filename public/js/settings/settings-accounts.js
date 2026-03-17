function initAccountListeners() {
    // Botones de login
    document.getElementById('btn-tt-login').addEventListener('click', loginTiktokSeamless);
    document.getElementById('s-tw-oauth-btn').addEventListener('click', settingsLoginTwitch);

    // Listener para el resultado de la autenticación de Twitch
    socket.on('twitch_auth', (data) => {
        handleTwitchAuthResult(data);
    });
}

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
                
                // Guardamos automáticamente para una mejor UX
                await guardar(); 
                
                btn.style.background = '#1a4a1a';
                btn.style.color = '#53fc18';
                document.getElementById('tt-btn-label').textContent = '✓ TikTok Vinculado';
                status.textContent = 'Sesión guardada correctamente.';
                status.style.color = '#53fc18';
            } else {
                status.textContent = "⚠️ Sesión capturada. Por favor, escribe tu usuario y guarda los cambios.";
                status.style.color = "#ffcc00";
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
    btn.disabled = true;
    try {
        await window.electronAPI.loginTwitch();
    } catch (e) { 
        console.error(e); 
        lbl.textContent = 'Error al iniciar login';
        btn.disabled = false;
    }
}

function handleTwitchAuthResult(data) {
    const btn = document.getElementById('s-tw-oauth-btn');
    const lbl = document.getElementById('s-tw-oauth-label');
    const status = document.getElementById('s-tw-status');

    if (data.ok && data.token && data.user) {
        document.getElementById('s-tw').value = data.user;
        document.getElementById('s-tw-token').value = data.token;
        
        lbl.textContent = `✓ Conectado como ${data.user}`;
        btn.className = 'btn btn-twitch connected';
        status.textContent = '¡Conexión exitosa! Guardando automáticamente...';
        status.style.color = '#53fc18';
        
        // Guardar automáticamente la configuración tras un login exitoso
        guardar();

    } else {
        lbl.textContent = 'Error de conexión';
        btn.className = 'btn btn-twitch';
        status.textContent = data.error || 'No se pudo verificar la cuenta. Intenta de nuevo.';
        status.style.color = '#ff6060';
    }
}
