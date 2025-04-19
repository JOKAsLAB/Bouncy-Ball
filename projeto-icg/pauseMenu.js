export function setupPauseMenu(onPauseChange, pointerLockElement = document.body) {
    const pauseMenu = document.getElementById('pauseMenu');
    const resumeBtn = document.getElementById('resumeBtn');
    const optionsBtn = document.getElementById('optionsBtn');
    const exitBtn = document.getElementById('exitBtn');
    let paused = false;

    // Pausa ao perder pointer lock
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === null && !paused) {
            paused = true;
            pauseMenu.style.display = 'flex';
            if (onPauseChange) onPauseChange(paused);
        }
    });

    // Retomar
    resumeBtn?.addEventListener('click', () => {
        if (paused) {
            paused = false;
            pauseMenu.style.display = 'none';
            if (document.pointerLockElement !== pointerLockElement) {
                pointerLockElement.requestPointerLock?.();
            }
            if (onPauseChange) onPauseChange(paused);
        }
    });

    // Opções
    optionsBtn?.addEventListener('click', () => {
        alert('Opções ainda não implementadas!');
    });

    // Sair para menu
    exitBtn?.addEventListener('click', () => {
        window.location.href = 'menu.html';
    });

    // ESC para pausar/retomar
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Escape') {
            if (!paused && document.pointerLockElement) {
                // Pausar manualmente
                document.exitPointerLock();
            } else if (paused) {
                // Retomar
                paused = false;
                pauseMenu.style.display = 'none';
                pointerLockElement.requestPointerLock?.();
                if (onPauseChange) onPauseChange(paused);
            }
        }
    });

    return () => paused;
}