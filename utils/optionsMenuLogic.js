// filepath: d:\git hub\threejs-3d-fps-platformer\utils\optionsMenuLogic.js

// Elementos do DOM (serão obtidos quando a função for chamada)
let optionsMenuElement, movementKeyDisplayButtons, backButton;
let controlsTabButton, graphicsTabButton, controlsSettingsDiv, graphicsSettingsDiv, antialiasToggleButton;
let shadowQualityButton, viewDistanceSelect; // Novos elementos
let menuClickSound;
let currentBackButtonCallback; // Variável para guardar a callback atual do botão voltar

let initialGraphicsSettings = {};
let graphicsSettingsChanged = false;

function playClick() {
    if (menuClickSound && typeof menuClickSound.play === 'function') {
        if (!menuClickSound.paused) {
            menuClickSound.pause(); // Pausa antes de reiniciar
            menuClickSound.currentTime = 0;
        }
        menuClickSound.play().catch(e => console.error("[optionsMenuLogic] Audio Play Error:", e));
    }
}

function updateRestartNoteVisibility() {
    const restartNote = document.getElementById('graphicsRestartNote');
    if (restartNote) {
        restartNote.style.display = graphicsSettingsChanged ? 'block' : 'none';
    }
}

function checkGraphicsChange(controlId, currentValue) {
    if (initialGraphicsSettings[controlId] !== undefined && initialGraphicsSettings[controlId] !== currentValue) {
        graphicsSettingsChanged = true;
    }
    let allMatchInitial = true;
    const antialiasButton = document.getElementById('antialiasToggleButton');
    const shadowQualityButton = document.getElementById('shadowQualityButton');
    const viewDistanceSelect = document.getElementById('viewDistanceSelect');

    if (antialiasButton && initialGraphicsSettings.antialiasToggleButton !== (antialiasButton.textContent === 'Ligado')) {
        allMatchInitial = false;
    }
    if (shadowQualityButton && initialGraphicsSettings.shadowQualityButton !== shadowQualityButton.textContent) {
        allMatchInitial = false;
    }
    if (viewDistanceSelect && initialGraphicsSettings.viewDistanceSelect !== viewDistanceSelect.value) {
        allMatchInitial = false;
    }

    if (allMatchInitial) {
        graphicsSettingsChanged = false;
    }

    updateRestartNoteVisibility();
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

function loadShadowQualitySetting() {
    if (!shadowQualityButton) return;
    const quality = localStorage.getItem('shadowQuality') || 'soft';
    shadowQualityButton.textContent = quality === 'soft' ? 'Suave' : 'Básica';
    localStorage.setItem('shadowQuality', quality);
}

function loadViewDistanceSetting() {
    if (!viewDistanceSelect) return;
    const distance = localStorage.getItem('viewDistance') || 'medium';
    viewDistanceSelect.value = distance;
    localStorage.setItem('viewDistance', distance);
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
    shadowQualityButton = optionsMenuElement.querySelector('#shadowQualityButton'); // Novo
    viewDistanceSelect = optionsMenuElement.querySelector('#viewDistanceSelect');   // Novo

    console.log("[optionsMenuLogic] controlsTabButton:", controlsTabButton);
    console.log("[optionsMenuLogic] graphicsTabButton:", graphicsTabButton);
    console.log("[optionsMenuLogic] controlsSettingsDiv:", controlsSettingsDiv);
    console.log("[optionsMenuLogic] graphicsSettingsDiv:", graphicsSettingsDiv);
    console.log("[optionsMenuLogic] antialiasToggleButton:", antialiasToggleButton);
    console.log("[optionsMenuLogic] backButton:", backButton);
    console.log("[optionsMenuLogic] shadowQualityButton:", shadowQualityButton);
    console.log("[optionsMenuLogic] viewDistanceSelect:", viewDistanceSelect);

    try {
        menuClickSound = new Audio('assets/sound/menu_click.wav'); 
    } catch (e) {
        console.error("[optionsMenuLogic] Erro ao criar Audio object para menu_click.wav:", e);
        menuClickSound = { play: () => {}, pause: () => {}, currentTime: 0 };
    }

    // Remover event listeners antigos para evitar duplicação se chamado múltiplas vezes
    if (controlsTabButton) controlsTabButton.removeEventListener('click', handleControlsTabClick);
    if (graphicsTabButton) graphicsTabButton.removeEventListener('click', handleGraphicsTabClick);
    if (antialiasToggleButton) antialiasToggleButton.removeEventListener('click', handleAntialiasToggleClick);
    if (backButton) backButton.removeEventListener('click', handleBackButtonClick);
    if (shadowQualityButton) shadowQualityButton.removeEventListener('click', handleShadowQualityToggleClick); // Novo
    if (viewDistanceSelect) viewDistanceSelect.removeEventListener('change', handleViewDistanceChange);     // Novo

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

    if (shadowQualityButton) { // Novo
        shadowQualityButton.addEventListener('click', handleShadowQualityToggleClick);
    } else {
        console.error("[optionsMenuLogic] Botão Qualidade Sombras não encontrado!");
    }

    if (viewDistanceSelect) { // Novo
        viewDistanceSelect.addEventListener('change', handleViewDistanceChange);
    } else {
        console.error("[optionsMenuLogic] Seletor Distância de Visão não encontrado!");
    }
    
    if (backButton) {
         backButton.addEventListener('click', handleBackButtonClick);
    } else {
        console.error("[optionsMenuLogic] Botão Voltar não encontrado!");
    }
    
    updateKeybindsDisplay();
    loadAntialiasSetting();
    loadShadowQualitySetting(); // Novo
    loadViewDistanceSetting();  // Novo
    showControlsTab(); 

    // Guardar valores iniciais
    if (antialiasToggleButton) {
        initialGraphicsSettings.antialiasToggleButton = localStorage.getItem('antialiasEnabled') === 'true';
    }
    if (shadowQualityButton) {
        initialGraphicsSettings.shadowQualityButton = localStorage.getItem('shadowQuality') || 'soft';
    }
    if (viewDistanceSelect) {
        initialGraphicsSettings.viewDistanceSelect = localStorage.getItem('viewDistance') || 'medium';
    }
    graphicsSettingsChanged = false; // Reset no início
    updateRestartNoteVisibility();
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
    checkGraphicsChange('antialiasToggleButton', aaEnabled);
}

function handleShadowQualityToggleClick() {
    playClick();
    let quality = localStorage.getItem('shadowQuality') || 'soft';
    quality = quality === 'soft' ? 'basic' : 'soft';
    localStorage.setItem('shadowQuality', quality);
    loadShadowQualitySetting();
    checkGraphicsChange('shadowQualityButton', quality);
}

function handleViewDistanceChange() {
    playClick();
    if (viewDistanceSelect) {
        const newValue = viewDistanceSelect.value;
        localStorage.setItem('viewDistance', newValue);
        console.log(`[optionsMenuLogic] View distance set to: ${newValue}`);
        checkGraphicsChange('viewDistanceSelect', newValue);
    }
}

function handleBackButtonClick() {
    playClick();
    if (typeof currentBackButtonCallback === 'function') {
        currentBackButtonCallback();
    } else {
        console.warn("[optionsMenuLogic] Nenhuma callback definida para o botão Voltar.");
    }
}