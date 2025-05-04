// Em audioUtils.js
console.log('Tentando carregar o som do menu...');

let clickSound;
let audioInitialized = false;

function initAudio() {
  if (audioInitialized) return;
  
  console.log('Inicializando sistema de áudio...');
  clickSound = new Audio('../assets/sound/menu_click.mp3');
  clickSound.preload = 'auto';
  audioInitialized = true;
}

// Inicializar áudio após interação do usuário
document.addEventListener('click', initAudio, { once: true });

export function playMenuClickSound() {
  console.log('▶️ playMenuClickSound fired');
  if (!audioInitialized) initAudio();
  
  if (clickSound) {
    if (!clickSound.paused) clickSound.currentTime = 0;
    clickSound.play().catch(err => console.error('playSound error:', err));
  }
}