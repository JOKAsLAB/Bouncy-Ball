import * as THREE from 'three';

export default class CheckpointManager {
    constructor(world, playerBody, levelCompleteCallback = null) {
        this.world = world;
        this.playerBody = playerBody;
        this.lastCheckpoint = null;
        this.activeCheckpointVisual = null;
        this.initialCheckpointSet = false;
        this.levelCompleteCallback = levelCompleteCallback;
        this.completedLevel = false;
        this.checkpointOpacityState = 0.0; // Estado inicial: 0.0 (invisível)
        this.allCheckpointVisuals = []; // Array para guardar todos os visuais

        this.world.addEventListener('postStep', this._detectCheckpoints.bind(this));
    }

    // Método para registar um visual de checkpoint (chamar ao criar a cena)
    registerCheckpointVisual(visual) {
        if (visual && visual.material) {
            this.allCheckpointVisuals.push(visual);
            // Aplicar estado inicial de opacidade
            visual.material.opacity = this.checkpointOpacityState;
            visual.material.transparent = this.checkpointOpacityState < 1.0;
            visual.material.needsUpdate = true;
        }
    }

    // Método para alternar a opacidade
    toggleCheckpointOpacity() {
        // Alterna entre 0.5 e 0.0
        this.checkpointOpacityState = (this.checkpointOpacityState === 0.5) ? 0.0 : 0.5;
        const isTransparent = this.checkpointOpacityState < 1.0;
        console.log(`Checkpoint opacity set to: ${this.checkpointOpacityState}`);

        // Aplica a nova opacidade a todos os visuais registados
        this.allCheckpointVisuals.forEach(visual => {
            if (visual && visual.material) {
                visual.material.opacity = this.checkpointOpacityState;
                visual.material.transparent = isTransparent;
                visual.material.needsUpdate = true;
            }
        });
    }

    setInitialCheckpoint(initialPosition) {
        this.lastCheckpoint = initialPosition.clone();
        this.initialCheckpointSet = true;
        console.log('Initial checkpoint set:', this.lastCheckpoint);
    }

    respawnPlayer(camera, playerCtrl, spawnYaw) {
        const respawnPos = this.getLastCheckpoint() || new THREE.Vector3(0, 5, 0);

        this.playerBody.position.copy(respawnPos);
        this.playerBody.position.y += 1.0;
        this.playerBody.velocity.set(0, 0, 0);
        this.playerBody.angularVelocity.set(0, 0, 0);

        camera.position.copy(respawnPos);
        playerCtrl.yaw = spawnYaw;
        playerCtrl.pitch = 0;
        camera.quaternion.setFromEuler(new THREE.Euler(playerCtrl.pitch, playerCtrl.yaw, 0, 'YXZ'));

        playerCtrl.canJump = false;
        playerCtrl.wasOnGround = false;

        console.log('Player respawned at:', respawnPos);
    }

    _detectCheckpoints() {
        if (this.completedLevel) return;

        this.world.bodies.forEach(body => {
            if (body.isCheckpoint && body.isTrigger) {
                if (this._isPlayerInsideTrigger(body)) {
                    this._handleCheckpointActivation(body);
                }
            }
        });
    }

    _isPlayerInsideTrigger(body) {
        const playerPos = this.playerBody.position;
        const triggerPos = body.position;
        const triggerHalfExtents = body.shapes[0].halfExtents;

        const withinX = playerPos.x >= triggerPos.x - triggerHalfExtents.x &&
                        playerPos.x <= triggerPos.x + triggerHalfExtents.x;
        const withinY = playerPos.y >= triggerPos.y - triggerHalfExtents.y &&
                        playerPos.y <= triggerPos.y + triggerHalfExtents.y;
        const withinZ = playerPos.z >= triggerPos.z - triggerHalfExtents.z &&
                        playerPos.z <= triggerPos.z + triggerHalfExtents.z;

        return withinX && withinY && withinZ;
    }

    _handleCheckpointActivation(body) {
        const isTransparent = this.checkpointOpacityState < 1.0; // Obter estado de transparência

        if (body.isFinalCheckpoint && this.levelCompleteCallback) {
            console.log('Final checkpoint reached!');
            this.completedLevel = true;
            this.levelCompleteCallback();
        } else if (!body.isFinalCheckpoint && body.visual !== this.activeCheckpointVisual) {
            this.lastCheckpoint.copy(body.position);
            console.log('Checkpoint updated:', this.lastCheckpoint);

            // Restaura cor e opacidade do checkpoint anterior
            if (this.activeCheckpointVisual && this.activeCheckpointVisual.material) {
                this.activeCheckpointVisual.material.color.set(0xff0000); // Cor inativa
                this.activeCheckpointVisual.material.opacity = this.checkpointOpacityState;
                this.activeCheckpointVisual.material.transparent = isTransparent;
                this.activeCheckpointVisual.material.needsUpdate = true;
            }

            this.activeCheckpointVisual = body.visual;

            // Define cor e opacidade do novo checkpoint ativo
            if (this.activeCheckpointVisual && this.activeCheckpointVisual.material) {
                this.activeCheckpointVisual.material.color.set(0x00ff00); // Cor ativa
                this.activeCheckpointVisual.material.opacity = this.checkpointOpacityState;
                this.activeCheckpointVisual.material.transparent = isTransparent;
                this.activeCheckpointVisual.material.needsUpdate = true;
            }
        } else if (body.visual && body.visual.material && body.visual.material.opacity !== this.checkpointOpacityState) {
            // Garante que checkpoints não ativos mantêm a opacidade correta (caso tenha mudado)
            if (body.visual !== this.activeCheckpointVisual) {
                body.visual.material.opacity = this.checkpointOpacityState;
                body.visual.material.transparent = isTransparent;
                body.visual.material.needsUpdate = true;
            }
        }
    }

    getLastCheckpoint() {
        return this.lastCheckpoint && this.initialCheckpointSet ? this.lastCheckpoint : null;
    }

    destroy() {
        this.world.removeEventListener('postStep', this._detectCheckpoints.bind(this));
        this.allCheckpointVisuals = []; // Limpa a referência
    }
}