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

        this.world.addEventListener('postStep', this._detectCheckpoints.bind(this));
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
        if (body.isFinalCheckpoint && this.levelCompleteCallback) {
            console.log('Final checkpoint reached!');
            this.completedLevel = true;
            this.levelCompleteCallback();
        } else if (!body.isFinalCheckpoint && body.visual !== this.activeCheckpointVisual) {
            this.lastCheckpoint.copy(body.position);
            console.log('Checkpoint updated:', this.lastCheckpoint);

            if (this.activeCheckpointVisual) {
                this.activeCheckpointVisual.material.color.set(0xff0000);
            }
            this.activeCheckpointVisual = body.visual;
            if (this.activeCheckpointVisual) {
                this.activeCheckpointVisual.material.color.set(0x00ff00);
            }
        }
    }

    getLastCheckpoint() {
        return this.lastCheckpoint && this.initialCheckpointSet ? this.lastCheckpoint : null;
    }

    destroy() {
        this.world.removeEventListener('postStep', this._detectCheckpoints.bind(this));
    }
}