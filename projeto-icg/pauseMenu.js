export function setupPauseMenu(onPauseChange, pointerLockElement = document.body) {
    const pauseMenu   = document.getElementById('pauseMenu');
    const resumeBtn   = document.getElementById('resumeBtn');
    const restartBtn  = document.getElementById('restartBtn');   // Captura o novo botão
    const optionsBtn  = document.getElementById('optionsBtn');
    const exitBtn     = document.getElementById('exitBtn');
    let paused = false;

    // Pausa ao perder pointer lock
    document.addEventListener('pointerlockchange', () => {
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
        if (!paused && document.pointerLockElement) {
            // pausa: sai do pointer lock
            document.exitPointerLock();
        } else if (paused) {
            // retoma: fecha menu e relock
            paused = false;
            pauseMenu.style.display = 'none';
            onPauseChange?.(false);
            pointerLockElement.requestPointerLock?.();
        }
    });

    return () => paused;
}