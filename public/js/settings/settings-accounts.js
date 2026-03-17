function handlePlatformAuth() {
    try {
        // Twitch
        const twitchLoginBtn = document.getElementById('twitch-login-btn');
        const twitchLogoutBtn = document.getElementById('twitch-logout-btn');
        const twitchStatus = document.getElementById('twitch-status');

        if (cfg.twitchToken) {
            twitchLoginBtn.style.display = 'none';
            twitchLogoutBtn.style.display = 'block';
            twitchStatus.textContent = `Conectado como ${cfg.twitchLogin || 'desconocido'}`;
        } else {
            twitchLoginBtn.style.display = 'block';
            twitchLogoutBtn.style.display = 'none';
            twitchStatus.textContent = 'No conectado';
        }

        twitchLoginBtn.addEventListener('click', async () => {
            try {
                await window.electronAPI.loginTwitch();
            } catch (e) {
                window.electronAPI.logError(`[settings-twitchLogin] ${e.message}`);
                alert('Error al intentar iniciar sesión con Twitch.');
            }
        });

        twitchLogoutBtn.addEventListener('click', () => {
            try {
                // Lógica para limpiar el token de Twitch
                cfg.twitchToken = null;
                cfg.twitchLogin = null;
                handlePlatformAuth(); // Recargar el estado de la UI
            } catch (e) {
                window.electronAPI.logError(`[settings-twitchLogout] ${e.message}`);
            }
        });

        // Aquí iría la lógica para otras plataformas (TikTok, etc.)

    } catch (e) {
        window.electronAPI.logError(`[settings-handlePlatformAuth] ${e.message}`);
    }
}
