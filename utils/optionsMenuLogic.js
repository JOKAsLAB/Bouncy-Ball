// filepath: d:\git hub\threejs-3d-fps-platformer\utils\optionsMenuLogic.js

// Elementos do DOM (serão obtidos quando a função for chamada)
let optionsMenuElement, movementKeyDisplayButtons, backButton;
let controlsTabButton, graphicsTabButton, controlsSettingsDiv, graphicsSettingsDiv, antialiasToggleButton;
let menuClickSound;
let currentBackButtonCallback; // Variável para guardar a callback atual do botão voltar

function playClick() {
    if (menuClickSound && typeof menuClickSound.play === 'function') {
        if (!menuClickSound.paused) {
            menuClickSound.pause(); // Pausa antes de reiniciar
            menuClickSound.currentTime = 0;
        }
        menuClickSound.play().catch(e => console.error("[optionsMenuLogic] Audio Play Error:", e));
    }
}

let settings = {
    keybinds: {
        forward: 'W',
        backward: 'S',
        left: 'A',
        right: 'D',
        jump: 'Space'
    }
};

function updateKeybindsDisplay() {
    if (!movementKeyDisplayButtons) return;
    movementKeyDisplayButtons.forEach(button => {
        const action = button.dataset.action;
        if (action && settings.keybinds[action]) {
            button.textContent = settings.keybinds[action] === ' ' ? 'Space' : settings.keybinds[action].toUpperCase();
        }
    });
}

function showControlsTab() {
    console.log("[optionsMenuLogic] Mostrando aba de Controlos");
    if (controlsSettingsDiv) controlsSettingsDiv.style.display = 'block';
    if (graphicsSettingsDiv) graphicsSettingsDiv.style.display = 'none';
    if (controlsTabButton) controlsTabButton.classList.add('active-tab');
    if (graphicsTabButton) graphicsTabButton.classList.remove('active-tab');
}

function showGraphicsTab() {
    console.log("[optionsMenuLogic] Mostrando aba de Gráficos");
    if (controlsSettingsDiv) controlsSettingsDiv.style.display = 'none';
    if (graphicsSettingsDiv) graphicsSettingsDiv.style.display = 'block';
    if (controlsTabButton) controlsTabButton.classList.remove('active-tab');
    if (graphicsTabButton) graphicsTabButton.classList.add('active-tab');
}

function loadAntialiasSetting() {
    if (!antialiasToggleButton) return;
    const aaEnabled = localStorage.getItem('antialiasEnabled') === 'true';
    antialiasToggleButton.textContent = aaEnabled ? 'Ligado' : 'Desligado';
}

// Função de inicialização que será exportada e chamada
export function initializeOptionsMenuLogic(menuContainerId = 'optionsMenu', backButtonCallback) {
    optionsMenuElement = document.getElementById(menuContainerId);
    if (!optionsMenuElement) {
        console.error(`[optionsMenuLogic] Elemento do menu de opções com ID '${menuContainerId}' não encontrado.`);
        return;
    }

    currentBackButtonCallback = backButtonCallback; // Guarda a callback

    // Obter elementos dentro do contexto do optionsMenuElement
    movementKeyDisplayButtons = optionsMenuElement.querySelectorAll('#optionsControlsSettings .fixed-keybind-display[data-action]');
    backButton = optionsMenuElement.querySelector('#backToPauseBtn'); 
    
    controlsTabButton = optionsMenuElement.querySelector('#optionsControlsTabButton');
    graphicsTabButton = optionsMenuElement.querySelector('#optionsGraphicsTabButton');
    controlsSettingsDiv = optionsMenuElement.querySelector('#optionsControlsSettings');
    graphicsSettingsDiv = optionsMenuElement.querySelector('#optionsGraphicsSettings');
    antialiasToggleButton = optionsMenuElement.querySelector('#antialiasToggleButton');

    console.log("[optionsMenuLogic] controlsTabButton:", controlsTabButton);
    console.log("[optionsMenuLogic] graphicsTabButton:", graphicsTabButton);
    console.log("[optionsMenuLogic] controlsSettingsDiv:", controlsSettingsDiv);
    console.log("[optionsMenuLogic] graphicsSettingsDiv:", graphicsSettingsDiv);
    console.log("[optionsMenuLogic] antialiasToggleButton:", antialiasToggleButton);
    console.log("[optionsMenuLogic] backButton:", backButton);

    try {
        // Ajuste o caminho se necessário, relativo à página HTML que carrega este script
        menuClickSound = new Audio('assets/sound/menu_click.wav'); 
    } catch (e) {
        console.error("[optionsMenuLogic] Erro ao criar Audio object para menu_click.wav:", e);
        menuClickSound = { play: () => {}, pause: () => {}, currentTime: 0 };
    }

    // Remover event listeners antigos para evitar duplicação se chamado múltiplas vezes
    if (controlsTabButton) controlsTabButton.removeEventListener('click', handleControlsTabClick);
    if (graphicsTabButton) graphicsTabButton.removeEventListener('click', handleGraphicsTabClick);
    if (antialiasToggleButton) antialiasToggleButton.removeEventListener('click', handleAntialiasToggleClick);
    if (backButton) backButton.removeEventListener('click', handleBackButtonClick); // Agora usa a função nomeada

    // Adicionar Event Listeners
    if (controlsTabButton) {
        controlsTabButton.addEventListener('click', handleControlsTabClick);
    } else {
        console.error("[optionsMenuLogic] Botão da aba de Controlos não encontrado!");
    }

    if (graphicsTabButton) {
        graphicsTabButton.addEventListener('click', handleGraphicsTabClick);
    } else {
        console.error("[optionsMenuLogic] Botão da aba de Gráficos não encontrado!");
    }

    if (antialiasToggleButton) {
        antialiasToggleButton.addEventListener('click', handleAntialiasToggleClick);
    } else {
        console.error("[optionsMenuLogic] Botão Antialias não encontrado!");
    }

    if (backButton) { // Não precisa de verificar backButtonCallback aqui, pois a handle fará isso
         backButton.addEventListener('click', handleBackButtonClick); // Agora usa a função nomeada
    } else {
        console.error("[optionsMenuLogic] Botão Voltar não encontrado!");
    }
    
    updateKeybindsDisplay();
    loadAntialiasSetting();
    showControlsTab(); 
}

// Funções handler para os event listeners para permitir remoção
function handleControlsTabClick() {
    playClick();
    showControlsTab();
}

function handleGraphicsTabClick() {
    playClick();
    showGraphicsTab();
}

function handleAntialiasToggleClick() {
    playClick();
    let aaEnabled = localStorage.getItem('antialiasEnabled') === 'true';
    aaEnabled = !aaEnabled; 
    localStorage.setItem('antialiasEnabled', aaEnabled);
    loadAntialiasSetting(); 
}

// NOVA FUNÇÃO HANDLER PARA O BOTÃO VOLTAR
function handleBackButtonClick() {
    playClick();
    if (typeof currentBackButtonCallback === 'function') {
        currentBackButtonCallback(); // Chama a callback que foi guardada
    } else {
        console.warn("[optionsMenuLogic] Nenhuma callback definida para o botão Voltar.");
    }
}