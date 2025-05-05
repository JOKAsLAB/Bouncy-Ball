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
import { playMenuClickSound } from './utils/audioUtils.js';

// --- Definição da Cena Principal ---
const scene = new THREE.Scene();
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
window.addEventListener('resize', onWindowResize);
function onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}
const timer = createTimer();
timer.start();
const timerDisplayElement = document.getElementById('timerDisplay');
const finalTimeDisplayElement = document.getElementById('finalTimeDisplay');
const infoElement = document.getElementById('info');
const noclipIndicator = document.getElementById('noclipIndicator');
let isUiVisible = true;
if (timerDisplayElement) timerDisplayElement.style.display = 'block';
if (infoElement) infoElement.style.display = 'block';
if (noclipIndicator) noclipIndicator.style.display = 'none';
if (timerDisplayElement) timerDisplayElement.textContent = timer.formatTime(0);

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
const playerMaterial = new CANNON.Material("playerMaterial");
const groundWallMaterial = new CANNON.Material("groundWallMaterial");
const playerGroundContactMaterial = new CANNON.ContactMaterial(
    playerMaterial,
    groundWallMaterial,
    { friction: 0.0, restitution: 0.0 }
);
world.addContactMaterial(playerGroundContactMaterial);

const playerBody = createPlayerBody(playerMaterial);
playerBody.wallContactNormal = null;
world.addBody(playerBody);
playerBody.addEventListener('collide', (event) => {
    const contact = event.contact;
    const contactNormal = contact.ni;
    if (Math.abs(contactNormal.y) < 0.5) {
        playerBody.wallContactNormal = contactNormal.clone();
    }
});

const SPAWN_POS = new CANNON.Vec3(0, 5, 0);
const SPAWN_YAW = Math.PI;

let isLevelComplete = false;
function handleLevelComplete() {
    if (isLevelComplete) return;
    isLevelComplete = true;
    playerCtrl.enabled = false;
    document.exitPointerLock();
    const finalElapsedTime = timer.getElapsedTime();
    const finalTimeFormatted = timer.formatTime(finalElapsedTime);
    if (finalTimeDisplayElement) finalTimeDisplayElement.textContent = `Time: ${finalTimeFormatted}`;
    if (timerDisplayElement) timerDisplayElement.style.display = 'none';
    if (infoElement) infoElement.style.display = 'none';
    if (noclipIndicator) noclipIndicator.style.display = 'none';
    document.getElementById('levelCompleteMenu').style.display = 'flex';
    const nextBtn = document.getElementById('nextLevelBtn');
    const restartBtn = document.getElementById('restartLevelBtn');
    const menuBtn = document.getElementById('mainMenuBtn');
    const currentLevelPath = window.location.pathname;
    nextBtn.onclick = () => {
        playMenuClickSound();
        if (currentLevelPath.includes('level_1')) {
            window.location.href = 'level_2.html';
        } else if (currentLevelPath.includes('level_2')) {
            window.location.href = 'level_3.html';
        } else if (currentLevelPath.includes('level_3')) {
            window.location.href = 'index.html';
        } else {
            window.location.href = 'index.html';
        }
    };
    restartBtn.onclick = () => {
        playMenuClickSound();
        window.location.href = window.location.pathname;
    };
    menuBtn.onclick = () => {
        playMenuClickSound();
        window.location.href = 'index.html';
    };
}

const checkpointManager = new CheckpointManager(world, playerBody, handleLevelComplete);
checkpointManager.setInitialCheckpoint(SPAWN_POS);

const playerCtrl = new PlayerController(camera, renderer.domElement, playerBody, world);
const originalCollisionResponse = playerBody.collisionResponse;
checkpointManager.respawnPlayer(camera, playerCtrl, SPAWN_YAW);

let gameMovingPlatforms = [];
let gameMovingLightData = null;
let sceneUpdater = null;
const clock = new THREE.Clock();

let isPausedFn = () => false;
function initializePauseMenu() {
    isPausedFn = setupPauseMenu((paused) => {
        if (isLevelComplete) {
            playerCtrl.enabled = false;
            return false;
        }
        if (paused) {
            timer.pause();
            playerCtrl.enabled = false;
            if (timerDisplayElement) timerDisplayElement.style.display = 'none';
            if (infoElement) infoElement.style.display = 'none';
            if (noclipIndicator) noclipIndicator.style.display = 'none';
        } else {
            timer.resume();
            playerCtrl.enabled = true;
            if (timerDisplayElement) timerDisplayElement.style.display = isUiVisible ? 'block' : 'none';
            if (infoElement) infoElement.style.display = isUiVisible ? 'block' : 'none';
            if (noclipIndicator) noclipIndicator.style.display = (isUiVisible && playerCtrl.noclip) ? 'block' : 'none';
        }
        return true;
    }, renderer.domElement);
}

(async () => {
    let createLevelScene;
    let currentLevelName = window.location.pathname.split('/').pop();
    const currentLevelPath = window.location.pathname;

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

        const { scene: levelScene, movingPlatforms, movingLightData, updateSectionVisibility } = await createLevelScene(world, checkpointManager, groundWallMaterial);

        sceneUpdater = updateSectionVisibility;

        scene.background = levelScene.background || new THREE.Color(0x000000);
        scene.environment = levelScene.environment || null;
        scene.environmentIntensity = levelScene.environmentIntensity !== undefined ? levelScene.environmentIntensity : 0;

        if (levelScene && levelScene.children) {
            const childrenToAdd = [...levelScene.children];
            childrenToAdd.forEach(child => scene.add(child));
        } else {
            console.error("levelScene or its children are undefined after loading level.");
        }

        gameMovingPlatforms = Array.isArray(movingPlatforms) ? movingPlatforms : [];
        gameMovingLightData = movingLightData;
        console.log("Moving light data for this level:", gameMovingLightData);

        initializePauseMenu();
        requestAnimationFrame(animate);

    } catch (error) {
        console.error("Error loading or setting up level scene:", error);
    }
})();

window.addEventListener('keydown', (event) => {
    const gameIsPaused = typeof isPausedFn === 'function' ? isPausedFn() : false;
    if (gameIsPaused || isLevelComplete) return;
    if (event.key === '1') {
        isUiVisible = !isUiVisible;
        if (timerDisplayElement) timerDisplayElement.style.display = isUiVisible ? 'block' : 'none';
        if (infoElement) infoElement.style.display = isUiVisible ? 'block' : 'none';
        if (noclipIndicator) noclipIndicator.style.display = (isUiVisible && playerCtrl.noclip) ? 'block' : 'none';
    }
    if (event.key === '2') {
        const noclipOn = playerCtrl.toggleNoclip();
        playerBody.collisionResponse = !noclipOn;
        if (noclipIndicator) {
            noclipIndicator.textContent = noclipOn ? 'Noclip ON' : '';
            noclipIndicator.style.display = (isUiVisible && noclipOn) ? 'block' : 'none';
        }
        updateSpeedometer();
    }
    if (event.key === '3') {
        checkpointManager.toggleCheckpointOpacity();
    }
});

function updateSpeedometer() {
    const speedElement = document.getElementById('speedometer');
    if (!speedElement || !isUiVisible) return;

    let speedText = 'Speed: ...';
    if (playerCtrl && playerBody) {
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

world.addEventListener('collide', (event) => {
    const bodyA = event.bodyA;
    const bodyB = event.bodyB;

    let playerBodyInstance = null;
    let checkpointBody = null;

    if (bodyA.collisionFilterGroup === GROUP_PLAYER && bodyB.collisionFilterGroup === GROUP_CHECKPOINT_TRIGGER) {
        playerBodyInstance = bodyA;
        checkpointBody = bodyB;
    } else if (bodyB.collisionFilterGroup === GROUP_PLAYER && bodyA.collisionFilterGroup === GROUP_CHECKPOINT_TRIGGER) {
        playerBodyInstance = bodyB;
        checkpointBody = bodyA;
    }

    if (playerBodyInstance && checkpointBody && checkpointBody.isCheckpoint) {
        if (checkpointBody.checkpointIndex !== undefined) {
            const reachedIndex = checkpointBody.checkpointIndex;

            const checkpointUpdated = checkpointManager._handleCheckpointActivation(checkpointBody);

            if (sceneUpdater && checkpointUpdated && !checkpointBody.isFinalCheckpoint) {
                console.log(`Collision with checkpoint ${reachedIndex}. Calling scene updater.`);
                sceneUpdater(reachedIndex);
            } else if (sceneUpdater && checkpointUpdated && checkpointBody.isFinalCheckpoint) {
                console.log(`Collision with final checkpoint ${reachedIndex}. Level complete logic handles visibility.`);
            }
        } else {
            console.warn("Checkpoint body collided but missing checkpointIndex property:", checkpointBody);
        }
    }
});

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
    const time = clock.getElapsedTime();
    last = now;
    acc += dt;

    if (gameShouldUpdate && gameMovingLightData) {
        const { light, pathPoints, speed } = gameMovingLightData;

        if (pathPoints && pathPoints.length >= 2) {
            const firstPoint = pathPoints[0];
            const lastPoint = pathPoints[pathPoints.length - 1];
            const totalZLength = lastPoint.z - firstPoint.z;

            const normalizedPosition = (Math.sin(time * speed) + 1) / 2;

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
        }
    }

    if (gameShouldUpdate && gameMovingPlatforms) {
        gameMovingPlatforms.forEach(platform => {
            const { mesh, body, initialPosition, movement } = platform;
            const { axis, distance, speed: platformSpeed, offset = 0, distanceX, distanceZ } = movement;

            let newPos = initialPosition.clone();
            let currentVelocity = new CANNON.Vec3(0, 0, 0);

            const angle = time * platformSpeed + offset;
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

    if (timerDisplayElement && gameShouldUpdate && isUiVisible) {
        timerDisplayElement.textContent = timer.formatTime(timer.getElapsedTime());
    }

    frames++;
    if (now - lastFpsUpdate > 500) {
        fps = Math.round((frames * 1000) / (now - lastFpsUpdate));
        lastFpsUpdate = now;
        frames = 0;
        const fpsElement = document.getElementById('fps');
        if (fpsElement && isUiVisible) fpsElement.textContent = `FPS: ${fps}`;
    }

    if (gameShouldUpdate && isUiVisible) {
        updateSpeedometer();
    } else if (isUiVisible) {
        const speedElement = document.getElementById('speedometer');
        if (speedElement) speedElement.textContent = 'Speed: 0.00 u/s';
    }

    while (acc >= FIXED) {
        if (gameShouldUpdate) {
            playerBody.wallContactNormal = null;
            world.step(FIXED);
            playerCtrl.fixedUpdate(FIXED);
            if (playerBody.position.y < -10) checkpointManager.respawnPlayer(camera, playerCtrl, SPAWN_YAW);
        }
        acc -= FIXED;
    }

    renderer.render(scene, camera);
}

if (timerDisplayElement && finalTimeDisplayElement) {
    requestAnimationFrame(animate);
}