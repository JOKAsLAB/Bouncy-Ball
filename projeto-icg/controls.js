import * as THREE from 'three';

/**
 * setupControls agora aceita camera, domElement e playerBody (CANNON.Body).
 * O movimento e salto são aplicados ao corpo físico, e a câmara segue o corpo.
 */
export function setupControls(camera, domElement, playerBody) {
    const speed = 5;
    const jumpVelocity = 10;
    const mouseSensitivity = 0.001;

    let yaw = 0;
    let pitch = 0;
    let canJump = false;

    // 1. Pointer Lock (Bloqueio do Mouse)
    function lockPointer() {
        domElement.requestPointerLock = domElement.requestPointerLock ||
            domElement.mozRequestPointerLock ||
            domElement.webkitRequestPointerLock;
        domElement.requestPointerLock();
    }

    domElement.addEventListener('click', lockPointer);

    // 2. Controle da Câmera com Mouse
    function onMouseMove(e) {
        if (document.pointerLockElement === domElement) {
            yaw -= e.movementX * mouseSensitivity;
            pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch - e.movementY * mouseSensitivity));
            camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
        }
    }

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === domElement) {
            document.addEventListener('mousemove', onMouseMove);
        } else {
            document.removeEventListener('mousemove', onMouseMove);
        }
    });

    // 3. Controles de Teclado (WASD + Space)
    const keys = {};
    window.addEventListener('keydown', (e) => keys[e.code] = true);
    window.addEventListener('keyup', (e) => keys[e.code] = false);

    // 4. Detetar se está no chão (por colisão)
    playerBody.addEventListener('collide', (event) => {
        // Simples: se colidir com algo por baixo, pode saltar
        // Ajuste conforme necessário para o seu jogo
        if (playerBody.velocity.y <= 0) {
            canJump = true;
        }
    });

    // 5. Atualização do Movimento
    function update(deltaTime) {
        // Direções relativas à câmara
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        forward.y = 0;
        right.y = 0;
        forward.normalize();
        right.normalize();

        let moveX = 0, moveZ = 0;
        if (keys['KeyW']) moveZ += 1;
        if (keys['KeyS']) moveZ -= 1;
        if (keys['KeyA']) moveX -= 1;
        if (keys['KeyD']) moveX += 1;

        // Movimento horizontal
        const move = new THREE.Vector3();
        move.addScaledVector(forward, moveZ);
        move.addScaledVector(right, moveX);
        if (move.length() > 0) move.normalize();

        // Aplica velocidade horizontal ao corpo físico
        const velocity = playerBody.velocity;
        velocity.x = move.x * speed;
        // Mantém a velocidade y (gravidade do cannon-es)
        velocity.z = move.z * speed;

        // Salto
        if (keys['Space'] && canJump) {
            velocity.y = jumpVelocity;
            canJump = false;
        }

        // Sincroniza câmara com corpo físico
        camera.position.copy(playerBody.position);
    }

    return update;
}