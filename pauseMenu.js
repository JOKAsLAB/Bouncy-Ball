import { playMenuClickSound } from './utils/audioUtils.js';

export function setupPauseMenu(onPauseChange, pointerLockElement = document.body) {
    const pauseMenu = document.getElementById('pauseMenu');
    const resumeBtn = document.getElementById('resumeBtn');
    const restartBtn = document.getElementById('restartBtn');
    const optionsBtn = document.getElementById('optionsBtn');
    const exitBtn = document.getElementById('exitBtn');
    const optionsMenu = document.getElementById('optionsMenu');
    const backToPauseBtn = document.getElementById('backToPauseBtn');

    let paused = false;
    let manualToggle = false;

    function showPauseMenu() {
        if (pauseMenu) pauseMenu.style.display = 'flex';
        if (optionsMenu) optionsMenu.style.display = 'none';
        paused = true;
        if (onPauseChange) onPauseChange(true);
    }

    function hidePauseMenu() {
        if (pauseMenu) pauseMenu.style.display = 'none';
        if (optionsMenu) optionsMenu.style.display = 'none';
        paused = false;
        if (onPauseChange) onPauseChange(false);
        pointerLockElement.requestPointerLock?.();
    }

    function showOptionsMenu() {
        if (pauseMenu) pauseMenu.style.display = 'none';
        if (optionsMenu) optionsMenu.style.display = 'flex';
    }

    document.addEventListener('pointerlockchange', () => {
        if (manualToggle) {
            manualToggle = false;
            return;
        }

        if (document.pointerLockElement === null && !paused &&
            (!pauseMenu || pauseMenu.style.display === 'none') &&
            (!optionsMenu || optionsMenu.style.display === 'none'))
        {
            let shouldPause = true;
            if (onPauseChange) {
                const allowed = onPauseChange(true);
                if (allowed === false) shouldPause = false;
            }
            if (shouldPause) {
                showPauseMenu();
            }
        }
    });

    resumeBtn?.addEventListener('click', () => {
        if (!paused) return;
        hidePauseMenu();
    });

    restartBtn?.addEventListener('click', () => {
        playMenuClickSound();
        setTimeout(() => {
            window.location.reload();
        }, 200);
    });

    optionsBtn?.addEventListener('click', () => {
        if (paused) {
            showOptionsMenu();
        }
    });

    backToPauseBtn?.addEventListener('click', () => {
        if (paused) {
             showPauseMenu();
        }
    });

    exitBtn?.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    window.addEventListener('keydown', e => {
        if (e.code !== 'Escape') return;

        manualToggle = true;

        if (optionsMenu && optionsMenu.style.display === 'flex') {
            showPauseMenu();
        }
        else if (paused) {
            hidePauseMenu();
        }
        else {
            showPauseMenu();
        }
    });

    if (pauseMenu) pauseMenu.style.display = 'none';
    if (optionsMenu) optionsMenu.style.display = 'none';

    return () => paused;
}