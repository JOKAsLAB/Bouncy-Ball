import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export default class PlayerController {
    constructor(camera, domElement, body, world, opts = {}) {
        this.camera = camera
        this.dom = domElement
        this.body = body
        this.world = world
        Object.assign(this, {
            speed: 4,
            jumpSpeed: 4,
            airAccel: 1,
            groundFriction: 8,
            maxGroundSpeed: 5,
            rayLength: 1.1,
            mouseSens: 0.002,
            ...opts
        })

        this.pitch = 0; this.yaw = 0
        this.keys = {}; 
        this.canJump = false
        this.jumpQueued = false; // novo: para detectar pulo no keydown
        this.wasOnGround = false; // novo: para detectar transição de chão

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

    fixedUpdate(dt) {
        // Raycast para baixo para detectar chão/plataforma
        const rayStart = new CANNON.Vec3(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );
        const rayEnd = new CANNON.Vec3(
            this.body.position.x,
            this.body.position.y - this.rayLength, // rayLength ~ raio do player + tolerância
            this.body.position.z
        );
        let isOnGround = false;
        const result = new CANNON.RaycastResult();
        this.world.raycastClosest(rayStart, rayEnd, {
            skipBackfaces: true // ignora faces de baixo das plataformas
        }, result);
        if (result.hasHit && result.distance < this.rayLength - 0.05) isOnGround = true; // só se está bem perto

        // Permite pulo só se acabou de tocar no chão
        if (isOnGround && !this.wasOnGround) {
            this.canJump = true;
        }
        this.wasOnGround = isOnGround;

        const forward = new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion).setY(0).normalize();
        const right   = new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion).setY(0).normalize();
        const wish    = new THREE.Vector3()
            .addScaledVector(forward, this.keys['KeyW'] ?  1 : this.keys['KeyS'] ? -1 : 0)
            .addScaledVector(right,   this.keys['KeyD'] ?  1 : this.keys['KeyA'] ? -1 : 0);

        const wishDir = wish.lengthSq() > 0 ? wish.clone().normalize() : new THREE.Vector3();
        const vel = new THREE.Vector3(this.body.velocity.x,0,this.body.velocity.z);

        if (this.canJump && this.keys['Space']) {
            vel.multiplyScalar(Math.max(0, 1 - this.groundFriction * dt));
            this.body.velocity.y = this.jumpSpeed;
            this.canJump = false; // só permite novo pulo após tocar no chão de novo
        } else if (isOnGround) {
            vel.multiplyScalar(Math.max(0, 1 - this.groundFriction * dt));
            this._accelerate(vel, wishDir, this.speed, this.maxGroundSpeed, dt);
        } else {
            let airAccel = this.airAccel;
            if (wish.lengthSq() > 0) airAccel *= 2.5;
            this._accelerate(vel, wishDir, airAccel, this.maxGroundSpeed * 1.2, dt);
        }

        this.body.velocity.x = vel.x;
        this.body.velocity.z = vel.z;
        this.camera.position.copy(this.body.position);
    }

    _accelerate(vel, wish, accel, max, dt) {
        const proj = vel.dot(wish)
        const add  = Math.max(0, max - proj)
        if (add <= 0) return
        const amt = Math.min(accel * dt * max, add)
        vel.addScaledVector(wish, amt)
    }
}