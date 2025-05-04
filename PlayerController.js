import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GROUP_GROUND } from './collisionGroups.js'; // Ajusta o caminho

export default class PlayerController {
    constructor(camera, domElement, body, world, opts = {}) {
        this.camera = camera
        this.dom = domElement
        this.body = body // Guarda a referência ao corpo físico
        this.world = world
        Object.assign(this, {
            speed: 4,
            jumpSpeed: 4,
            airAccel: 3,
            groundFriction: 8,
            maxGroundSpeed: 5,
            rayLength: opts.rayLength || 1.1, // Ajusta rayLength se necessário, deve ser > raio do jogador (1.0)
            mouseSens: 0.001,
            ...opts
        })

        this.pitch = 0; this.yaw = 0
        this.keys = {}; 
        this.canJump = false
        this.jumpQueued = false; // novo: para detectar pulo no keydown
        this.wasOnGround = true; // *** Modificado: Começa como true (assumindo que começa no chão) ***
        this.wallNormal = new CANNON.Vec3(); // Para guardar a normal da parede

        // *** Adiciona propriedade para o som de aterrissagem ***
        this.landingSound = null;

        // noclip
        this.noclip = false;
        this.noclipSpeed = opts.noclipSpeed || 10;

        // guarda o tipo e a resposta a colisões originais
        this._origType = this.body.type;
        this._origCollision = this.body.collisionResponse;

        // *** Carrega o som de aterrissagem ***
        try {
            // Certifique-se que o caminho está correto relativo ao HTML (level_1.html)
            this.landingSound = new Audio('./assets/sound/land_1.mp3');
            this.landingSound.preload = 'auto';
            // Opcional: Ajustar volume se necessário
            this.landingSound.volume = 0.005;
            console.log("Som de aterrissagem carregado."); // Log para confirmar
        } catch (error) {
            console.error("Erro ao carregar som de aterrissagem:", error);
        }

        this._setupPointerLock()
        this._setupKeys()
    }

    _setupPointerLock() {
        this.dom.addEventListener('click', () => this.dom.requestPointerLock())
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === this.dom)
                document.addEventListener('mousemove', this._onMouse)
            else
                document.removeEventListener('mousemove', this._onMouse)
        })
    }

    _onMouse = e => {
        this.yaw   -= e.movementX * this.mouseSens
        this.pitch = THREE.MathUtils.clamp(
            this.pitch - e.movementY * this.mouseSens,
            -Math.PI / 2, Math.PI / 2
        )
        this.camera.quaternion.setFromEuler(
            new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')
        )
    }

    _setupKeys() {
        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'Space') this.jumpQueued = true; // só marca quando pressionado
        });
        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
            if (e.code === 'Space') this.jumpQueued = false;
        });
    }

    toggleNoclip() {
        this.noclip = !this.noclip;
        console.log(`noclip ${this.noclip ? 'ON' : 'OFF'}`);

        if (this.noclip) {
            // passa a cinemático e sem colisão
            this.body.type = CANNON.Body.KINEMATIC;
            this.body.collisionResponse = false;
        } else {
            // restaura física normal
            this.body.type = this._origType;
            this.body.collisionResponse = this._origCollision;
            this.body.wakeUp();
        }

        // zera velocidades para não arrastar nada estranho
        this.body.velocity.setZero();
        return this.noclip;
    }

    fixedUpdate(dt) {
        // Reset wall contact normal at the start of each physics step
        this.body.wallContactNormal = null; // Reset antes do world.step seria ideal, mas aqui funciona

        if (this.noclip) {
            // --- modo noclip simples ---
            const dir = new THREE.Vector3();
            this.camera.getWorldDirection(dir); // direção olhar
            const move = new THREE.Vector3();
            if (this.keys['KeyW']) move.add(dir);
            if (this.keys['KeyS']) move.sub(dir);
            const right = new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion);
            if (this.keys['KeyD']) move.add(right);
            if (this.keys['KeyA']) move.sub(right);
            if (this.keys['Space'])  move.y += 1;
            if (this.keys['ShiftLeft']||this.keys['ShiftRight']) move.y -= 1;
            if (move.lengthSq()>0) {
                move.normalize().multiplyScalar(this.noclipSpeed);
            }
            // guarda pra display
            this._lastNoclipSpeed = move.length();
            // aplica posição diretamente
            this.body.position.vadd(
                new CANNON.Vec3(move.x*dt, move.y*dt, move.z*dt),
                this.body.position
            );
            this.camera.position.copy(this.body.position);
            return;  // skip resto da física
        }

        // Raycast para baixo para detectar chão/plataforma
        const rayStart = new CANNON.Vec3(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );
        // O ponto final do raio
        const rayEnd = new CANNON.Vec3(
            this.body.position.x,
            this.body.position.y - this.rayLength,
            this.body.position.z
        );
        let isOnGround = false;
        const result = new CANNON.RaycastResult();

        // --- AJUSTE DO RAYCAST ---
        this.world.raycastClosest(rayStart, rayEnd, {
            // collisionFilterGroup: GROUP_PLAYER, // Opcional: O grupo do raio
            collisionFilterMask: GROUP_GROUND,  // <-- IMPORTANTE: Só deteta colisões com o grupo GROUND
            skipBackfaces: true
        }, result);
        // -------------------------

        // Verifica se houve hit E se o corpo atingido é do grupo GROUND
        // E se a distância é apropriada para o raio da esfera do jogador (1.0)
        if (result.hasHit && (result.body.collisionFilterGroup & GROUP_GROUND)) {
             // Considera "no chão" se a distância for menor ou igual ao raio da esfera + uma pequena tolerância
             const playerRadius = this.body.shapes[0].radius; // Obtém o raio da esfera
             if (result.distance <= playerRadius + 0.1) { // Tolerância de 0.1
                 isOnGround = true;
             }
        }

        // *** Lógica de Aterrissagem e Som ***
        // Verifica se acabou de aterrar (estava no ar E agora está no chão)
        if (isOnGround && !this.wasOnGround) {
            this.canJump = true; // Permite pulo ao aterrar

            // Toca o som de aterrissagem
            if (this.landingSound) {
                this.landingSound.currentTime = 0; // Reinicia o som
                this.landingSound.play().catch(err => console.error('Erro ao tocar som de aterrissagem:', err));
            }
        }
        // Atualiza o estado do chão para o próximo frame *depois* de verificar a transição
        this.wasOnGround = isOnGround;

        const forward = new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion).setY(0).normalize();
        const right   = new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion).setY(0).normalize();
        const wish    = new THREE.Vector3()
            .addScaledVector(forward, this.keys['KeyW'] ?  1 : this.keys['KeyS'] ? -1 : 0)
            .addScaledVector(right,   this.keys['KeyD'] ?  1 : this.keys['KeyA'] ? -1 : 0);

        const wishDir = wish.lengthSq() > 0 ? wish.clone().normalize() : new THREE.Vector3();
        const currentVel = new THREE.Vector3(this.body.velocity.x, 0, this.body.velocity.z); // Velocidade horizontal atual

        // --- Wall Interaction Logic ---
        let isTouchingWall = this.body.wallContactNormal !== null;
        let wallNormalTHREE = null;
        if (isTouchingWall) {
            // Converte a normal da parede de CANNON para THREE
            wallNormalTHREE = new THREE.Vector3(
                this.body.wallContactNormal.x,
                this.body.wallContactNormal.y,
                this.body.wallContactNormal.z
            );
            // Normaliza por segurança
            wallNormalTHREE.normalize();
        }
        // -----------------------------

        // --- Apply Movement ---
        if (this.canJump && this.keys['Space']) {
            // --- Jump Logic ---
            // Aplica fricção mesmo antes de pular para não deslizar estranho
            currentVel.multiplyScalar(Math.max(0, 1 - this.groundFriction * dt));
            this.body.velocity.y = this.jumpSpeed;
            this.canJump = false;
        } else if (isOnGround) {
            // --- Ground Movement ---
            currentVel.multiplyScalar(Math.max(0, 1 - this.groundFriction * dt)); // Aplica fricção
            this._accelerate(currentVel, wishDir, this.speed, this.maxGroundSpeed, dt);
        } else {
            // --- Air Movement ---
            let effectiveWishDir = wishDir.clone(); // Começa com a direção desejada normal

            // Se estiver no ar E tocando numa parede
            if (isTouchingWall) {
                // Projeta a direção desejada no plano da parede para evitar "subir"
                // wishDir = wishDir - wallNormal * dot(wishDir, wallNormal)
                const dot = effectiveWishDir.dot(wallNormalTHREE);
                if (dot < 0) { // Só projeta se estiver a tentar mover-se *contra* a parede
                    effectiveWishDir.subScaledVector(wallNormalTHREE, dot);
                    // Re-normaliza a direção projetada se ela ainda tiver magnitude
                    if (effectiveWishDir.lengthSq() > 1e-6) {
                         effectiveWishDir.normalize();
                    } else {
                         effectiveWishDir.set(0, 0, 0); // Anula o movimento se for diretamente na parede
                    }
                }

                 // Opcional: Reduzir ligeiramente a aceleração no ar ao tocar na parede
                 // airAccel *= 0.8;
            }

            // Usa a effectiveWishDir (modificada ou não) para acelerar no ar
            let airAccel = this.airAccel;
            // Opcional: Aumentar aceleração no ar se houver input (strafe jumping)
            // if (wish.lengthSq() > 0) airAccel *= 2.5; // Cuidado com este valor
            this._accelerate(currentVel, effectiveWishDir, airAccel, this.maxGroundSpeed * 1.2, dt); // Usa max speed ligeiramente maior no ar
        }

        // Aplica a velocidade horizontal calculada
        this.body.velocity.x = currentVel.x;
        this.body.velocity.z = currentVel.z;

        // Atualiza a posição da câmera
        this.camera.position.copy(this.body.position);
    }

    _accelerate(vel, wishDir, accel, maxSpeed, dt) {
        // Calcula a velocidade atual na direção desejada
        const currentSpeedInWishDir = vel.dot(wishDir);
        // Calcula a velocidade a adicionar
        const addSpeed = maxSpeed - currentSpeedInWishDir;

        // Se já estamos na velocidade máxima ou acima, não adiciona mais
        if (addSpeed <= 0) {
            return;
        }

        // Calcula a aceleração a aplicar neste frame, limitada pela aceleração máxima
        let accelSpeed = accel * dt * maxSpeed; // Ajuste Quake-like: accel * dt * max_vel

        // Limita a aceleração para não exceder a velocidade máxima
        accelSpeed = Math.min(accelSpeed, addSpeed);

        // Adiciona a velocidade acelerada à velocidade atual
        vel.addScaledVector(wishDir, accelSpeed);
    }
}