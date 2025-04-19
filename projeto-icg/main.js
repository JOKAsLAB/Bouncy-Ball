import * as CANNON from 'cannon-es'
import renderer from './renderer.js'
import camera from './camera.js'
import PlayerController from './PlayerController.js'
import { createPlayerBody } from './player.js'
import { setupPauseMenu } from './pauseMenu.js';

// Modelo
const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)
// … monte materiais e groundBody aqui …

const playerBody = createPlayerBody()
world.addBody(playerBody)

const SPAWN_POS = new CANNON.Vec3(0, 5, 0); // ajuste conforme seu ponto inicial

function respawnPlayer() {
  playerBody.position.copy(SPAWN_POS);
  playerBody.velocity.set(0, 0, 0);
  playerBody.angularVelocity.set(0, 0, 0);
  
  playerCtrl.yaw = 0;
  playerCtrl.pitch = 0;
  playerCtrl.camera.quaternion.setFromEuler(
    new THREE.Euler(playerCtrl.pitch, playerCtrl.yaw, 0, 'YXZ')
  );
}

// Presenter
const playerCtrl = new PlayerController(camera, renderer.domElement, playerBody, world)

// Detecta o nível pelo nome do HTML
let createScene;
if (window.location.pathname.includes('level_1')) {
    ({ createScene } = await import('./scene/scene_1.js'));
} else {
    ({ createScene } = await import('./scene/scene_0.js'));
}

// View: crie a cena UMA única vez
const scene = createScene(world)

const isPaused = setupPauseMenu(paused => {
  // Aqui você pode travar/destravar controles do player se quiser
}, renderer.domElement);

// Loop com fixed‐timestep
const FIXED = 1/60
let last = performance.now(), acc = 0

let lastFpsUpdate = 0;
let frames = 0;
let fps = 0;

function animate(now) {
  const dt = (now - last) / 1000
  last = now
  acc += dt

  // FPS counter
  frames++;
  if (now - lastFpsUpdate > 500) {
    fps = Math.round((frames * 1000) / (now - lastFpsUpdate));
    lastFpsUpdate = now;
    frames = 0;
    document.getElementById('fps').textContent = `FPS: ${fps}`;
  }

  // Speedometer (horizontal speed)
  const v = playerBody.velocity;
  const speed = Math.sqrt(v.x * v.x + v.z * v.z);
  document.getElementById('speedometer').textContent = `Speed: ${speed.toFixed(2)} u/s`;

  while (acc >= FIXED) {
    world.step(FIXED)
    playerCtrl.fixedUpdate(FIXED)
    // Respawn se cair no void
    if (playerBody.position.y < -10) {
      respawnPlayer();
    }
    acc -= FIXED
  }

  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}

requestAnimationFrame(animate)