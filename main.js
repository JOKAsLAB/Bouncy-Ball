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
import { playMenuClickSound } from './utils/audioUtils.js';
import { createFpsCounter } from './fps.js';

let currentLevelPath;
let currentLevelAudioContext = null;
let currentLevelBackgroundSound = null;
let currentRainParticles = null;
let currentRainHeight = 30;
let currentRainSpreadX = 50;
let currentRainSpreadZ = 50;

const scene = new THREE.Scene();

const levelCompleteSound = new Audio('assets/sound/GAME_OVER.mp3');
levelCompleteSound.volume = 0.1;
levelCompleteSound.load();

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
const fpsCounter = createFpsCounter();

const timerDisplayElement = document.getElementById('timerDisplay');
const finalTimeDisplayElement = document.getElementById('finalTimeDisplay');
const bestTimeDisplayElement = document.getElementById('bestTimeDisplay');
const infoElement = document.getElementById('info');
const noclipIndicator = document.getElementById('noclipIndicator');
const fpsElement = document.getElementById('fps');
const speedElement = document.getElementById('speedometer');

let isUiVisible = true;

if (timerDisplayElement && finalTimeDisplayElement && infoElement && noclipIndicator) {
    timerDisplayElement.style.display = 'block';
    infoElement.style.display = 'block';
    noclipIndicator.style.display = 'none';
    timerDisplayElement.textContent = timer.formatTime(0);
} else {
    console.error('UI elements not found:', timerDisplayElement, finalTimeDisplayElement, infoElement, noclipIndicator);
}

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

const playerMaterial = new CANNON.Material("playerMaterial");
const groundWallMaterial = new CANNON.Material("groundWallMaterial");

const playerGroundContactMaterial = new CANNON.ContactMaterial(
    playerMaterial,
    groundWallMaterial,
    {
        friction: 0.0,
        restitution: 0.0
    }
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
    if (isLevelComplete) {
        return;
    }

    isLevelComplete = true;
    playerCtrl.enabled = false;
    document.exitPointerLock();

    if (levelCompleteSound.paused) {
        levelCompleteSound.currentTime = 0;
        levelCompleteSound.play().catch(e => console.error("Error playing level complete sound:", e));
    } else {
        levelCompleteSound.currentTime = 0;
        levelCompleteSound.play().catch(e => console.error("Error re-playing level complete sound:", e));
    }

    const finalElapsedTime = timer.getElapsedTime();
    const finalTimeFormatted = timer.formatTime(finalElapsedTime);

    if (finalTimeDisplayElement) {
        finalTimeDisplayElement.textContent = `Time: ${finalTimeFormatted}`;
    }

    if (currentLevelPath && bestTimeDisplayElement) {
        const levelNameMatch = currentLevelPath.match(/level_(\d+)\.html$/);
        if (levelNameMatch && levelNameMatch[1]) {
            const levelNumber = levelNameMatch[1];
            const bestTimeKey = `level${levelNumber}BestTime`;

            let bestTime = localStorage.getItem(bestTimeKey);

            bestTimeDisplayElement.classList.remove('new-record');
            bestTimeDisplayElement.style.color = '';
            bestTimeDisplayElement.style.display = 'block';

            if (bestTime === null || finalElapsedTime < parseFloat(bestTime)) {
                localStorage.setItem(bestTimeKey, finalElapsedTime.toString());
                bestTime = finalElapsedTime.toString();
                bestTimeDisplayElement.textContent = `Novo Recorde: ${timer.formatTime(parseFloat(bestTime))}`;
                bestTimeDisplayElement.classList.add('new-record');
            } else {
                bestTimeDisplayElement.textContent = `Melhor Tempo: ${timer.formatTime(parseFloat(bestTime))}`;
            }
        } else {
            bestTimeDisplayElement.style.display = 'none';
        }
    } else if (bestTimeDisplayElement) {
        bestTimeDisplayElement.style.display = 'none';
    }

    if (timerDisplayElement) {
        timerDisplayElement.style.display = 'none';
    }
    if (infoElement) {
        infoElement.style.display = 'none';
    }
    if (noclipIndicator) {
        noclipIndicator.style.display = 'none';
    }

    document.getElementById('levelCompleteMenu').style.display = 'flex';

    const nextBtn = document.getElementById('nextLevelBtn');
    const restartBtn = document.getElementById('restartLevelBtn');
    const menuBtn = document.getElementById('mainMenuBtn');

    nextBtn.onclick = () => {
        playMenuClickSound();
        if (currentLevelPath && currentLevelPath.includes('level_1.html')) {
            window.location.href = 'level_2.html';
        } else if (currentLevelPath && currentLevelPath.includes('level_2.html')) {
            window.location.href = 'level_3.html';
        } else if (currentLevelPath && currentLevelPath.includes('level_3.html')) {
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

const playerCtrl = new PlayerController(camera, renderer.domElement, playerBody, world, {
    checkpointManager: checkpointManager,
    spawnYaw: SPAWN_YAW
});

const originalCollisionResponse = playerBody.collisionResponse;

checkpointManager.respawnPlayer(camera, playerCtrl, SPAWN_YAW);

let gameMovingPlatforms = [];
let gameMovingLightData = null;
let gameSequencedSpotlights = [];
let gameRandomSpotlights = [];
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
            if (noclipIndicator) {
                noclipIndicator.style.display = (isUiVisible && playerCtrl.noclip) ? 'block' : 'none';
            }
        }
        return true;
    }, renderer.domElement);
}

(async () => {
    let createLevelScene;
    let currentLevelName = window.location.pathname.split('/').pop();
    currentLevelPath = window.location.pathname;

    try {
        if (currentLevelPath.includes('level_1.html')) {
            ({ createScene: createLevelScene } = await import('./scene/scene_1.js'));
        } else if (currentLevelPath.includes('level_2.html')) {
            ({ createScene: createLevelScene } = await import('./scene/scene_2.js'));
        } else if (currentLevelPath.includes('level_3.html')) {
            ({ createScene: createLevelScene } = await import('./scene/scene_3.js'));
        } else {
            throw new Error(`Unknown level HTML file: ${currentLevelName}`);
        }

        const {
            scene: levelScene,
            movingPlatforms,
            movingLightData,
            sequencedSpotlights,
            randomSpotlights,
            backgroundSound: levelBackgroundSound,
            audioListener: levelAudioListener,
            rainParticles: levelRainParticles,
            rainHeight: levelRainHeight,
            rainSpreadX: levelRainSpreadX,
            rainSpreadZ: levelRainSpreadZ
        } = await createLevelScene(world, checkpointManager, groundWallMaterial, camera);

        currentRainParticles = levelRainParticles;
        currentRainHeight = levelRainHeight || 30;
        currentRainSpreadX = levelRainSpreadX || 50;
        currentRainSpreadZ = levelRainSpreadZ || 50;

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
        if (levelScene.environmentIntensity !== undefined) {
             scene.environmentIntensity = levelScene.environmentIntensity;
        }

        if (levelScene && levelScene.children) {
            const childrenToAdd = [...levelScene.children];
            childrenToAdd.forEach(child => {
                scene.add(child);
            });
        }

        gameMovingPlatforms = Array.isArray(movingPlatforms) ? movingPlatforms : [];
        gameMovingLightData = movingLightData;
        gameSequencedSpotlights = Array.isArray(sequencedSpotlights) ? sequencedSpotlights : [];
        gameRandomSpotlights = Array.isArray(randomSpotlights) ? randomSpotlights : [];

        currentLevelBackgroundSound = levelBackgroundSound;
        if (levelAudioListener) {
            currentLevelAudioContext = levelAudioListener.context;
        }

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
        if (timerDisplayElement) {
            timerDisplayElement.style.display = isUiVisible ? 'block' : 'none';
        }
        if (infoElement) {
            infoElement.style.display = isUiVisible ? 'block' : 'none';
        }
        if (noclipIndicator) {
            noclipIndicator.style.display = (isUiVisible && playerCtrl.noclip) ? 'block' : 'none';
        }
        
        if (fpsElement) {
            fpsElement.style.display = isUiVisible ? 'block' : 'none';
            if (isUiVisible) {
                fpsElement.textContent = `FPS: ${fpsCounter.getFps()}`;
            }
        }
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

renderer.domElement.addEventListener('click', () => {
    if (currentLevelAudioContext && currentLevelAudioContext.state === 'suspended') {
        currentLevelAudioContext.resume().then(() => {
            if (currentLevelBackgroundSound && !currentLevelBackgroundSound.isPlaying) {
                currentLevelBackgroundSound.play();
            }
        });
    } else if (currentLevelBackgroundSound && !currentLevelBackgroundSound.isPlaying) {
        currentLevelBackgroundSound.play();
    }
});

function updateSpeedometer() {
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

async function loadLevel(levelPath) {
    if (currentLevelBackgroundSound && currentLevelBackgroundSound.isPlaying) {
        currentLevelBackgroundSound.stop();
    }
    currentLevelBackgroundSound = null;
    currentLevelAudioContext = null;
    if (currentRainParticles) {
        if (currentRainParticles.parent) {
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
            }
        }
    } catch (error) {
        console.error("Error loading level:", error);
    }
}

const FIXED = 1 / 60;
let last = performance.now(),
    acc = 0;

const sequenceInterval = 0.6;
let lastSequenceUpdateTime = 0;
let currentSequenceIndex = -1;

let lastRandomSequenceUpdateTime = 0;
let currentRandomIndex = -1;

let time = 0;

function animate(now) {
    requestAnimationFrame(animate);

    const gameIsPaused = typeof isPausedFn === 'function' ? isPausedFn() : false;
    const gameShouldUpdate = !gameIsPaused && !isLevelComplete;

    const dt = (now - last) / 1000;
    time = now;
    const elapsedTime = clock.getElapsedTime();
    last = now;
    acc += dt;

    let currentHue, saturation, lightness;

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

    if (gameShouldUpdate && gameSequencedSpotlights.length > 0) {
        if (elapsedTime - lastSequenceUpdateTime >= sequenceInterval) {
            if (currentSequenceIndex >= 0) {
                gameSequencedSpotlights[currentSequenceIndex].visible = false;
            }
            currentSequenceIndex = (currentSequenceIndex + 1) % gameSequencedSpotlights.length;
            const activeLight = gameSequencedSpotlights[currentSequenceIndex];
            activeLight.visible = true;
            if (currentHue !== undefined) {
                 activeLight.color.setHSL(currentHue, saturation, lightness);
            }
            lastSequenceUpdateTime = elapsedTime;
        }
    }

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
            if (currentHue !== undefined) {
                activeLight.color.setHSL(currentHue, saturation, lightness);
            }
            currentRandomIndex = nextRandomIndex;
            lastRandomSequenceUpdateTime = elapsedTime;
        }
    }

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

    if (currentRainParticles && playerBody) {
        const positions = currentRainParticles.geometry.attributes.position.array;
        const rainSpeed = 25;
        const playerPosition = playerBody.position;

        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] -= rainSpeed * dt;

            if (positions[i + 1] < playerPosition.y - 15) {
                positions[i + 1] = playerPosition.y + currentRainHeight + (Math.random() * 10 - 5);
                positions[i] = playerPosition.x + (Math.random() * currentRainSpreadX - currentRainSpreadX / 2);
                positions[i + 2] = playerPosition.z + (Math.random() * currentRainSpreadZ - currentRainSpreadZ / 2);
            }
        }
        currentRainParticles.geometry.attributes.position.needsUpdate = true;
    }

    if (timerDisplayElement && gameShouldUpdate && isUiVisible) {
        timerDisplayElement.textContent = timer.formatTime(timer.getElapsedTime());
    }

    fpsCounter.update(now);
    if (fpsElement && isUiVisible) {
        fpsElement.textContent = `FPS: ${fpsCounter.getFps()}`;
    }

    if (gameShouldUpdate && isUiVisible) {
        updateSpeedometer();
    } else if (isUiVisible) {
        if (speedElement) speedElement.textContent = 'Speed: 0.00 u/s';
    }

    while (acc >= FIXED) {
        if (gameShouldUpdate) {
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

export function setMasterVolume(volume) {
    if (camera && camera.userData.listener) {
        camera.userData.listener.setMasterVolume(parseFloat(volume));
    } else {
        console.warn("[MainJS] AudioListener não encontrado para definir Master Volume.");
    }
}

export function setMusicVolume(volume) {
    if (currentLevelBackgroundSound) {
        currentLevelBackgroundSound.setVolume(parseFloat(volume));
    } else {
        console.warn("[MainJS] currentLevelBackgroundSound não encontrado para definir Volume da Música.");
    }
}

export function setSfxVolume(volume) {
}

window.setMasterVolumeFromMain = setMasterVolume;
window.setMusicVolumeFromMain = setMusicVolume;
window.setSfxVolumeFromMain = setSfxVolume;