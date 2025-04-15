import * as THREE from 'three';

/**
 * setupControls agora aceita camera, domElement e playerBody (CANNON.Body).
 * O movimento e salto são aplicados ao corpo físico, e a câmara segue o corpo.
 */
export function setupControls(camera, domElement, playerBody) {
    const speed = 2;
    const jumpVelocity = 8;
    const mouseSensitivity = 0.001;

    let yaw = 0;
    let pitch = 0;
    let canJump = false;

    // Parâmetros para bunny hop
    const groundFriction = 8;
    const airControl = 0.5;
    const maxSpeed = 8;

    // Variável para guardar o último movimento do mouse (para air-strafe)
    let lastMouseDX = 0;

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
            lastMouseDX = e.movementX;
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

        // Movimento desejado
        let wishDir = new THREE.Vector3();
        wishDir.addScaledVector(forward, moveZ);
        wishDir.addScaledVector(right, moveX);

        // --- AIR STRAFE: mouse influencia direção no ar, mas sempre aplica wishDir ---
        const velocity = playerBody.velocity;
        const vel = new THREE.Vector3(velocity.x, 0, velocity.z);
        const onGround = canJump;

        // Air-strafe: mouse influencia direção, mas não bloqueia A/D
        if (!onGround && wishDir.length() > 0 && lastMouseDX !== 0) {
            // Limita o strafeAngle para evitar perda brusca de velocidade
            const maxStrafe = Math.PI / 8; // ~22.5 graus por frame
            let strafeAngle = lastMouseDX * mouseSensitivity * 2.5;
            strafeAngle = Math.max(-maxStrafe, Math.min(maxStrafe, strafeAngle));
            wishDir.applyAxisAngle(new THREE.Vector3(0,1,0), strafeAngle);
        }

        if (wishDir.length() > 0) wishDir.normalize();

        // --- Bunny hop/strafe estilo CS: aceleração gradual ---

        // Função para acelerar na direção desejada, sem ultrapassar o máximo
        function accelerate(vel, wishDir, accel, maxSpeed, deltaTime) {
            const currentSpeed = vel.dot(wishDir);
            const addSpeed = maxSpeed - currentSpeed;
            if (addSpeed <= 0) return;
            const accelSpeed = Math.min(accel * deltaTime * maxSpeed, addSpeed);
            vel.addScaledVector(wishDir, accelSpeed);
        }

        if (onGround) {
            // Aplica fricção sempre no chão (como no CS)
            vel.multiplyScalar(Math.max(0, 1 - groundFriction * deltaTime));
            // Acelera gradualmente na direção desejada
            if (wishDir.length() > 0) {
                accelerate(vel, wishDir, speed * 2, maxSpeed, deltaTime);
            }
            // Salto
            if (keys['Space']) {
                velocity.y = jumpVelocity;
                canJump = false;
            }
        } else {
            // Controle aéreo limitado + air-strafe
            if (!onGround && wishDir.length() > 0) {
                // Só acelera se o input está na mesma direção do movimento, nunca freia
                const currentSpeed = vel.dot(wishDir);
                const addSpeed = maxSpeed - currentSpeed;
                if (addSpeed > 0) {
                    // Só soma aceleração positiva, nunca negativa!
                    const accelSpeed = Math.min(airControl * deltaTime * maxSpeed, addSpeed);
                    vel.addScaledVector(wishDir, accelSpeed);
                }
            }
        }

        // Aplica velocidades calculadas
        velocity.x = vel.x;
        velocity.z = vel.z;

        // Sincroniza câmara com corpo físico
        camera.position.copy(playerBody.position);

        // Zera o movimento do m        // Zera o ra não acumular)
        lastMouseDX = 0; 
    }

    return update;
}