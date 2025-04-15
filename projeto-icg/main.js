import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import camera from './camera.js';
import renderer from './renderer.js';
import { setupControls } from './controls.js';
import { createScene } from './scene/scene_0.js';
import { createPlayerBody } from './player.js';
import { setupPauseMenu } from './pauseMenu.js';

// Criação do mundo físico
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Configura a gravidade

const playerBody = createPlayerBody();
world.addBody(playerBody);

let scene; // Variável para armazenar a cena carregada dinamicamente

// Configura os controles para usar o corpo físico do jogador
const updateControls = setupControls(camera, renderer.domElement, playerBody);

// Elementos de UI (opcional)
const speedometer = document.getElementById('speedometer');
const fpsDisplay = document.getElementById('fps');

// Variáveis para cálculo do deltaTime
let lastTime = performance.now();
let frameCount = 0;
let fps = 60;
let lastFpsUpdate = 0;

// Variável para armazenar a última posição
const lastPosition = new THREE.Vector3();

let paused = false;
const getPaused = setupPauseMenu((isPaused) => { paused = isPaused; }, renderer.domElement);

// Função para carregar a cena correta com base no título da página
function loadScene() {
    if (document.title === 'LEVEL 0') {
        return Promise.resolve(createScene(world));
    } else if (document.title === 'LEVEL 1') {
        return import('./scene/scene_1.js').then(module => module.createScene(world));
    } else {
        console.error('Título da página não corresponde a nenhum nível conhecido.');
        return Promise.reject('Título da página inválido.');
    }
}

function animate(currentTime) {
    requestAnimationFrame(animate);
    if (paused) return;

    world.step(1 / 60);

    // Atualiza controles (movimento + pulo)
    updateControls(1 / 60);

    // Respawn se cair no void
    if (playerBody.position.y < -20) {
        playerBody.position.set(0, 5, 0); // Posição de respawn (ajuste se quiser)
        playerBody.velocity.set(0, 0, 0); // Zera a velocidade
        playerBody.angularVelocity.set(0, 0, 0); // Zera rotação
    }

    // Sincroniza a posição da câmera com o corpo físico do jogador
    camera.position.copy(playerBody.position);

    // Atualiza UI (opcional)
    updateUI(currentTime);

    // Renderiza
    renderer.render(scene, camera);
}

function updateUI(currentTime) {
    // Calcula FPS
    frameCount++;
    if (currentTime - lastFpsUpdate > 1000) {
        fps = Math.round(frameCount * 1000 / (currentTime - lastFpsUpdate));
        lastFpsUpdate = currentTime;
        frameCount = 0;
        if (fpsDisplay) fpsDisplay.textContent = `FPS: ${fps}`;
    }
    
    // Calcula a velocidade do jogador
    const velocity = Math.sqrt(
        Math.pow(camera.position.x - lastPosition.x, 2) +
        Math.pow(camera.position.z - lastPosition.z, 2)
    ) * 60; // Aproximação para u/s

    lastPosition.copy(camera.position); // Atualiza a última posição

    // Atualiza o speedometer
    if (speedometer) {
        speedometer.textContent = `Speed: ${velocity.toFixed(2)} u/s`;
    }
}

// Inicializa o jogo carregando a cena correta
loadScene()
    .then(loadedScene => {
        scene = loadedScene;
        animate(performance.now());
    })
    .catch(error => {
        console.error('Erro ao carregar a cena:', error);
    });

// Resize handler (mantido)
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});