import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import renderer from './renderer.js'
import camera from './camera.js'
import PlayerController from './PlayerController.js'
import { createPlayerBody } from './player.js'
import { setupPauseMenu } from './pauseMenu.js'
import CheckpointManager from './checkpoints.js';

// Modelo
const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)
// … monte materiais e groundBody aqui …

const playerBody = createPlayerBody();
world.addBody(playerBody);

const SPAWN_POS = new CANNON.Vec3(0, 5, 0); // Posição inicial
const SPAWN_YAW = Math.PI; // 180° (olhar para trás)

// Inicializar o gerenciador de checkpoints
const checkpointManager = new CheckpointManager(world, playerBody);
checkpointManager.setInitialCheckpoint(SPAWN_POS);

function respawnPlayer() {
    // Reposicionar o jogador no último checkpoint
    const lastCheckpoint = checkpointManager.getLastCheckpoint();
    if (!lastCheckpoint) {
        console.error('Nenhum checkpoint encontrado! Usando posição inicial.');
        return;
    }

    playerBody.position.copy(lastCheckpoint);
    playerBody.position.y += 0.5; // Eleva levemente para evitar colisão imediata com o chão
    playerBody.velocity.set(0, 0, 0); // Zerar velocidade
    playerBody.angularVelocity.set(0, 0, 0); // Zerar rotação

    // Reposicionar e orientar a câmera
    camera.position.copy(new THREE.Vector3(lastCheckpoint.x, lastCheckpoint.y, lastCheckpoint.z));
    playerCtrl.yaw = SPAWN_YAW;
    playerCtrl.pitch = 0;
    camera.quaternion.setFromEuler(
        new THREE.Euler(playerCtrl.pitch, playerCtrl.yaw, 0, 'YXZ')
    );

    // Redefinir estado de pulo no PlayerController
    playerCtrl.canJump = false; // Impede pulo imediato após respawn
    playerCtrl.wasOnGround = false; // Garante que o estado de chão seja recalculado
}

// Presenter
const playerCtrl = new PlayerController(camera, renderer.domElement, playerBody, world)
respawnPlayer()   // spawn inicial com ângulo definido

// Detecta o nível pelo nome do HTML
let createScene;
if (window.location.pathname.includes('level_1')) {
    ({ createScene } = await import('./scene/scene_1.js'));
} else {
    ({ createScene } = await import('./scene/scene_0.js'));
}

// View: crie a cena UMA única vez
const scene = createScene(world);

const isPaused = setupPauseMenu(paused => {
    // travar/destravar controles se quiser
}, renderer.domElement);

// Loop com fixed‐timestep
const FIXED = 1 / 60;
let last = performance.now(),
    acc = 0;
let lastFpsUpdate = 0,
    frames = 0,
    fps = 0;

function animate(now) {
    const dt = (now - last) / 1000;
    last = now;
    acc += dt;

    // FPS counter
    frames++;
    if (now - lastFpsUpdate > 500) {
        fps = Math.round((frames * 1000) / (now - lastFpsUpdate));
        lastFpsUpdate = now;
        frames = 0;
        document.getElementById('fps').textContent = `FPS: ${fps}`;
    }

    // Speedometer
    const v = playerBody.velocity;
    document.getElementById('speedometer').textContent = `Speed: ${Math.sqrt(v.x * v.x + v.z * v.z).toFixed(2)} u/s`;

    while (acc >= FIXED) {
        world.step(FIXED);
        playerCtrl.fixedUpdate(FIXED);
        if (playerBody.position.y < -10) respawnPlayer();
        acc -= FIXED;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);