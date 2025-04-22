export function setupPauseMenu(onPauseChange, pointerLockElement = document.body) {
    const pauseMenu   = document.getElementById('pauseMenu');
    const resumeBtn   = document.getElementById('resumeBtn');
    const restartBtn  = document.getElementById('restartBtn');
    const optionsBtn  = document.getElementById('optionsBtn');
    const exitBtn     = document.getElementById('exitBtn');
    let paused = false;
    let manualToggle = false; // Flag para evitar conflito entre ESC e pointerlockchange

    // Pausa ao perder pointer lock
    document.addEventListener('pointerlockchange', () => {
        if (manualToggle) {
            manualToggle = false; // Resetar a flag após o toggle manual
            return;
        }

        if (document.pointerLockElement === null && !paused) {
            let shouldPause = true;
            if (onPauseChange) {
                const allowed = onPauseChange(true);
                if (allowed === false) shouldPause = false;
            }
            if (shouldPause) {
                paused = true;
                pauseMenu.style.display = 'flex';
            }
        }
    });

    // Retomar
    resumeBtn?.addEventListener('click', () => {
        if (!paused) return;
        paused = false;
        pauseMenu.style.display = 'none';
        onPauseChange?.(false);
        pointerLockElement.requestPointerLock?.();
    });

    // Restart
    restartBtn?.addEventListener('click', () => {
        window.location.reload();
    });

    // Opções
    optionsBtn?.addEventListener('click', () => {
        alert('Opções ainda não implementadas!');
    });

    // Sair para menu
    exitBtn?.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // ESC para toggle
    window.addEventListener('keydown', e => {
        if (e.code !== 'Escape') return;

        manualToggle = true; // Indica que o toggle foi feito manualmente
        if (!paused) {
            // Pausa: exibe o menu
            paused = true;
            pauseMenu.style.display = 'flex';
            onPauseChange?.(true);
        } else {
            // Retoma: esconde o menu
            paused = false;
            pauseMenu.style.display = 'none';
            onPauseChange?.(false);
            pointerLockElement.requestPointerLock?.();
        }
    });

    return () => paused;
}