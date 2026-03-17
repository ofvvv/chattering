// Gestiona la lógica de autenticación para las diferentes plataformas (Twitch, TikTok, etc.).

function handlePlatformAuth() {
    // --- TWITCH --- //
    const twitchLoginBtn = document.getElementById('twitch-login-btn');
    const twitchLogoutBtn = document.getElementById('twitch-logout-btn');
    const twitchStatus = document.getElementById('twitch-status');
    const twitchUserInput = document.getElementById('twitchUser');

    // Estado inicial de la UI de Twitch
    if (cfg.twitchToken && cfg.twitchLogin) {
        twitchLoginBtn.style.display = 'none';
        twitchLogoutBtn.style.display = 'inline-block';
        twitchStatus.textContent = `Conectado como ${cfg.twitchLogin}.`;
        twitchStatus.style.color = '#53fc18'; // Verde éxito
        twitchUserInput.value = cfg.twitchLogin;
    } else {
        twitchLoginBtn.style.display = 'inline-block';
        twitchLogoutBtn.style.display = 'none';
        twitchStatus.textContent = 'No conectado.';
        twitchStatus.style.color = '#888'; // Color neutro
        twitchUserInput.value = cfg.twitchLogin || '';
    }

    // Listener para el botón de Iniciar Sesión con Twitch
    twitchLoginBtn.addEventListener('click', async () => {
        twitchStatus.textContent = 'Esperando autorización en el navegador...';
        twitchStatus.style.color = '#f1c40f'; // Amarillo espera
        twitchLoginBtn.disabled = true;

        try {
            const result = await window.electronAPI.loginTwitch();
            if (result && result.success) {
                // Actualizamos la config local para reflejar el cambio inmediatamente
                cfg.twitchToken = result.token;
                cfg.twitchLogin = result.login;
                // Forzamos la actualización de la UI
                handlePlatformAuth(); 
                // Guardamos la nueva configuración para que persista
                await window.electronAPI.saveSettings(cfg);
            } else {
                twitchStatus.textContent = result.error || 'El inicio de sesión fue cancelado.';
                twitchStatus.style.color = '#e74c3c'; // Rojo error
            }
        } catch (e) {
            window.electronAPI.logError(`[settings-accounts:twitchLogin] ${e.message}`);
            twitchStatus.textContent = 'Error crítico durante el inicio de sesión.';
            twitchStatus.style.color = '#e74c3c'; // Rojo error
        }
        twitchLoginBtn.disabled = false;
    });

    // Listener para el botón de Cerrar Sesión de Twitch
    twitchLogoutBtn.addEventListener('click', async () => {
        if (confirm('¿Seguro que quieres desconectar tu cuenta de Twitch?')) {
            cfg.twitchToken = null;
            cfg.twitchLogin = null;
            
            try {
                // Guardar la configuración actualizada para que el cierre de sesión persista
                await window.electronAPI.saveSettings(cfg);
                // Actualizar la UI para reflejar el estado desconectado
                handlePlatformAuth();
            } catch (e) {
                window.electronAPI.logError(`[settings-accounts:twitchLogout] ${e.message}`);
                alert('Hubo un error al intentar guardar la desconexión.');
            }
        }
    });

    // Aquí se puede añadir la lógica para otras plataformas (ej. TikTok, YouTube)
    // siguiendo un patrón similar.
}
