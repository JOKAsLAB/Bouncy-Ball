import { playMenuClickSound } from './audioUtils.js';

export function bindMenuSounds() {
    document.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', playMenuClickSound);
    });
}