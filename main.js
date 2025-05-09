console.log("MAIN.JS EXECUTADO:", new Date().toISOString());
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import renderer from './renderer.js';
import camera from './camera.js';
import PlayerController from './PlayerController.js';
import { createPlayerBody } from './player.js';
import { setupPauseMenu } from './pauseMenu.js';
import CheckpointManager from './checkpoints.js';
import { createTimer } from './timer.js';
import { GROUP_PLAYER, GROUP_GROUND, GROUP_CHECKPOINT_TRIGGER } from './collisionGroups.js';
import { playMenuClickSound } from './utils/audioUtils.js'; // <-- Importa a função

let currentLevelPath; 
let currentLevelAudioContext = null; 
let currentLevelBackgroundSound = null; 
let currentRainParticles = null; 
let currentRainHeight = 30; // Valor padrão, será atualizado pelo nível
let currentRainSpreadX = 50; // Valor padrão, será atualizado pelo nível
let currentRainSpreadZ = 50; // Valor padrão, será atualizado pelo nível

// --- Definição da Cena Principal ---
const scene = new THREE.Scene(); // Defina a cena principal AQUI, antes de tudo

// --- Level Complete Sound (declarado uma vez) ---
const levelCompleteSound = new Audio('assets/sound/GAME_OVER.mp3');
levelCompleteSound.volume = 0.1; // Define o volume para 50% (ajuste conforme necessário)
levelCompleteSound.load();
// ---

// ajuste inicial de pixel ratio
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Responsividade: redimensiona renderer + camera
window.addEventListener('resize', onWindowResize);
function onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}

// Inicializa o temporizador
const timer = createTimer();
timer.start();

// Elementos do DOM relacionados à UI
const timerDisplayElement = document.getElementById('timerDisplay');
const finalTimeDisplayElement = document.getElementById('finalTimeDisplay');
const infoElement = document.getElementById('info'); // Obter referência ao elemento info
const noclipIndicator = document.getElementById('noclipIndicator'); // Referência ao indicador de noclip

// Estado de visibilidade da UI
let isUiVisible = true;

if (timerDisplayElement && finalTimeDisplayElement && infoElement && noclipIndicator) {
    timerDisplayElement.style.display = 'block';
    infoElement.style.display = 'block'; // Certificar que info está visível inicialmente
    noclipIndicator.style.display = 'none'; // Certificar que noclipIndicator está escondido inicialmente
    timerDisplayElement.textContent = timer.formatTime(0);
} else {
    console.error('UI elements not found:', timerDisplayElement, finalTimeDisplayElement, infoElement, noclipIndicator);
}

// Modelo
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

// --- Materiais Físicos ---
// Material para o jogador (sem atrito específico aqui, mas pode ter nome)
const playerMaterial = new CANNON.Material("playerMaterial");
// Material para as paredes/chão (pode ser o mesmo ou diferente)
const groundWallMaterial = new CANNON.Material("groundWallMaterial");

// --- Material de Contacto Jogador vs Chão/Paredes ---
// Define como o jogador interage com o chão/paredes
const playerGroundContactMaterial = new CANNON.ContactMaterial(
    playerMaterial,      // Material do jogador
    groundWallMaterial,  // Material do chão/paredes
    {
        friction: 0.0,  // <--- ATRITO ZERO para deslizar
        restitution: 0.0 // Sem ressalto (bounce)
    }
);
// Adiciona a definição de contacto ao mundo
world.addContactMaterial(playerGroundContactMaterial);
// -------------------------

// Passa o material para a função que cria o corpo do jogador
const playerBody = createPlayerBody(playerMaterial);
// Adiciona uma propriedade para guardar a normal da parede (se houver)
playerBody.wallContactNormal = null;
world.addBody(playerBody);

// Listener de colisão para o jogador
playerBody.addEventListener('collide', (event) => {
    const contact = event.contact;
    const contactNormal = contact.ni; // Normal de contacto no corpo do JOGADOR

    // Verifica se é uma colisão lateral (parede)
    // Se o componente Y da normal for pequeno (perto de 0), é uma colisão mais horizontal/vertical
    if (Math.abs(contactNormal.y) < 0.5) { // Ajusta este valor (0.5) se necessário
        // Verifica se a colisão é CONTRA o jogador (normal aponta para fora do outro objeto)
        // Se o corpo B for o jogador, usamos ni. Se o corpo A for o jogador, usamos -ni (ou bj.position - bi.position)
        // Vamos assumir que ni está correto para o corpo do jogador por agora.
        playerBody.wallContactNormal = contactNormal.clone(); // Guarda a normal da parede
    }

    // Poderíamos também verificar se o outro corpo pertence ao GROUP_GROUND aqui,
    // mas a verificação da normal Y já filtra a maioria dos casos de chão.
});

const SPAWN_POS = new CANNON.Vec3(0, 5, 0);
const SPAWN_YAW = Math.PI;

// --- Level Complete Logic ---
let isLevelComplete = false;

function handleLevelComplete() {
    if (isLevelComplete) {
        return;
    }

    isLevelComplete = true;
    playerCtrl.enabled = false;
    document.exitPointerLock();

    // Play the preloaded level complete sound
    if (levelCompleteSound.paused) {
        levelCompleteSound.currentTime = 0; // Garante que o som começa do início
        levelCompleteSound.play().catch(e => console.error("Error playing level complete sound:", e));
    } else {
        levelCompleteSound.currentTime = 0; // Reinicia e toca
        levelCompleteSound.play().catch(e => console.error("Error re-playing level complete sound:", e));
    }

    const finalElapsedTime = timer.getElapsedTime();
    const finalTimeFormatted = timer.formatTime(finalElapsedTime);

    if (finalTimeDisplayElement) {
        finalTimeDisplayElement.textContent = `Time: ${finalTimeFormatted}`;
    }

    if (timerDisplayElement) {
        timerDisplayElement.style.display = 'none';
    }
    if (infoElement) { // Esconder info ao completar nível
        infoElement.style.display = 'none';
    }
    if (noclipIndicator) { // Esconder noclipIndicator ao completar nível
        noclipIndicator.style.display = 'none';
    }

    document.getElementById('levelCompleteMenu').style.display = 'flex';

    const nextBtn = document.getElementById('nextLevelBtn');
    const restartBtn = document.getElementById('restartLevelBtn');
    const menuBtn = document.getElementById('mainMenuBtn');

    // Adiciona som aos cliques dos botões
    nextBtn.onclick = () => {
        playMenuClickSound(); // <-- Adiciona som
        if (currentLevelPath && currentLevelPath.includes('level_1.html')) {
            window.location.href = 'level_2.html';
        } else if (currentLevelPath && currentLevelPath.includes('level_2.html')) {
            window.location.href = 'level_3.html'; // Navigate to level 3 from level 2
        } else if (currentLevelPath && currentLevelPath.includes('level_3.html')) { // Add case for level 3
            window.location.href = 'index.html';
        } else {
            // Fallback or handle unexpected currentLevelPath
             console.warn('Could not determine next level from path:', currentLevelPath, 'Navigating to main menu.');
             window.location.href = 'index.html';
        }
    };
    restartBtn.onclick = () => {
        playMenuClickSound(); // <-- Adiciona som
        window.location.href = window.location.pathname;
    };
    menuBtn.onclick = () => {
        playMenuClickSound(); // <-- Adiciona som
        window.location.href = 'index.html';
    };
}
// --- End Level Complete Logic ---

// Inicializa o CheckpointManager
const checkpointManager = new CheckpointManager(world, playerBody, handleLevelComplete);
checkpointManager.setInitialCheckpoint(SPAWN_POS);

// Passa o world, playerBody, e as opções incluindo checkpointManager e spawnYaw para o PlayerController
const playerCtrl = new PlayerController(camera, renderer.domElement, playerBody, world, {
    checkpointManager: checkpointManager,
    spawnYaw: SPAWN_YAW
    // pode adicionar outras opções aqui se necessário, ex: speed: 5
});

// guarda p/ restaurar depois (não obrigatório mas aconselhável)
const originalCollisionResponse = playerBody.collisionResponse;

checkpointManager.respawnPlayer(camera, playerCtrl, SPAWN_YAW);

// --- Variáveis Globais para Conteúdo do Nível ---
let gameMovingPlatforms = [];
let gameMovingLightData = null;
let gameSequencedSpotlights = []; // Luzes sequência 1->2 (ordenada)
let gameRandomSpotlights = [];    // Luzes sequência 2->Fim (ordem aleatória)
const clock = new THREE.Clock();

// Pause Menu Setup
let isPausedFn = () => false; // Função padrão segura

// Função para inicializar o menu de pausa após tudo estar carregado
function initializePauseMenu() {
    isPausedFn = setupPauseMenu((paused) => {
        if (isLevelComplete) {
            playerCtrl.enabled = false;
            return false;
        }

        if (paused) {
            timer.pause();
            playerCtrl.enabled = false;
            // Esconder UI ao pausar
            if (timerDisplayElement) timerDisplayElement.style.display = 'none';
            if (infoElement) infoElement.style.display = 'none';
            if (noclipIndicator) noclipIndicator.style.display = 'none';
        } else {
            timer.resume();
            playerCtrl.enabled = true;
            // Mostrar UI ao resumir, mas apenas se isUiVisible for true
            if (timerDisplayElement) timerDisplayElement.style.display = isUiVisible ? 'block' : 'none';
            if (infoElement) infoElement.style.display = isUiVisible ? 'block' : 'none';
            if (noclipIndicator) {
                noclipIndicator.style.display = (isUiVisible && playerCtrl.noclip) ? 'block' : 'none';
            }
        }
        return true;
    }, renderer.domElement);
}

// --- Scene Loading (Dentro de uma função async auto-invocada) ---
(async () => {
    let createLevelScene;
    let currentLevelName = window.location.pathname.split('/').pop();
    currentLevelPath = window.location.pathname; // Atribuir à variável de escopo superior

    try {
        if (currentLevelPath.includes('level_1.html')) {
            ({ createScene: createLevelScene } = await import('./scene/scene_1.js'));
        } else if (currentLevelPath.includes('level_2.html')) {
            ({ createScene: createLevelScene } = await import('./scene/scene_2.js'));
        } else if (currentLevelPath.includes('level_3.html')) {
            ({ createScene: createLevelScene } = await import('./scene/scene_3.js'));
            console.log("Level 3 scene module loaded.");
        } else {
            throw new Error(`Unknown level HTML file: ${currentLevelName}`);
        }

        // Usa await para esperar que createLevelScene (que pode ser async) termine
        // ***** CORREÇÃO AQUI: Passe o objeto 'camera' *****
        const { 
            scene: levelScene, 
            movingPlatforms, 
            movingLightData, 
            sequencedSpotlights, 
            randomSpotlights,
            backgroundSound: levelBackgroundSound, // Renomeie para evitar conflito com a variável global
            audioListener: levelAudioListener,     // Renomeie para evitar conflito
            rainParticles: levelRainParticles, // Certifique-se de obter isto
            rainHeight: levelRainHeight, // Altura da chuva
            rainSpreadX: levelRainSpreadX, // Spread X da chuva
            rainSpreadZ: levelRainSpreadZ // Spread Z da chuva
        } = await createLevelScene(world, checkpointManager, groundWallMaterial, camera); // <--- PASSE A 'camera' AQUI

        currentRainParticles = levelRainParticles; // Atribua à variável global
        currentRainHeight = levelRainHeight || 30; // Atualiza altura da chuva
        currentRainSpreadX = levelRainSpreadX || 50; // Atualiza spread X
        currentRainSpreadZ = levelRainSpreadZ || 50; // Atualiza spread Z

        // Agora, levelScene já deve ter background e environment definidos pelo HDRI

        // Copia o fundo e ambiente (como antes, mas agora deve funcionar)
        if (levelScene.background) {
            scene.background = levelScene.background;
        } else {
            scene.background = new THREE.Color(0x000000);
        }
        if (levelScene.environment) {
            scene.environment = levelScene.environment;
        } else {
            scene.environment = null;
        }
        // Copia também a intensidade do ambiente, se definida
        if (levelScene.environmentIntensity !== undefined) {
             scene.environmentIntensity = levelScene.environmentIntensity;
        }

        // Adiciona o conteúdo (objetos filhos) da cena do nível à cena principal
        if (levelScene && levelScene.children) {
            const childrenToAdd = [...levelScene.children]; // Copia a lista de filhos
            childrenToAdd.forEach(child => {
                scene.add(child); // Adiciona cada filho à cena principal
            });
        } else {
            console.error("levelScene or its children are undefined after loading level.");
        }

        // Guarda os dados das plataformas, luz móvel E AMBAS as sequências de luzes
        gameMovingPlatforms = Array.isArray(movingPlatforms) ? movingPlatforms : [];
        gameMovingLightData = movingLightData;
        gameSequencedSpotlights = Array.isArray(sequencedSpotlights) ? sequencedSpotlights : [];
        gameRandomSpotlights = Array.isArray(randomSpotlights) ? randomSpotlights : []; // Guarda as luzes aleatórias
        console.log("Moving light data for this level:", gameMovingLightData);
        console.log("Sequenced spotlights:", gameSequencedSpotlights);
        console.log("Random spotlights:", gameRandomSpotlights); // Log das luzes aleatórias

        // Guarda a referência ao som de fundo e ao listener
        currentLevelBackgroundSound = levelBackgroundSound; // Use a variável renomeada
        if (levelAudioListener) { // Use a variável renomeada
            currentLevelAudioContext = levelAudioListener.context;
        }

        // Guarda as partículas de chuva e suas propriedades
        if (currentRainParticles) {
            console.log("Partículas de chuva carregadas para o nível.");
        }

        // Inicializa o menu de pausa e o loop de animação
        initializePauseMenu();
        requestAnimationFrame(animate);

    } catch (error) {
        console.error("Error loading or setting up level scene:", error);
    }
})();

// --- Event Listeners (UI, Noclip, Checkpoint Opacity) ---
window.addEventListener('keydown', (event) => {
    const gameIsPaused = typeof isPausedFn === 'function' ? isPausedFn() : false;
    if (gameIsPaused || isLevelComplete) return; // Ignora inputs se pausado ou completo

    // Toggle UI com '1'
    if (event.key === '1') {
        isUiVisible = !isUiVisible;
        // Atualiza a visibilidade dos elementos da UI
        if (timerDisplayElement) {
            timerDisplayElement.style.display = isUiVisible ? 'block' : 'none';
        }
        if (infoElement) {
            infoElement.style.display = isUiVisible ? 'block' : 'none';
        }
        if (noclipIndicator) {
            noclipIndicator.style.display = (isUiVisible && playerCtrl.noclip) ? 'block' : 'none';
        }
    }

    // Toggle Noclip com '2'
    if (event.key === '2') {
        const noclipOn = playerCtrl.toggleNoclip();
        playerBody.collisionResponse = !noclipOn;
        if (noclipIndicator) {
            noclipIndicator.textContent = noclipOn ? 'Noclip ON' : '';
            // Mostra/esconde baseado no estado do noclip E da visibilidade da UI
            noclipIndicator.style.display = (isUiVisible && noclipOn) ? 'block' : 'none';
        }
        // Atualiza speedometer imediatamente
        updateSpeedometer(); // Chama a função que atualiza o speedo
    }

    // Toggle Checkpoint Opacity com '3'
    if (event.key === '3') {
        checkpointManager.toggleCheckpointOpacity();
    }
});
// --- End Event Listeners ---

// Exemplo de como poderia ser integrado com o clique no DOM para o pointer lock
renderer.domElement.addEventListener('click', () => {
    if (currentLevelAudioContext && currentLevelAudioContext.state === 'suspended') {
        currentLevelAudioContext.resume().then(() => {
            console.log("AudioContext resumido após interação.");
            if (currentLevelBackgroundSound && !currentLevelBackgroundSound.isPlaying) {
                currentLevelBackgroundSound.play();
                console.log("Tentando tocar música de fundo após resumir AudioContext.");
            }
        });
    } else if (currentLevelBackgroundSound && !currentLevelBackgroundSound.isPlaying) {
        currentLevelBackgroundSound.play();
        console.log("Tentando tocar música de fundo (AudioContext já estava a correr).");
    }
});

// Função separada para atualizar o velocímetro (para reutilização)
function updateSpeedometer() {
    const speedElement = document.getElementById('speedometer');
    if (!speedElement || !isUiVisible) return; // Só atualiza se o elemento existe e a UI está visível

    let speedText = 'Speed: ...';
    if (playerCtrl && playerBody) { // Garante que playerCtrl e playerBody existem
         let speedValue;
         if (playerCtrl.noclip) {
             speedValue = (playerCtrl._lastNoclipSpeed || 0);
         } else {
             const v = playerBody.velocity;
             speedValue = Math.sqrt(v.x * v.x + v.z * v.z);
         }
         speedText = `Speed: ${speedValue.toFixed(2)} u/s`;
    }
    speedElement.textContent = speedText;
}

// Dentro da sua função de inicialização de nível, por exemplo loadLevel:
async function loadLevel(levelPath) {
    if (currentLevelBackgroundSound && currentLevelBackgroundSound.isPlaying) {
        currentLevelBackgroundSound.stop(); // Para o som do nível anterior
    }
    currentLevelBackgroundSound = null;
    currentLevelAudioContext = null;
    if (currentRainParticles) { 
        if (currentRainParticles.parent) { // Verifica se ainda está na cena
            currentRainParticles.parent.remove(currentRainParticles);
        }
        currentRainParticles.geometry.dispose();
        currentRainParticles.material.dispose();
        currentRainParticles = null;
    }
    try {
        const sceneModule = await import(levelPath);
        if (sceneModule && sceneModule.createScene) {
            const levelData = await sceneModule.createScene(world, checkpointManager, groundWallMaterial, camera);
            scene.add(levelData.scene);
            
            currentLevelBackgroundSound = levelData.backgroundSound;
            if (levelData.audioListener) {
                currentLevelAudioContext = levelData.audioListener.context;
            }

            currentRainParticles = levelData.rainParticles;
            if (currentRainParticles) {
                currentRainHeight = levelData.rainHeight || 30; 
                currentRainSpreadX = levelData.rainSpreadX || 50;
                currentRainSpreadZ = levelData.rainSpreadZ || 50;
                console.log("Partículas de chuva carregadas para o nível.");
            }
        }
    } catch (error) {
        console.error("Error loading level:", error);
    }
}

// Loop com fixed‐timestep
const FIXED = 1 / 60;
let last = performance.now(),
    acc = 0,
    lastFpsUpdate = 0,
    frames = 0,
    fps = 0;

// Variáveis para controlar a sequência de luzes ORDENADA
const sequenceInterval = 0.6; // Intervalo entre luzes para AMBAS as sequências
let lastSequenceUpdateTime = 0;
let currentSequenceIndex = -1;

// Variáveis para controlar a sequência de ORDEM ALEATÓRIA
let lastRandomSequenceUpdateTime = 0; // Tempo da última atualização da sequência aleatória
let currentRandomIndex = -1;          // Índice da luz atualmente acesa na sequência aleatória

let time = 0; // Variável para controlar a animação da cor

function animate(now) {
    requestAnimationFrame(animate);

    const gameIsPaused = typeof isPausedFn === 'function' ? isPausedFn() : false;
    const gameShouldUpdate = !gameIsPaused && !isLevelComplete;

    const dt = (now - last) / 1000;
    time = now; // 'time' já está sendo usado para a cor da movingLight
    const elapsedTime = clock.getElapsedTime(); 
    last = now;
    acc += dt;

    let currentHue, saturation, lightness; // Declarar aqui para acesso em múltiplos blocos

    // --- Atualização da Luz Móvel (com caminho) ---
    if (gameShouldUpdate && gameMovingLightData) {
        const { light, pathPoints, speed } = gameMovingLightData;

        if (pathPoints && pathPoints.length >= 2) {
            const firstPoint = pathPoints[0]; 
            const lastPoint = pathPoints[pathPoints.length - 1]; 
            const totalZLength = lastPoint.z - firstPoint.z;
            const normalizedPosition = (Math.sin(elapsedTime * speed) + 1) / 2; 
            const currentZ = lastPoint.z - normalizedPosition * totalZLength;
            let p1 = firstPoint;
            let p2 = lastPoint;
            for (let i = 0; i < pathPoints.length - 1; i++) {
                if (currentZ <= pathPoints[i + 1].z && currentZ >= pathPoints[i].z) {
                     p1 = pathPoints[i];
                     p2 = pathPoints[i + 1];
                     break;
                 } else if (i === 0 && currentZ < pathPoints[i].z) {
                     p1 = pathPoints[i];
                     p2 = pathPoints[i];
                     break;
                 }
            }
            let currentX = p1.x;
            const segmentZLength = p2.z - p1.z;
            if (segmentZLength > 0.001) {
                const t = (currentZ - p1.z) / segmentZLength;
                currentX = p1.x + t * (p2.x - p1.x);
            } else {
                 currentX = p1.x;
            }
            light.position.z = currentZ;
            light.position.x = currentX;

            // Lógica para mudar a cor da luz (calculada aqui para ser usada por todas as luzes)
            const hueSpeed = 0.1; 
            saturation = 1.0; 
            lightness = 0.5;  
            currentHue = ((time / 1000) * hueSpeed) % 1; 

            light.color.setHSL(currentHue, saturation, lightness);

            if (gameMovingLightData.visual && gameMovingLightData.visual.material) {
                gameMovingLightData.visual.material.color.setHSL(currentHue, saturation, lightness);
                if (gameMovingLightData.visual.material.emissive) {
                    gameMovingLightData.visual.material.emissive.setHSL(currentHue, saturation, lightness);
                }
            }
        }
    }
    // --- Fim da Atualização da Luz Móvel ---

    // --- Lógica da Sequência de Luzes ORDENADA (1->2) ---
    if (gameShouldUpdate && gameSequencedSpotlights.length > 0) {
        if (elapsedTime - lastSequenceUpdateTime >= sequenceInterval) {
            if (currentSequenceIndex >= 0) {
                gameSequencedSpotlights[currentSequenceIndex].visible = false;
            }
            currentSequenceIndex = (currentSequenceIndex + 1) % gameSequencedSpotlights.length;
            const activeLight = gameSequencedSpotlights[currentSequenceIndex];
            activeLight.visible = true;
            // Aplicar a cor atual do ciclo HSL
            if (currentHue !== undefined) { // Garante que currentHue foi calculado
                 activeLight.color.setHSL(currentHue, saturation, lightness);
            }
            lastSequenceUpdateTime = elapsedTime;
        }
    }
    // --- Fim Lógica da Sequência Ordenada ---

    // --- Lógica da Sequência de ORDEM ALEATÓRIA (2->Fim) ---
    if (gameShouldUpdate && gameRandomSpotlights.length > 0) {
        if (elapsedTime - lastRandomSequenceUpdateTime >= sequenceInterval) {
            if (currentRandomIndex >= 0) {
                gameRandomSpotlights[currentRandomIndex].visible = false;
            }
            let nextRandomIndex;
            if (gameRandomSpotlights.length === 1) {
                nextRandomIndex = 0; 
            } else {
                do {
                    nextRandomIndex = Math.floor(Math.random() * gameRandomSpotlights.length);
                } while (nextRandomIndex === currentRandomIndex); 
            }
            const activeLight = gameRandomSpotlights[nextRandomIndex];
            activeLight.visible = true;
            // Aplicar a cor atual do ciclo HSL
            if (currentHue !== undefined) { // Garante que currentHue foi calculado
                activeLight.color.setHSL(currentHue, saturation, lightness);
            }
            currentRandomIndex = nextRandomIndex;
            lastRandomSequenceUpdateTime = elapsedTime;
        }
    }
    // --- Fim Lógica da Sequência de Ordem Aleatória ---

    // --- Atualização das Plataformas Móveis ---
    if (gameShouldUpdate && gameMovingPlatforms) {
        gameMovingPlatforms.forEach(platform => {
            const { mesh, body, initialPosition, movement } = platform;
            const { axis, distance, speed: platformSpeed, offset = 0, distanceX, distanceZ } = movement;

            let newPos = initialPosition.clone();
            let currentVelocity = new CANNON.Vec3(0, 0, 0);

            const angle = elapsedTime * platformSpeed + offset;
            const displacement = Math.sin(angle) * distance;
            const velocityFactor = Math.cos(angle) * platformSpeed * distance;

            if (axis === 'x') {
                newPos.x += displacement;
                currentVelocity.x = velocityFactor;
            } else if (axis === 'y') {
                newPos.y += displacement;
                currentVelocity.y = velocityFactor;
            } else if (axis === 'z') {
                newPos.z += displacement;
                currentVelocity.z = velocityFactor;
            } else if (axis === 'xz') {
                const displacementX = Math.sin(angle) * (distanceX || distance);
                const displacementZ = Math.cos(angle) * (distanceZ || distance);
                const velocityX = Math.cos(angle) * platformSpeed * (distanceX || distance);
                const velocityZ = -Math.sin(angle) * platformSpeed * (distanceZ || distance);

                newPos.x += displacementX;
                newPos.z += displacementZ;
                currentVelocity.x = velocityX;
                currentVelocity.z = velocityZ;
            }

            mesh.position.copy(newPos);
            body.position.copy(newPos);
            body.velocity.copy(currentVelocity);
        });
    }
    // --- Fim da Atualização das Plataformas Móveis ---

    // --- Animação da Chuva ---
    // Verifica se currentRainParticles e playerBody (o corpo físico direto) existem
    if (currentRainParticles && playerBody) { 
        const positions = currentRainParticles.geometry.attributes.position.array;
        const rainSpeed = 25; // Pode ajustar a velocidade da chuva
        const playerPosition = playerBody.position; // Posição do corpo físico do jogador (usando playerBody diretamente)

        for (let i = 0; i < positions.length; i += 3) {
            // Mover partícula para baixo
            positions[i + 1] -= rainSpeed * dt;

            // Se a gota atingir uma certa distância abaixo do jogador, reposiciona-a
            // O limite inferior (playerPosition.y - 15) garante que a chuva desaparece abaixo da vista
            if (positions[i + 1] < playerPosition.y - 15) { 
                // Reposiciona Y acima da cabeça do jogador
                // currentRainHeight é a altura da "caixa de chuva" acima do jogador
                positions[i + 1] = playerPosition.y + currentRainHeight + (Math.random() * 10 - 5); // Adiciona uma pequena variação vertical

                // Reposiciona X e Z ao redor da posição atual do jogador
                positions[i] = playerPosition.x + (Math.random() * currentRainSpreadX - currentRainSpreadX / 2);
                positions[i + 2] = playerPosition.z + (Math.random() * currentRainSpreadZ - currentRainSpreadZ / 2);
            }
        }
        currentRainParticles.geometry.attributes.position.needsUpdate = true;
    }
    // --- Fim Animação da Chuva ---

    // Atualiza o display do temporizador (só se estiver visível)
    if (timerDisplayElement && gameShouldUpdate && isUiVisible) {
        timerDisplayElement.textContent = timer.formatTime(timer.getElapsedTime());
    }

    // FPS counter (só atualiza o texto se estiver visível)
    frames++;
    if (now - lastFpsUpdate > 500) {
        fps = Math.round((frames * 1000) / (now - lastFpsUpdate));
        lastFpsUpdate = now;
        frames = 0;
        const fpsElement = document.getElementById('fps');
        if (fpsElement && isUiVisible) fpsElement.textContent = `FPS: ${fps}`;
    }

    // Speedometer (agora chama a função separada)
    if (gameShouldUpdate && isUiVisible) {
        updateSpeedometer();
    } else if (isUiVisible) {
        const speedElement = document.getElementById('speedometer');
        if (speedElement) speedElement.textContent = 'Speed: 0.00 u/s';
    }

    // Physics and Controls Update
    while (acc >= FIXED) {
        if (gameShouldUpdate) {
            world.step(FIXED);
            playerCtrl.fixedUpdate(FIXED);
            if (playerBody.position.y < -10) checkpointManager.respawnPlayer(camera, playerCtrl, SPAWN_YAW);
        }
        acc -= FIXED;
    }

    // Renderiza a cena
    renderer.render(scene, camera);
}

// Inicia o loop
if (timerDisplayElement && finalTimeDisplayElement) {
    requestAnimationFrame(animate);
}