export function setupPauseMenu(onPauseChange, pointerLockElement = document.body) {
    const pauseMenu = document.getElementById('pauseMenu');
    const resumeBtn = document.getElementById('resumeBtn');
    const optionsBtn = document.getElementById('optionsBtn');
    const exitBtn = document.getElementById('exitBtn');
    let paused = false;

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === null && !paused) {
            paused = true;
            pauseMenu.style.display = 'flex';
            if (onPauseChange) onPauseChange(paused);
        }
    });

    resumeBtn?.addEventListener('click', () => {
        paused = false;
        pauseMenu.style.display = 'none';
        // Volta a pedir pointer lock no elemento correto
        pointerLockElement.requestPointerLock?.();
        if (onPauseChange) onPauseChange(paused);
    });

    optionsBtn?.addEventListener('click', () => {
        alert('Opções ainda não implementadas!');
    });

    exitBtn?.addEventListener('click', () => {
        window.location.href = 'menu.html';
    });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' && paused) {
            paused = false;
            pauseMenu.style.display = 'none';
            pointerLockElement.requestPointerLock?.();
            if (onPauseChange) onPauseChange(paused);
        }
    });

    return () => paused;
}