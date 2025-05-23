// filepath: d:\git hub\threejs-3d-fps-platformer\utils\optionsMenuLogic.js

let optionsMenuElement, movementKeyDisplayButtons, backButton;
let controlsTabButton, graphicsTabButton, controlsSettingsDiv, graphicsSettingsDiv, antialiasToggleButton;
let shadowQualityButton, viewDistanceSelect; 
let audioTabButton, audioSettingsDiv, masterVolumeSlider, musicVolumeSlider, sfxVolumeSlider; 
let menuClickSound;
let currentBackButtonCallback; 

let initialGraphicsSettings = {};
let graphicsSettingsChanged = false;

let mainJsAudioControls = null;

async function loadMainJsAudioControls() {
    if (typeof window.setMasterVolumeFromMain === 'function') { 
        mainJsAudioControls = {
            setMasterVolume: window.setMasterVolumeFromMain,
            setMusicVolume: window.setMusicVolumeFromMain,
            setSfxVolume: window.setSfxVolumeFromMain,
        };
    } else {
        try {
            const mainModule = await import('../main.js'); 
            if (mainModule && mainModule.setMasterVolume && mainModule.setMusicVolume && mainModule.setSfxVolume) {
                mainJsAudioControls = {
                    setMasterVolume: mainModule.setMasterVolume,
                    setMusicVolume: mainModule.setMusicVolume,
                    setSfxVolume: mainModule.setSfxVolume,
                };
            }
        } catch (error) {
        }
    }
}

function playClick() {
    if (menuClickSound && typeof menuClickSound.play === 'function') {
        if (!menuClickSound.paused) {
            menuClickSound.currentTime = 0; 
        }
        menuClickSound.play().catch(err => {});
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
    if (controlsSettingsDiv) controlsSettingsDiv.style.display = 'block';
    if (graphicsSettingsDiv) graphicsSettingsDiv.style.display = 'none';
    if (audioSettingsDiv) audioSettingsDiv.style.display = 'none'; 
    if (controlsTabButton) controlsTabButton.classList.add('active-tab');
    if (graphicsTabButton) graphicsTabButton.classList.remove('active-tab');
    if (audioTabButton) audioTabButton.classList.remove('active-tab'); 
}

function showGraphicsTab() {
    if (controlsSettingsDiv) controlsSettingsDiv.style.display = 'none';
    if (graphicsSettingsDiv) graphicsSettingsDiv.style.display = 'block';
    if (audioSettingsDiv) audioSettingsDiv.style.display = 'none'; 
    if (controlsTabButton) controlsTabButton.classList.remove('active-tab');
    if (graphicsTabButton) graphicsTabButton.classList.add('active-tab');
    if (audioTabButton) audioTabButton.classList.remove('active-tab'); 
}

function showAudioTab() {
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
    const musicVolumeSetting = parseFloat(localStorage.getItem('musicVolume') || '0.05'); 
    const sfxVolumeSetting = parseFloat(localStorage.getItem('sfxVolume') || '0.1');     

    if (typeof window.applyMainMenuVolumeSettings === 'function') {
        window.applyMainMenuVolumeSettings();
    }
    if (typeof window.playMainMenuMusicIfNeeded === 'function') { 
        window.playMainMenuMusicIfNeeded();
    }

    if (mainJsAudioControls) {
        if (mainJsAudioControls.setMasterVolume) {
            mainJsAudioControls.setMasterVolume(masterVolume);
        }
        if (mainJsAudioControls.setMusicVolume) {
            mainJsAudioControls.setMusicVolume(musicVolumeSetting * masterVolume);
        }
        if (mainJsAudioControls.setSfxVolume) {
            mainJsAudioControls.setSfxVolume(sfxVolumeSetting * masterVolume);
        }
    } else {
        loadMainJsAudioControls().then(() => {
            if (mainJsAudioControls && mainJsAudioControls.setMasterVolume) mainJsAudioControls.setMasterVolume(masterVolume);
            if (mainJsAudioControls && mainJsAudioControls.setMusicVolume) mainJsAudioControls.setMusicVolume(musicVolumeSetting * masterVolume);
            if (mainJsAudioControls && mainJsAudioControls.setSfxVolume) mainJsAudioControls.setSfxVolume(sfxVolumeSetting * masterVolume);
        });
    }

    if (menuClickSound && typeof menuClickSound.volume !== 'undefined') {
        menuClickSound.volume = sfxVolumeSetting * masterVolume;
    }
}

export async function initializeOptionsMenuLogic(menuContainerId = 'optionsMenu', backButtonCallback) {
    optionsMenuElement = document.getElementById(menuContainerId);
    if (!optionsMenuElement) {
        return;
    }

    currentBackButtonCallback = backButtonCallback; 

    movementKeyDisplayButtons = optionsMenuElement.querySelectorAll('#optionsControlsSettings .fixed-keybind-display[data-action]');
    backButton = optionsMenuElement.querySelector('#backToPauseBtn'); 
    
    controlsTabButton = optionsMenuElement.querySelector('#optionsControlsTabButton');
    graphicsTabButton = optionsMenuElement.querySelector('#optionsGraphicsTabButton');
    audioTabButton = optionsMenuElement.querySelector('#optionsAudioTabButton'); 
    
    controlsSettingsDiv = optionsMenuElement.querySelector('#optionsControlsSettings');
    graphicsSettingsDiv = optionsMenuElement.querySelector('#optionsGraphicsSettings');
    audioSettingsDiv = optionsMenuElement.querySelector('#optionsAudioSettings'); 

    antialiasToggleButton = optionsMenuElement.querySelector('#antialiasToggleButton');
    shadowQualityButton = optionsMenuElement.querySelector('#shadowQualityButton'); 
    viewDistanceSelect = optionsMenuElement.querySelector('#viewDistanceSelect');   

    masterVolumeSlider = optionsMenuElement.querySelector('#masterVolumeSlider');
    musicVolumeSlider = optionsMenuElement.querySelector('#musicVolumeSlider');
    sfxVolumeSlider = optionsMenuElement.querySelector('#sfxVolumeSlider');

    try {
        menuClickSound = new Audio('assets/sound/menu_click.mp3'); 
        if (menuClickSound && typeof menuClickSound.volume !== 'undefined') {
            const masterVol = parseFloat(localStorage.getItem('masterVolume') || '0.5');
            const sfxVol = parseFloat(localStorage.getItem('sfxVolume') || '0.1');
            menuClickSound.volume = sfxVol * masterVol;
        }
    } catch (e) {
        menuClickSound = { play: () => {}, pause: () => {}, currentTime: 0 };
    }

    if (controlsTabButton) controlsTabButton.removeEventListener('click', handleControlsTabClick);
    if (graphicsTabButton) graphicsTabButton.removeEventListener('click', handleGraphicsTabClick);
    if (audioTabButton) audioTabButton.removeEventListener('click', handleAudioTabClick); 
    if (antialiasToggleButton) antialiasToggleButton.removeEventListener('click', handleAntialiasToggleClick);
    if (backButton) backButton.removeEventListener('click', handleBackButtonClick);
    if (shadowQualityButton) shadowQualityButton.removeEventListener('click', handleShadowQualityToggleClick); 
    if (viewDistanceSelect) viewDistanceSelect.removeEventListener('change', handleViewDistanceChange);     

    if (masterVolumeSlider) masterVolumeSlider.removeEventListener('input', handleMasterVolumeChange);
    if (musicVolumeSlider) musicVolumeSlider.removeEventListener('input', handleMusicVolumeChange);
    if (sfxVolumeSlider) sfxVolumeSlider.removeEventListener('input', handleSfxVolumeChange);

    if (controlsTabButton) {
        controlsTabButton.addEventListener('click', handleControlsTabClick);
    }

    if (graphicsTabButton) {
        graphicsTabButton.addEventListener('click', handleGraphicsTabClick);
    }

    if (audioTabButton) { 
        audioTabButton.addEventListener('click', handleAudioTabClick);
    }

    if (antialiasToggleButton) {
        antialiasToggleButton.addEventListener('click', handleAntialiasToggleClick);
    }

    if (shadowQualityButton) {
        shadowQualityButton.addEventListener('click', handleShadowQualityToggleClick);
    }

    if (viewDistanceSelect) {
        viewDistanceSelect.addEventListener('change', handleViewDistanceChange);
    }
    
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
    }
    
    await loadMainJsAudioControls(); 

    updateKeybindsDisplay();
    loadAntialiasSetting();
    loadShadowQualitySetting(); 
    loadViewDistanceSetting();  
    loadAudioSettings(); 
    
    showControlsTab(); 

    if (antialiasToggleButton) {
        initialGraphicsSettings.antialiasToggleButton = localStorage.getItem('antialiasEnabled') === 'true';
    }
    if (shadowQualityButton) {
        initialGraphicsSettings.shadowQualityButton = localStorage.getItem('shadowQuality') || 'soft';
    }
    if (viewDistanceSelect) {
        initialGraphicsSettings.viewDistanceSelect = localStorage.getItem('viewDistance') || 'medium';
    }
    graphicsSettingsChanged = false; 
    updateRestartNoteVisibility();
}

function handleControlsTabClick() {
    playClick();
    showControlsTab();
}

function handleGraphicsTabClick() {
    playClick();
    showGraphicsTab();
}

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
        checkGraphicsChange('viewDistanceSelect', newValue);
    }
}

function handleMasterVolumeChange() {
    if (masterVolumeSlider) {
        localStorage.setItem('masterVolume', masterVolumeSlider.value);
        applyAudioSettings(); 
    }
}

function handleMusicVolumeChange() {
    if (musicVolumeSlider) {
        localStorage.setItem('musicVolume', musicVolumeSlider.value);
        applyAudioSettings();
    }
}

function handleSfxVolumeChange() {
    if (sfxVolumeSlider) {
        localStorage.setItem('sfxVolume', sfxVolumeSlider.value);
        applyAudioSettings();
    }
}

function handleBackButtonClick() {
    playClick();
    if (typeof currentBackButtonCallback === 'function') {
        currentBackButtonCallback();
    }
}