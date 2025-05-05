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
    if (isLevelComplete) return;

    isLevelComplete = true;
    playerCtrl.enabled = false;
    document.exitPointerLock();

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
        if (currentLevelPath.includes('level_1')) {
            window.location.href = 'level_2.html';
        } else if (currentLevelPath.includes('level_2')) {
            window.location.href = 'level_3.html'; // Navigate to level 3 from level 2
        } else if (currentLevelPath.includes('level_3')) { // Add case for level 3
            // Option 1: Go back to main menu
            window.location.href = 'index.html';
            // Option 2: Disable button (as it's the last level for now)
            // nextBtn.disabled = true;
            // nextBtn.textContent = 'Main Menu'; // Or 'Last Level'
            // nextBtn.style.cursor = 'not-allowed';
            // nextBtn.style.opacity = '0.6';
        } else {
            // Fallback or handle unexpected currentLevelPath
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

// Passa o world E o playerBody para o PlayerController
const playerCtrl = new PlayerController(camera, renderer.domElement, playerBody, world);

// guarda p/ restaurar depois (não obrigatório mas aconselhável)
const originalCollisionResponse = playerBody.collisionResponse;

checkpointManager.respawnPlayer(camera, playerCtrl, SPAWN_YAW);

// --- Scene Loading ---
let createLevelScene;
let currentLevelName = window.location.pathname.split('/').pop(); // e.g., "level_1.html"
const currentLevelPath = window.location.pathname; // Keep this for level complete logic

// Importa a função createScene específica do nível
if (currentLevelPath.includes('level_1.html')) {
    ({ createScene: createLevelScene } = await import('./scene/scene_1.js'));
    console.log("Level 1 scene module loaded.");
} else if (currentLevelPath.includes('level_2.html')) {
    ({ createScene: createLevelScene } = await import('./scene/scene_2.js'));
    console.log("Level 2 scene module loaded.");
} else if (currentLevelPath.includes('level_3.html')) { // Ensure this case exists
    ({ createScene: createLevelScene } = await import('./scene/scene_3.js'));
    console.log("Level 3 scene module loaded.");
}
 else {
    console.error("Unknown level HTML file:", currentLevelName);
    // Optionally load a default scene or show an error
    // ({ createScene: createLevelScene } = await import('./scene/scene_1.js')); // Default to level 1?
    // For now, let's throw an error if the level is unknown and not default
    throw new Error(`Unknown level HTML file: ${currentLevelName}`);
}

// Cria a cena, passando o world, checkpointManager E o material para chão/paredes
// Captura a cena e as plataformas móveis
const { scene, movingPlatforms } = createLevelScene(world, checkpointManager, groundWallMaterial); // <--- Modificado

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

// Chame esta função APÓS o resto da inicialização
initializePauseMenu();

// ADICIONE AQUI APÓS todas as inicializações
if (timerDisplayElement && finalTimeDisplayElement) {
    requestAnimationFrame(animate);
}

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

// Loop com fixed‐timestep
const FIXED = 1 / 60;
let last = performance.now(),
    acc = 0,
    lastFpsUpdate = 0,
    frames = 0,
    fps = 0;

function animate(now) {
    requestAnimationFrame(animate);

    const gameIsPaused = typeof isPausedFn === 'function' ? isPausedFn() : false;
    const gameShouldUpdate = !gameIsPaused && !isLevelComplete;

    const dt = (now - last) / 1000;
    last = now;
    acc += dt;

    // --- Atualização das Plataformas Móveis ---
    if (gameShouldUpdate && movingPlatforms) {
        const time = now / 1000; // Tempo em segundos

        movingPlatforms.forEach(platform => {
            const { mesh, body, initialPosition, movement } = platform;
            const { axis, distance, speed, offset = 0, distanceX, distanceZ } = movement;

            let newPos = initialPosition.clone(); // Começa da posição inicial
            let currentVelocity = new CANNON.Vec3(0, 0, 0); // Velocidade instantânea

            const angle = time * speed + offset;
            const displacement = Math.sin(angle) * distance;
            const velocityFactor = Math.cos(angle) * speed * distance; // Derivada do sin(time*speed)*distance

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
                // Movimento diagonal/circular (exemplo simples com seno)
                const displacementX = Math.sin(angle) * (distanceX || distance); // Usa distanceX ou distance
                const displacementZ = Math.cos(angle) * (distanceZ || distance); // Usa distanceZ ou distance (pode ser elíptico)
                const velocityX = Math.cos(angle) * speed * (distanceX || distance);
                const velocityZ = -Math.sin(angle) * speed * (distanceZ || distance);

                newPos.x += displacementX;
                newPos.z += displacementZ;
                currentVelocity.x = velocityX;
                currentVelocity.z = velocityZ;
            }

            // Atualiza a posição do Mesh (Three.js)
            mesh.position.copy(newPos);

            // Atualiza a posição E a velocidade do Body (Cannon.js)
            // É importante atualizar a velocidade para que corpos KINEMATIC empurrem corretamente
            body.position.copy(newPos);
            body.velocity.copy(currentVelocity);
        });
    }
    // --- Fim da Atualização das Plataformas Móveis ---


    // Atualiza o display do temporizador (só se estiver visível)
    if (timerDisplayElement && gameShouldUpdate && isUiVisible) {
        timerDisplayElement.textContent = timer.formatTime(timer.getElapsedTime());
    }

    // FPS counter (só atualiza o texto se estiver visível)
    frames++;
    if (now - lastFpsUpdate > 500) { // Atualiza o FPS a cada 500ms
        fps = Math.round((frames * 1000) / (now - lastFpsUpdate));
        lastFpsUpdate = now;
        frames = 0;
        const fpsElement = document.getElementById('fps');
        if (fpsElement && isUiVisible) fpsElement.textContent = `FPS: ${fps}`; // Verifica isUiVisible
    }

    // Speedometer (agora chama a função separada)
    if (gameShouldUpdate && isUiVisible) {
        updateSpeedometer();
    } else if (isUiVisible) {
        // Se a UI está visível mas o jogo não está a atualizar (ex: completo), mostra speed 0
        const speedElement = document.getElementById('speedometer');
        if (speedElement) speedElement.textContent = 'Speed: 0.00 u/s';
    }

    // Physics and Controls Update
    while (acc >= FIXED) {
        if (gameShouldUpdate) {
            // O world.step usa as posições/velocidades atualizadas dos corpos KINEMATIC
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