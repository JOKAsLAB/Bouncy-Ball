import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import renderer from './renderer.js'
import camera from './camera.js'
import PlayerController from './PlayerController.js'
import { createPlayerBody } from './player.js'
import { setupPauseMenu } from './pauseMenu.js'
import CheckpointManager from './checkpoints.js';

// --- Timer Variables ---
let startTime = 0;
let totalPausedTime = 0;
let pauseStartTime = null;
let finalTimeFormatted = null;
let timerDisplayElement = document.getElementById('timerDisplay');
let finalTimeDisplayElement = document.getElementById('finalTimeDisplay');
// --- End Timer Variables ---

// Se os elementos já existirem (o script está no fim do body), mostramos o timer:
if (timerDisplayElement && finalTimeDisplayElement) {
    startTime = performance.now();
    totalPausedTime = 0;
    pauseStartTime = null;
    timerDisplayElement.style.display = 'block';
    timerDisplayElement.textContent = formatTime(0);
    requestAnimationFrame(animate);
} else {
    console.error('Timer elements not found:', timerDisplayElement, finalTimeDisplayElement);
}

// Modelo
const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)
// … monte materiais e groundBody aqui …

const playerBody = createPlayerBody();
world.addBody(playerBody);

const SPAWN_POS = new CANNON.Vec3(0, 5, 0);
const SPAWN_YAW = Math.PI;

// --- Level Complete Logic ---
let isLevelComplete = false; // Game state flag

function handleLevelComplete() {
    if (isLevelComplete) return; // Prevent multiple triggers

    isLevelComplete = true;
    playerCtrl.enabled = false; // Disable player controls
    document.exitPointerLock(); // Release mouse lock

    // Calculate and format final time
    const finalElapsedTime = performance.now() - startTime - totalPausedTime;
    finalTimeFormatted = formatTime(finalElapsedTime);

    // Display final time in the menu
    if (finalTimeDisplayElement) {
        finalTimeDisplayElement.textContent = `Time: ${finalTimeFormatted}`;
    } else {
        console.warn("finalTimeDisplayElement not found!"); // Debugging
    }
    // Hide running timer
    if (timerDisplayElement) {
        timerDisplayElement.style.display = 'none';
    } else {
        console.warn("timerDisplayElement not found!"); // Debugging
    }

    // Show level complete menu
    document.getElementById('levelCompleteMenu').style.display = 'flex';
    document.getElementById('info').style.display = 'none'; // Hide HUD

    // Setup button actions
    const nextBtn = document.getElementById('nextLevelBtn');
    const restartBtn = document.getElementById('restartLevelBtn');
    const menuBtn = document.getElementById('mainMenuBtn');

    nextBtn.onclick = () => { window.location.href = 'level_1.html'; };
    restartBtn.onclick = () => { window.location.href = window.location.pathname; };
    menuBtn.onclick = () => { window.location.href = 'index.html'; };

    if (window.location.pathname.includes('level_1')) {
         if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.textContent = "Last Level";
            nextBtn.style.cursor = 'not-allowed';
            nextBtn.style.opacity = '0.6';
         }
    }
}
// --- End Level Complete Logic ---

// Initialize CheckpointManager with the callback
const checkpointManager = new CheckpointManager(world, playerBody, handleLevelComplete);
checkpointManager.setInitialCheckpoint(SPAWN_POS);

function respawnPlayer() {
    const lastCheckpoint = checkpointManager.getLastCheckpoint();
    let respawnPos;
    if (!lastCheckpoint) {
        console.warn('No checkpoint hit yet! Respawning at initial position.');
        respawnPos = SPAWN_POS; // Fallback to initial spawn
    } else {
        respawnPos = lastCheckpoint;
    }

    playerBody.position.copy(respawnPos);
    playerBody.position.y += 1.0;
    playerBody.velocity.set(0, 0, 0);
    playerBody.angularVelocity.set(0, 0, 0);

    camera.position.copy(new THREE.Vector3(playerBody.position.x, playerBody.position.y, playerBody.position.z));
    playerCtrl.yaw = SPAWN_YAW;
    playerCtrl.pitch = 0;
    camera.quaternion.setFromEuler(new THREE.Euler(playerCtrl.pitch, playerCtrl.yaw, 0, 'YXZ'));

    playerCtrl.canJump = false;
    playerCtrl.wasOnGround = false;
    // Timer does not reset on respawn
}

// Presenter
const playerCtrl = new PlayerController(camera, renderer.domElement, playerBody, world)
respawnPlayer() // Initial spawn

// Detecta o nível pelo nome do HTML
let createScene;
const currentLevelPath = window.location.pathname;
if (currentLevelPath.includes('level_1')) {
    ({ createScene } = await import('./scene/scene_1.js'));
} else {
    ({ createScene } = await import('./scene/scene_0.js'));
}

// View: crie a cena UMA única vez
const scene = createScene(world);

// Pause Menu Setup
const isPaused = setupPauseMenu(paused => {
    if (isLevelComplete) {
        playerCtrl.enabled = false;
        // Don't mess with pause timer if level is complete
        return false; // Don't allow pause state change
    }

    if (paused) {
        // --- Pause Timer ---
        if (pauseStartTime === null && startTime !== 0) { // Only pause if timer has started
             pauseStartTime = performance.now();
        }
        // --- End Pause Timer ---
        playerCtrl.enabled = false;
        document.getElementById('info').style.display = 'none';
    } else {
        // --- Resume Timer ---
        if (pauseStartTime !== null) {
            totalPausedTime += performance.now() - pauseStartTime;
            pauseStartTime = null; // Reset pause start time
        }
        // --- End Resume Timer ---
        playerCtrl.enabled = true;
        document.getElementById('info').style.display = 'block';
    }
    return true; // Allow pause state change if level not complete
}, renderer.domElement);

// Helper function to format time (MM:SS:ms)
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor(milliseconds % 1000);

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(ms).padStart(3, '0')}`;
}

// Loop com fixed‐timestep
const FIXED = 1 / 60;
let last = performance.now(),
    acc = 0;
let lastFpsUpdate = 0,
    frames = 0,
    fps = 0;

function animate(now) {
    requestAnimationFrame(animate); // Request next frame immediately

    // Determine if the game logic should update
    // Check if isPaused() exists before calling it, in case setupPauseMenu hasn't finished
    const gameIsPaused = typeof isPaused === 'function' ? isPaused() : false;
    const gameShouldUpdate = !gameIsPaused && !isLevelComplete;

    const dt = (now - last) / 1000;
    last = now;
    acc += dt;

    // --- Update Timer Display ---
    // Check if timer has started and element exists
    if (startTime !== 0 && timerDisplayElement) {
        if (gameShouldUpdate) {
            // Calculate elapsed time, subtracting paused time
            let currentElapsedTime = now - startTime - totalPausedTime;
            currentElapsedTime = Math.max(0, currentElapsedTime); // Ensure non-negative
            timerDisplayElement.textContent = formatTime(currentElapsedTime);
        } else if (isLevelComplete && finalTimeFormatted) {
             // Optional: Keep showing final time if needed, though it's hidden in handleLevelComplete
             // timerDisplayElement.textContent = finalTimeFormatted;
        } else if (gameIsPaused && pauseStartTime !== null) {
            // Optional: Show frozen time while paused
            let pausedElapsedTime = pauseStartTime - startTime - totalPausedTime;
            pausedElapsedTime = Math.max(0, pausedElapsedTime);
            timerDisplayElement.textContent = formatTime(pausedElapsedTime);
        }
    }
    // --- End Update Timer Display ---

    // FPS counter
    frames++;
    if (now - lastFpsUpdate > 500) {
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
            world.step(FIXED); // Includes checkpoint detection via postStep listener
            playerCtrl.fixedUpdate(FIXED);
            if (playerBody.position.y < -10) respawnPlayer();
        }
        acc -= FIXED;
        if (acc < FIXED && !gameShouldUpdate) break;
    }

    // Render the scene always
    renderer.render(scene, camera);
}