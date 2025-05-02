import { playMenuClickSound } from './utils/audioUtils.js';  // Adicionar esta importação no topo

export function setupPauseMenu(onPauseChange, pointerLockElement = document.body) {
    const pauseMenu = document.getElementById('pauseMenu');
    const resumeBtn = document.getElementById('resumeBtn');
    const restartBtn = document.getElementById('restartBtn');
    const optionsBtn = document.getElementById('optionsBtn');
    const exitBtn = document.getElementById('exitBtn');
    const optionsMenu = document.getElementById('optionsMenu');
    const backToPauseBtn = document.getElementById('backToPauseBtn');

    let paused = false;
    let manualToggle = false; // Flag para evitar conflito entre ESC e pointerlockchange

    function showPauseMenu() {
        if (pauseMenu) pauseMenu.style.display = 'flex';
        if (optionsMenu) optionsMenu.style.display = 'none'; // Ensure options menu is hidden
        paused = true;
        if (onPauseChange) onPauseChange(true);
    }

    function hidePauseMenu() {
        if (pauseMenu) pauseMenu.style.display = 'none';
        if (optionsMenu) optionsMenu.style.display = 'none'; // Ensure options menu is hidden
        paused = false;
        if (onPauseChange) onPauseChange(false);
        pointerLockElement.requestPointerLock?.();
    }

    function showOptionsMenu() {
        if (pauseMenu) pauseMenu.style.display = 'none'; // Hide pause menu
        if (optionsMenu) optionsMenu.style.display = 'flex'; // Show options menu
        // Note: The game remains paused (paused = true)
    }

    // Pausa ao perder pointer lock
    document.addEventListener('pointerlockchange', () => {
        if (manualToggle) {
            manualToggle = false; // Resetar a flag após o toggle manual
            return;
        }

        // Only pause if pointer lock is lost AND the game isn't already paused
        // AND neither the pause menu nor the options menu is currently displayed manually
        if (document.pointerLockElement === null && !paused &&
            (!pauseMenu || pauseMenu.style.display === 'none') &&
            (!optionsMenu || optionsMenu.style.display === 'none'))
        {
            let shouldPause = true;
            if (onPauseChange) {
                const allowed = onPauseChange(true); // Signal intent to pause
                if (allowed === false) shouldPause = false;
            }
            if (shouldPause) {
                showPauseMenu(); // Show the main pause menu when focus is lost
            }
        }
    });

    // Retomar
    resumeBtn?.addEventListener('click', () => {
        if (!paused) return;
        hidePauseMenu();
    });

    // Restart
    restartBtn?.addEventListener('click', () => {
        playMenuClickSound(); // Adiciona som
        setTimeout(() => {
            window.location.reload(); // Recarrega a página após um breve atraso para o som tocar
        }, 200); // 200ms de atraso
    });

    // Opções button in Pause Menu
    optionsBtn?.addEventListener('click', () => {
        if (paused) { // Only works if game is paused
            showOptionsMenu();
        }
    });

    // Back button in Options Menu
    backToPauseBtn?.addEventListener('click', () => {
        if (paused) { // Should only be accessible when paused
             showPauseMenu(); // Go back to the main pause menu
        }
    });

    // Sair para menu
    exitBtn?.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // ESC para toggle
    window.addEventListener('keydown', e => {
        if (e.code !== 'Escape') return;

        manualToggle = true; // Indica que o toggle foi feito manualmente

        // If options menu is visible, ESC should close it and return to pause menu
        if (optionsMenu && optionsMenu.style.display === 'flex') {
            showPauseMenu();
        }
        // If pause menu is visible (and options menu is not), ESC should resume game
        else if (paused) {
            hidePauseMenu();
        }
        // If game is running, ESC should pause and show pause menu
        else {
            showPauseMenu();
        }
    });

    // Ensure menus are hidden initially if they exist
    if (pauseMenu) pauseMenu.style.display = 'none';
    if (optionsMenu) optionsMenu.style.display = 'none';

    // Retorne uma função que apenas consulta o estado interno
    return () => paused;
}