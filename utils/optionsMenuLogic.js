// filepath: d:\git hub\threejs-3d-fps-platformer\utils\optionsMenuLogic.js

// Elementos do DOM (serão obtidos quando a função for chamada)
let optionsMenuElement, movementKeyDisplayButtons, backButton;
let controlsTabButton, graphicsTabButton, controlsSettingsDiv, graphicsSettingsDiv, antialiasToggleButton;
let shadowQualityButton, viewDistanceSelect; // Novos elementos
let audioTabButton, audioSettingsDiv, masterVolumeSlider, musicVolumeSlider, sfxVolumeSlider; // Elementos da Aba de Áudio
let menuClickSound;
let currentBackButtonCallback; // Variável para guardar a callback atual do botão voltar

let initialGraphicsSettings = {};
let graphicsSettingsChanged = false;

// Importar as funções de main.js (assumindo que está no contexto de um nível onde main.js é carregado)
// Para o menu principal (index.html), estas funções não estarão disponíveis diretamente.
// Precisamos de uma forma de verificar se elas existem antes de chamar.
let mainJsAudioControls = null;

async function loadMainJsAudioControls() {
    if (typeof window.setMasterVolumeFromMain === 'function') { // Verificar se main.js já expôs as funções
        mainJsAudioControls = {
            setMasterVolume: window.setMasterVolumeFromMain,
            setMusicVolume: window.setMusicVolumeFromMain,
            setSfxVolume: window.setSfxVolumeFromMain,
        };
        console.log("[optionsMenuLogic] Controles de áudio de main.js já disponíveis.");
    } else {
        try {
            // Tenta importar dinamicamente se não estiverem disponíveis globalmente
            // Isto é mais relevante se optionsMenuLogic for usado em contextos onde main.js é um módulo
            const mainModule = await import('../main.js'); // Ajuste o caminho se necessário
            if (mainModule && mainModule.setMasterVolume && mainModule.setMusicVolume && mainModule.setSfxVolume) {
                mainJsAudioControls = {
                    setMasterVolume: mainModule.setMasterVolume,
                    setMusicVolume: mainModule.setMusicVolume,
                    setSfxVolume: mainModule.setSfxVolume,
                };
                console.log("[optionsMenuLogic] Controles de áudio de main.js carregados dinamicamente.");
            }
        } catch (error) {
            console.warn("[optionsMenuLogic] Não foi possível carregar os controles de áudio de main.js. O controle de áudio no jogo pode não funcionar.", error);
        }
    }
}

function playClick() {
    if (menuClickSound && typeof menuClickSound.play === 'function') {
        // Verifica se o som já está a tocar para evitar sobreposição ou erros
        if (!menuClickSound.paused) {
            menuClickSound.currentTime = 0; // Reinicia o som se já estiver a tocar
        }
        menuClickSound.play().catch(err => console.error('[optionsMenuLogic] Audio Play Error:', err));
    } else {
        console.warn("[optionsMenuLogic] menuClickSound não está definido ou não é um elemento de áudio válido.");
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
    if (audioSettingsDiv) audioSettingsDiv.style.display = 'none'; // Esconder aba de áudio
    if (controlsTabButton) controlsTabButton.classList.add('active-tab');
    if (graphicsTabButton) graphicsTabButton.classList.remove('active-tab');
    if (audioTabButton) audioTabButton.classList.remove('active-tab'); // Desativar aba de áudio
}

function showGraphicsTab() {
    console.log("[optionsMenuLogic] Mostrando aba de Gráficos");
    if (controlsSettingsDiv) controlsSettingsDiv.style.display = 'none';
    if (graphicsSettingsDiv) graphicsSettingsDiv.style.display = 'block';
    if (audioSettingsDiv) audioSettingsDiv.style.display = 'none'; // Esconder aba de áudio
    if (controlsTabButton) controlsTabButton.classList.remove('active-tab');
    if (graphicsTabButton) graphicsTabButton.classList.add('active-tab');
    if (audioTabButton) audioTabButton.classList.remove('active-tab'); // Desativar aba de áudio
}

// Nova função para mostrar a aba de Áudio
function showAudioTab() {
    console.log("[optionsMenuLogic] Mostrando aba de Áudio");
    if (controlsSettingsDiv) controlsSettingsDiv.style.display = 'none';
    if (graphicsSettingsDiv) graphicsSettingsDiv.style.display = 'none';
    if (audioSettingsDiv) audioSettingsDiv.style.display = 'block';
    if (controlsTabButton) controlsTabButton.classList.remove('active-tab');
    if (graphicsTabButton) graphicsTabButton.classList.remove('active-tab');
    if (audioTabButton) audioTabButton.classList.add('active-tab');
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

// Novas funções para carregar e guardar definições de áudio
function loadAudioSettings() {
    if (masterVolumeSlider) {
        masterVolumeSlider.value = localStorage.getItem('masterVolume') || '0.5';
    }
    if (musicVolumeSlider) {
        musicVolumeSlider.value = localStorage.getItem('musicVolume') || '0.05';
    }
    if (sfxVolumeSlider) {
        sfxVolumeSlider.value = localStorage.getItem('sfxVolume') || '0.1';
    }
    applyAudioSettings();
}

function applyAudioSettings() {
    const masterVolume = parseFloat(localStorage.getItem('masterVolume') || '0.5');
    const musicVolumeSetting = parseFloat(localStorage.getItem('musicVolume') || '0.05'); // Volume específico para música
    const sfxVolumeSetting = parseFloat(localStorage.getItem('sfxVolume') || '0.1');     // Volume específico para SFX

    console.log(`[optionsMenuLogic] Aplicando Volumes: Geral=${masterVolume}, Música=${musicVolumeSetting}, Efeitos=${sfxVolumeSetting}`);

    // 1. Aplicar à música do menu principal (se a função global existir)
    if (typeof window.applyMainMenuVolumeSettings === 'function') {
        window.applyMainMenuVolumeSettings();
    }
    if (typeof window.playMainMenuMusicIfNeeded === 'function') { // Tenta tocar música se estiver pausada
        window.playMainMenuMusicIfNeeded();
    }

    // 2. Aplicar aos controlos de áudio de main.js (para áudio dentro do jogo/níveis)
    if (mainJsAudioControls) {
        if (mainJsAudioControls.setMasterVolume) {
            mainJsAudioControls.setMasterVolume(masterVolume);
        }
        if (mainJsAudioControls.setMusicVolume) {
            // A música do jogo deve ser modulada pelo volume mestre E pela definição de música
            mainJsAudioControls.setMusicVolume(musicVolumeSetting * masterVolume);
        }
        if (mainJsAudioControls.setSfxVolume) {
            // Os SFX do jogo devem ser modulados pelo volume mestre E pela definição de SFX
            mainJsAudioControls.setSfxVolume(sfxVolumeSetting * masterVolume);
        }
    } else {
        // Tenta carregar os controles se ainda não foram carregados
        loadMainJsAudioControls().then(() => {
            if (mainJsAudioControls && mainJsAudioControls.setMasterVolume) mainJsAudioControls.setMasterVolume(masterVolume);
            if (mainJsAudioControls && mainJsAudioControls.setMusicVolume) mainJsAudioControls.setMusicVolume(musicVolumeSetting * masterVolume);
            if (mainJsAudioControls && mainJsAudioControls.setSfxVolume) mainJsAudioControls.setSfxVolume(sfxVolumeSetting * masterVolume);
        });
    }

    // 3. Aplicar ao som de clique do menu (que é local a optionsMenuLogic ou audioUtils)
    if (menuClickSound && typeof menuClickSound.volume !== 'undefined') {
        // O som de clique é um SFX, então é modulado pelo master e pelo SFX
        menuClickSound.volume = sfxVolumeSetting * masterVolume;
    }
}

// Função de inicialização que será exportada e chamada
export async function initializeOptionsMenuLogic(menuContainerId = 'optionsMenu', backButtonCallback) {
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
    audioTabButton = optionsMenuElement.querySelector('#optionsAudioTabButton'); // Novo
    
    controlsSettingsDiv = optionsMenuElement.querySelector('#optionsControlsSettings');
    graphicsSettingsDiv = optionsMenuElement.querySelector('#optionsGraphicsSettings');
    audioSettingsDiv = optionsMenuElement.querySelector('#optionsAudioSettings'); // Novo

    antialiasToggleButton = optionsMenuElement.querySelector('#antialiasToggleButton');
    shadowQualityButton = optionsMenuElement.querySelector('#shadowQualityButton'); 
    viewDistanceSelect = optionsMenuElement.querySelector('#viewDistanceSelect');   

    // Novos seletores para áudio
    masterVolumeSlider = optionsMenuElement.querySelector('#masterVolumeSlider');
    musicVolumeSlider = optionsMenuElement.querySelector('#musicVolumeSlider');
    sfxVolumeSlider = optionsMenuElement.querySelector('#sfxVolumeSlider');

    console.log("[optionsMenuLogic] controlsTabButton:", controlsTabButton);
    console.log("[optionsMenuLogic] graphicsTabButton:", graphicsTabButton);
    console.log("[optionsMenuLogic] audioTabButton:", audioTabButton); // Log
    console.log("[optionsMenuLogic] controlsSettingsDiv:", controlsSettingsDiv);
    console.log("[optionsMenuLogic] graphicsSettingsDiv:", graphicsSettingsDiv);
    console.log("[optionsMenuLogic] audioSettingsDiv:", audioSettingsDiv); // Log
    console.log("[optionsMenuLogic] antialiasToggleButton:", antialiasToggleButton);
    console.log("[optionsMenuLogic] backButton:", backButton);
    console.log("[optionsMenuLogic] shadowQualityButton:", shadowQualityButton);
    console.log("[optionsMenuLogic] viewDistanceSelect:", viewDistanceSelect);
    console.log("[optionsMenuLogic] masterVolumeSlider:", masterVolumeSlider); // Log
    console.log("[optionsMenuLogic] musicVolumeSlider:", musicVolumeSlider);   // Log
    console.log("[optionsMenuLogic] sfxVolumeSlider:", sfxVolumeSlider);     // Log

    try {
        // Corrigir para usar .mp3 e garantir que o caminho está correto
        // Se optionsMenuLogic.js está em utils/, e assets/ está na raiz, o caminho é '../assets/...'
        // Mas como é carregado por HTML na raiz, 'assets/...' deve funcionar.
        // Vamos manter 'assets/...' e usar .mp3
        menuClickSound = new Audio('assets/sound/menu_click.mp3'); 
        if (menuClickSound && typeof menuClickSound.volume !== 'undefined') {
            const masterVol = parseFloat(localStorage.getItem('masterVolume') || '0.5');
            const sfxVol = parseFloat(localStorage.getItem('sfxVolume') || '0.1');
            menuClickSound.volume = sfxVol * masterVol;
        }
    } catch (e) {
        console.error("[optionsMenuLogic] Erro ao criar Audio object para menu_click.mp3:", e);
        menuClickSound = { play: () => {}, pause: () => {}, currentTime: 0 };
    }

    // Remover event listeners antigos para evitar duplicação se chamado múltiplas vezes
    if (controlsTabButton) controlsTabButton.removeEventListener('click', handleControlsTabClick);
    if (graphicsTabButton) graphicsTabButton.removeEventListener('click', handleGraphicsTabClick);
    if (audioTabButton) audioTabButton.removeEventListener('click', handleAudioTabClick); // Novo
    if (antialiasToggleButton) antialiasToggleButton.removeEventListener('click', handleAntialiasToggleClick);
    if (backButton) backButton.removeEventListener('click', handleBackButtonClick);
    if (shadowQualityButton) shadowQualityButton.removeEventListener('click', handleShadowQualityToggleClick); 
    if (viewDistanceSelect) viewDistanceSelect.removeEventListener('change', handleViewDistanceChange);     

    // Listeners para sliders de áudio
    if (masterVolumeSlider) masterVolumeSlider.removeEventListener('input', handleMasterVolumeChange);
    if (musicVolumeSlider) musicVolumeSlider.removeEventListener('input', handleMusicVolumeChange);
    if (sfxVolumeSlider) sfxVolumeSlider.removeEventListener('input', handleSfxVolumeChange);

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

    if (audioTabButton) { // Novo
        audioTabButton.addEventListener('click', handleAudioTabClick);
    } else {
        console.error("[optionsMenuLogic] Botão da aba de Áudio não encontrado!");
    }

    if (antialiasToggleButton) {
        antialiasToggleButton.addEventListener('click', handleAntialiasToggleClick);
    } else {
        console.error("[optionsMenuLogic] Botão Antialias não encontrado!");
    }

    if (shadowQualityButton) {
        shadowQualityButton.addEventListener('click', handleShadowQualityToggleClick);
    } else {
        console.error("[optionsMenuLogic] Botão Qualidade Sombras não encontrado!");
    }

    if (viewDistanceSelect) {
        viewDistanceSelect.addEventListener('change', handleViewDistanceChange);
    } else {
        console.error("[optionsMenuLogic] Seletor Distância de Visão não encontrado!");
    }
    
    // Adicionar listeners para os sliders de áudio
    if (masterVolumeSlider) {
        masterVolumeSlider.addEventListener('input', handleMasterVolumeChange);
    }
    if (musicVolumeSlider) {
        musicVolumeSlider.addEventListener('input', handleMusicVolumeChange);
    }
    if (sfxVolumeSlider) {
        sfxVolumeSlider.addEventListener('input', handleSfxVolumeChange);
    }

    if (backButton) {
         backButton.addEventListener('click', handleBackButtonClick);
    } else {
        console.error("[optionsMenuLogic] Botão Voltar não encontrado!");
    }
    
    await loadMainJsAudioControls(); // Tenta carregar os controles de áudio de main.js uma vez na inicialização

    updateKeybindsDisplay();
    loadAntialiasSetting();
    loadShadowQualitySetting(); 
    loadViewDistanceSetting();  
    loadAudioSettings(); // Carregar definições de áudio
    
    // Por defeito, mostrar a aba de controlos ou a última aba ativa (se guardado)
    // Por agora, vamos manter a aba de controlos como padrão ao abrir.
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

// Nova handler function para a aba de Áudio
function handleAudioTabClick() {
    playClick();
    showAudioTab();
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

// Novas handler functions para os sliders de volume
function handleMasterVolumeChange() {
    if (masterVolumeSlider) {
        localStorage.setItem('masterVolume', masterVolumeSlider.value);
        console.log(`[optionsMenuLogic] Master Volume set to: ${masterVolumeSlider.value}`);
        applyAudioSettings(); // Aplicar imediatamente (ou pode adicionar um botão "Aplicar")
        // checkAudioChange(); // Similar ao checkGraphicsChange se precisar de nota de reinício
    }
}

function handleMusicVolumeChange() {
    if (musicVolumeSlider) {
        localStorage.setItem('musicVolume', musicVolumeSlider.value);
        console.log(`[optionsMenuLogic] Music Volume set to: ${musicVolumeSlider.value}`);
        applyAudioSettings();
        // checkAudioChange();
    }
}

function handleSfxVolumeChange() {
    if (sfxVolumeSlider) {
        localStorage.setItem('sfxVolume', sfxVolumeSlider.value);
        console.log(`[optionsMenuLogic] SFX Volume set to: ${sfxVolumeSlider.value}`);
        applyAudioSettings();
        // checkAudioChange();
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