import * as CANNON from 'cannon-es';
import { GROUP_PLAYER, GROUP_GROUND } from './collisionGroups.js';

// Aceita o material físico como argumento
export function createPlayerBody(playerMaterial) {
    const radius = 1;
    const body = new CANNON.Body({
        mass: 5,
        shape: new CANNON.Sphere(radius),
        position: new CANNON.Vec3(0, 5, 0),
        fixedRotation: true,
        material: playerMaterial, // <--- APLICA O MATERIAL AQUI

        collisionFilterGroup: GROUP_PLAYER,
        collisionFilterMask: GROUP_GROUND // Continua a colidir apenas com o grupo GROUND
    });
    return body;
}