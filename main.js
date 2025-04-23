import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import renderer from './renderer.js';
import camera from './camera.js';
import PlayerController from './PlayerController.js';
import { createPlayerBody } from './player.js';
import { setupPauseMenu } from './pauseMenu.js';
import CheckpointManager from './checkpoints.js';
import { createTimer } from './timer.js';

// Inicializa o temporizador
const timer = createTimer();
timer.start();

// Elementos do DOM relacionados ao temporizador
const timerDisplayElement = document.getElementById('timerDisplay');
const finalTimeDisplayElement = document.getElementById('finalTimeDisplay');

if (timerDisplayElement && finalTimeDisplayElement) {
    timerDisplayElement.style.display = 'block';
    timerDisplayElement.textContent = timer.formatTime(0);
    requestAnimationFrame(animate);
} else {
    console.error('Timer elements not found:', timerDisplayElement, finalTimeDisplayElement);
}

// Modelo
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

const playerBody = createPlayerBody();
world.addBody(playerBody);

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

    document.getElementById('levelCompleteMenu').style.display = 'flex';
    document.getElementById('info').style.display = 'none';

    const nextBtn = document.getElementById('nextLevelBtn');
    const restartBtn = document.getElementById('restartLevelBtn');
    const menuBtn = document.getElementById('mainMenuBtn');

    nextBtn.onclick = () => {
        if (currentLevelPath.includes('level_1')) {
            window.location.href = 'level_2.html';
        } else if (currentLevelPath.includes('level_2')) {
            window.location.href = 'level_3.html';
        } else {
            nextBtn.disabled = true;
            nextBtn.textContent = 'Last Level';
            nextBtn.style.cursor = 'not-allowed';
            nextBtn.style.opacity = '0.6';
        }
    };
    restartBtn.onclick = () => { window.location.href = window.location.pathname; };
    menuBtn.onclick = () => { window.location.href = 'index.html'; };
}
// --- End Level Complete Logic ---

// Inicializa o CheckpointManager
const checkpointManager = new CheckpointManager(world, playerBody, handleLevelComplete);
checkpointManager.setInitialCheckpoint(SPAWN_POS);

const playerCtrl = new PlayerController(camera, renderer.domElement, playerBody, world);
checkpointManager.respawnPlayer(camera, playerCtrl, SPAWN_YAW);

// Detecta o nível pelo nome do HTML
let createScene;
const currentLevelPath = window.location.pathname;

if (currentLevelPath.includes('level_1')) {
    ({ createScene } = await import('./scene/scene_1.js'));
} else if (currentLevelPath.includes('level_2')) {
    ({ createScene } = await import('./scene/scene_2.js'));
} else if (currentLevelPath.includes('level_3')) {
    ({ createScene } = await import('./scene/scene_3.js'));
} else {
    ({ createScene } = await import('./scene/scene_0.js')); // Default para Level 0
}

const scene = createScene(world);

// Pause Menu Setup
const isPaused = setupPauseMenu((paused) => {
    if (isLevelComplete) {
        playerCtrl.enabled = false;
        return false;
    }

    if (paused) {
        timer.pause();
        playerCtrl.enabled = false;
        document.getElementById('info').style.display = 'none';
    } else {
        timer.resume();
        playerCtrl.enabled = true;
        document.getElementById('info').style.display = 'block';
    }
    return true;
}, renderer.domElement);

// Loop com fixed‐timestep
const FIXED = 1 / 60;
let last = performance.now(),
    acc = 0,
    lastFpsUpdate = 0,
    frames = 0,
    fps = 0;

function animate(now) {
    requestAnimationFrame(animate);

    const gameIsPaused = typeof isPaused === 'function' ? isPaused() : false;
    const gameShouldUpdate = !gameIsPaused && !isLevelComplete;

    const dt = (now - last) / 1000;
    last = now;
    acc += dt;

    // Atualiza o display do temporizador
    if (timerDisplayElement && gameShouldUpdate) {
        timerDisplayElement.textContent = timer.formatTime(timer.getElapsedTime());
    }

    // FPS counter
    frames++;
    if (now - lastFpsUpdate > 500) { // Atualiza o FPS a cada 500ms
        fps = Math.round((frames * 1000) / (now - lastFpsUpdate));
        lastFpsUpdate = now;
        frames = 0;
        const fpsElement = document.getElementById('fps');
        if (fpsElement) fpsElement.textContent = `FPS: ${fps}`;
    }

    // Speedometer
    if (gameShouldUpdate) {
        const v = playerBody.velocity;
        const speedElement = document.getElementById('speedometer');
        if (speedElement) speedElement.textContent = `Speed: ${Math.sqrt(v.x * v.x + v.z * v.z).toFixed(2)} u/s`;
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