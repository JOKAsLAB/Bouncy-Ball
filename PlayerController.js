import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GROUP_GROUND } from './collisionGroups.js';

export default class PlayerController {
    constructor(camera, domElement, body, world, opts = {}) {
        this.camera = camera
        this.dom = domElement
        this.body = body
        this.world = world
        this.checkpointManager = opts.checkpointManager;
        this.spawnYaw = opts.spawnYaw;

        Object.assign(this, {
            speed: 4,
            jumpSpeed: 3.75,
            airAccel: 3,
            groundFriction: 8,
            maxGroundSpeed: 5,
            rayLength: opts.rayLength || 1.1,
            mouseSens: 0.001,
            ...opts
        })

        this.pitch = 0; this.yaw = 0
        this.keys = {};
        this.canJump = false
        this.jumpQueued = false;
        this.wasOnGround = true;
        this.wallNormal = new CANNON.Vec3();

        this.landingSound = null;

        this.noclip = false;
        this.noclipSpeed = opts.noclipSpeed || 10;

        this.timeOnUnsafePlatform = 0;
        this.unsafePlatformGracePeriod = 0.75;

        this._origType = this.body.type;
        this._origCollision = this.body.collisionResponse;

        this.landingSound = new Audio('./assets/sound/land_1.mp3');
        this.landingSound.preload = 'auto';
        
        const masterVolume = parseFloat(localStorage.getItem('masterVolume') || '0.5');
        const sfxVolumeSetting = parseFloat(localStorage.getItem('sfxVolume') || '0.1'); 
        this.landingSound.volume = (0.25 * sfxVolumeSetting) * masterVolume;

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
            if (e.code === 'Space') this.jumpQueued = true;
        });
        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
            if (e.code === 'Space') this.jumpQueued = false;
        });
    }

    toggleNoclip() {
        this.noclip = !this.noclip;

        if (this.noclip) {
            this.body.type = CANNON.Body.KINEMATIC;
            this.body.collisionResponse = false;
        } else {
            this.body.type = this._origType;
            this.body.collisionResponse = this._origCollision;
            this.body.wakeUp();
        }

        this.body.velocity.setZero();
        return this.noclip;
    }

    fixedUpdate(dt) {
        this.body.wallContactNormal = null;

        if (this.noclip) {
            const dir = new THREE.Vector3();
            this.camera.getWorldDirection(dir);
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
            this._lastNoclipSpeed = move.length();
            this.body.position.vadd(
                new CANNON.Vec3(move.x*dt, move.y*dt, move.z*dt),
                this.body.position
            );
            this.camera.position.copy(this.body.position);
            return;
        }

        const rayStart = new CANNON.Vec3(this.body.position.x, this.body.position.y, this.body.position.z);
        const rayEnd = new CANNON.Vec3(this.body.position.x, this.body.position.y - this.rayLength, this.body.position.z);
        let isOnGroundCurrentFrame = false;
        const result = new CANNON.RaycastResult();
        let groundBody = null;

        this.world.raycastClosest(rayStart, rayEnd, { collisionFilterMask: GROUP_GROUND, skipBackfaces: true }, result);

        if (result.hasHit && (result.body.collisionFilterGroup & GROUP_GROUND)) {
             const playerRadius = this.body.shapes[0].radius;
             if (result.distance <= playerRadius + 0.1) {
                 isOnGroundCurrentFrame = true;
                 groundBody = result.body;
             }
        }

        if (isOnGroundCurrentFrame && !this.wasOnGround) {
            this.canJump = true;
            if (this.landingSound) {
                
                const masterVolume = parseFloat(localStorage.getItem('masterVolume') || '0.5');
                const sfxVolumeSetting = parseFloat(localStorage.getItem('sfxVolume') || '0.1');
                
                
                const baseLandingSoundVolume = 0.25; 

                this.landingSound.volume = (baseLandingSoundVolume * sfxVolumeSetting) * masterVolume;

                this.landingSound.currentTime = 0;
                this.landingSound.play().catch(err => console.error('Erro ao tocar som de aterrissagem:', err));
            }
        }

        const forward = new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion).setY(0).normalize();
        const right   = new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion).setY(0).normalize();
        const wish    = new THREE.Vector3()
            .addScaledVector(forward, this.keys['KeyW'] ?  1 : this.keys['KeyS'] ? -1 : 0)
            .addScaledVector(right,   this.keys['KeyD'] ?  1 : this.keys['KeyA'] ? -1 : 0);
        const wishDir = wish.lengthSq() > 0 ? wish.clone().normalize() : new THREE.Vector3();
        const currentVel = new THREE.Vector3(this.body.velocity.x, 0, this.body.velocity.z);

        let isTouchingWall = this.body.wallContactNormal !== null;
        let wallNormalTHREE = null;
        if (isTouchingWall) {
            wallNormalTHREE = new THREE.Vector3(this.body.wallContactNormal.x, this.body.wallContactNormal.y, this.body.wallContactNormal.z).normalize();
        }

        if (this.canJump && this.keys['Space']) {
            currentVel.multiplyScalar(Math.max(0, 1 - this.groundFriction * dt));
            this.body.velocity.y = this.jumpSpeed;
            this.canJump = false;
            this.wasOnGround = false;
            this.timeOnUnsafePlatform = 0;
            isOnGroundCurrentFrame = false;
        }

        if (isOnGroundCurrentFrame) {
            currentVel.multiplyScalar(Math.max(0, 1 - this.groundFriction * dt));
            this._accelerate(currentVel, wishDir, this.speed, this.maxGroundSpeed, dt);

            if (groundBody && groundBody.isUnsafePlatform) {
                this.timeOnUnsafePlatform += dt;
                if (this.timeOnUnsafePlatform > this.unsafePlatformGracePeriod) {
                    if (this.checkpointManager && typeof this.spawnYaw !== 'undefined') {
                        this.checkpointManager.respawnPlayer(this.camera, this, this.spawnYaw);
                    } else {
                        console.error("CheckpointManager ou spawnYaw não definidos no PlayerController!");
                    }
                    this.timeOnUnsafePlatform = 0;
                }
            } else {
                this.timeOnUnsafePlatform = 0;
            }

        } else {
            this.timeOnUnsafePlatform = 0;
            let effectiveWishDir = wishDir.clone();
            if (isTouchingWall) {
                const dot = effectiveWishDir.dot(wallNormalTHREE);
                if (dot < 0) {
                    effectiveWishDir.subScaledVector(wallNormalTHREE, dot);
                    if (effectiveWishDir.lengthSq() > 1e-6) {
                         effectiveWishDir.normalize();
                    } else {
                         effectiveWishDir.set(0, 0, 0);
                    }
                }
            }
            let airAccelToUse = this.airAccel;
            this._accelerate(currentVel, effectiveWishDir, airAccelToUse, this.maxGroundSpeed * 1.2, dt);
        }

        this.body.velocity.x = currentVel.x;
        this.body.velocity.z = currentVel.z;
        this.camera.position.copy(this.body.position);

        this.wasOnGround = isOnGroundCurrentFrame;
    }

    _accelerate(vel, wishDir, accel, maxSpeed, dt) {
        const currentSpeedInWishDir = vel.dot(wishDir);
        const addSpeed = maxSpeed - currentSpeedInWishDir;

        if (addSpeed <= 0) {
            return;
        }

        let accelSpeed = accel * dt * maxSpeed;

        accelSpeed = Math.min(accelSpeed, addSpeed);

        vel.addScaledVector(wishDir, accelSpeed);
    }
}