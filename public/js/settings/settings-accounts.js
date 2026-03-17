// Gestiona la lógica de autenticación para las diferentes plataformas.

function handlePlatformAuth() {
    // --- TWITCH --- //
    const twitchLoginBtn = document.getElementById('twitch-login-btn');
    const twitchLogoutBtn = document.getElementById('twitch-logout-btn');
    const twitchStatus = document.getElementById('twitch-status');
    const twitchUserInput = document.getElementById('twitchUser');

    // Función para actualizar la UI de Twitch
    const updateTwitchUI = () => {
        if (cfg.twitchToken && cfg.twitchLogin) {
            twitchLoginBtn.style.display = 'none';
            twitchLogoutBtn.style.display = 'inline-block';
            twitchStatus.textContent = `Conectado como ${cfg.twitchLogin}.`;
            twitchStatus.style.color = '#53fc18';
            twitchUserInput.value = cfg.twitchLogin;
        } else {
            twitchLoginBtn.style.display = 'inline-block';
            twitchLogoutBtn.style.display = 'none';
            twitchStatus.textContent = 'No conectado.';
            twitchStatus.style.color = '#888';
            twitchUserInput.value = cfg.twitchLogin || '';
        }
    };

    updateTwitchUI(); // Estado inicial

    // Listener para Iniciar Sesión con Twitch
    twitchLoginBtn.addEventListener('click', async () => {
        twitchStatus.textContent = 'Esperando autorización en el navegador...';
        twitchStatus.style.color = '#f1c40f';
        twitchLoginBtn.disabled = true;

        try {
            const result = await window.electronAPI.loginTwitch();
            if (result && result.success) {
                cfg.twitchToken = result.token;
                cfg.twitchLogin = result.login;
                await window.electronAPI.saveSettings(cfg); // Guardar la nueva config
                updateTwitchUI(); // Actualizar la UI
            } else {
                twitchStatus.textContent = result.error || 'Inicio de sesión cancelado.';
                twitchStatus.style.color = '#e74c3c';
            }
        } catch (e) {
            window.electronAPI.logError(`[settings-accounts:login] ${e.message}`);
            twitchStatus.textContent = 'Error crítico durante el inicio de sesión.';
            twitchStatus.style.color = '#e74c3c';
        }
        twitchLoginBtn.disabled = false;
    });

    // Listener para Cerrar Sesión de Twitch
    twitchLogoutBtn.addEventListener('click', async () => {
        if (confirm('¿Seguro que quieres desconectar tu cuenta de Twitch?')) {
            cfg.twitchToken = null;
            cfg.twitchLogin = get('twitchUser'); // Conservar el nombre de usuario por si acaso
            try {
                await window.electronAPI.saveSettings(cfg);
                updateTwitchUI();
            } catch (e) {
                window.electronAPI.logError(`[settings-accounts:logout] ${e.message}`);
            }
        }
    });
}
