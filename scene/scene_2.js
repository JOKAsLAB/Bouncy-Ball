import { createBaseScene } from './scene_base.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GROUP_PLAYER, GROUP_GROUND, GROUP_CHECKPOINT_TRIGGER } from '../collisionGroups.js';

// Torna a função async
export async function createScene(world, checkpointManager, groundWallMaterial) {
    // Usa await para esperar pela Promise de createBaseScene
    const scene = await createBaseScene('kloofendal_48d_partly_cloudy_puresky_1k.hdr');
    const movingPlatforms = []; // Array para guardar dados das plataformas móveis

    // --- Materiais ---
    const platformMaterial = new THREE.MeshPhysicalMaterial({ color: 0x228b22, roughness: 0.7, metalness: 0.1 });
    const movingPlatformMaterial = new THREE.MeshPhysicalMaterial({ color: 0x8B4513, roughness: 0.6, metalness: 0.2 }); // Cor diferente para móveis
    const orangeMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffa500, roughness: 0.5, metalness: 0.2 });
    const checkpointMaterialBase = new THREE.MeshPhysicalMaterial({ color: 0xff0000, roughness: 0.9, metalness: 0.0, transparent: true });
    const finalCheckpointMaterialBase = new THREE.MeshPhysicalMaterial({ color: 0xffff00, roughness: 0.3, metalness: 0.6, transparent: true });

    const platforms = [
        // checkpoint 0
        { position: [0, 1, 0], size: [10, 0.5, 5], isCheckpoint: true },
        {
            position: [0, 1, 5], size: [2.5, 0.1, 2.5], material: movingPlatformMaterial,
            movement: { axis: 'x', distance: 2.5, speed: 1, offset: 0 }
        },
        {
            position: [0, 1, 10], size: [2.5, 0.1, 2.5], material: movingPlatformMaterial,
            movement: { axis: 'x', distance: 2.5, speed: 1, offset: -1 }
        },
        {
            position: [0, 1, 15], size: [2.5, 0.1, 2.5], material: movingPlatformMaterial,
            movement: { axis: 'x', distance: 2.5, speed: 1, offset: 2 }
        },
        {
            position: [0, 1, 20], size: [2.5, 0.1, 2.5], material: movingPlatformMaterial,
            movement: { axis: 'x', distance: 2.5, speed: 1, offset: -2 }
        },
        {
            position: [0, 1, 25], size: [2.5, 0.1, 2.5], material: movingPlatformMaterial,
            movement: { axis: 'x', distance: 2.5, speed: 1, offset: 1 }
        },

        // checkpoint 1
        { position: [0, 1, 30], size: [10, 0.5, 5], isCheckpoint: true },
        {
            position: [0, 1, 35], size: [2.5, 0.1, 2.5], material: movingPlatformMaterial,
            movement: { axis: 'x', distance: 3.75, speed: 1, offset: -3 }
        },
        {
            position: [0, 1, 42], size: [2.5, 0.1, 2.5], material: movingPlatformMaterial,
            movement: { axis: 'x', distance: 3.75, speed: 1, offset: 2 }
        },
        {
            position: [0, 1, 49], size: [2.5, 0.1, 2.5], material: movingPlatformMaterial,
            movement: { axis: 'x', distance: 3.75, speed: 1, offset: -1 }
        },
        {
            position: [0, 1, 55], size: [2.5, 0.1, 2.5], material: movingPlatformMaterial,
            movement: { axis: 'x', distance: 3.75, speed: 1, offset: 4 }
        },

        // checkpoint 2
        { position: [0, 1, 60], size: [10, 0.5, 5], isCheckpoint: true },
        {
            position: [0, 1, 65], size: [2.5, 0.1, 2.5], material: movingPlatformMaterial,
            movement: { axis: 'x', distance: 5, speed: 1, offset: -3 }
        },
        {
            position: [0, 1, 72], size: [2.5, 0.1, 2.5], material: movingPlatformMaterial,
            movement: { axis: 'x', distance: 5, speed: 1, offset: 4 }
        },
        {
            position: [0, 1, 79], size: [2.5, 0.1, 2.5], material: movingPlatformMaterial,
            movement: { axis: 'x', distance: 5, speed: 1, offset: 0 }
        },
        {
            position: [0, 1, 85], size: [2.5, 0.1, 2.5], material: movingPlatformMaterial,
            movement: { axis: 'x', distance: 5, speed: 1.5, offset: 1 }
        },

        { position: [0, 1, 90], size: [10, 0.5, 5], isCheckpoint: true, isFinal: true },
    ];

    // O restante do código (forEach, criação de bodies, etc.) permanece o mesmo
    platforms.forEach((platformData) => {
        const { position, size, isCheckpoint, isFinal = false, material: meshMaterial = platformMaterial, movement } = platformData;

        const geometry = new THREE.BoxGeometry(...size);
        const platform = new THREE.Mesh(geometry, meshMaterial);
        platform.position.set(...position);
        platform.castShadow = true;
        platform.receiveShadow = true;
        scene.add(platform);

        const shape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2));
        const bodyType = movement ? CANNON.Body.KINEMATIC : CANNON.Body.STATIC;

        const body = new CANNON.Body({
            type: bodyType,
            position: new CANNON.Vec3(...position),
            shape: shape,
            material: groundWallMaterial,
            collisionFilterGroup: GROUP_GROUND,
            collisionFilterMask: GROUP_PLAYER
        });
        world.addBody(body);

        if (movement) {
            movingPlatforms.push({
                mesh: platform,
                body: body,
                initialPosition: new CANNON.Vec3(...position),
                movement: movement
            });
        }

        if (isCheckpoint) {
            const checkpointGeometry = new THREE.BoxGeometry(size[0], 2, size[2]);
            const checkpointMaterial = isFinal ? finalCheckpointMaterialBase.clone() : checkpointMaterialBase.clone();
            const checkpointVisual = new THREE.Mesh(checkpointGeometry, checkpointMaterial);
            checkpointVisual.position.set(position[0], position[1] + 1.25, position[2]);
            checkpointVisual.isCheckpointVisual = true;
            scene.add(checkpointVisual);
            checkpointManager.registerCheckpointVisual(checkpointVisual);

            const checkpointShape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, 1, size[2] / 2));
            const checkpointBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(position[0], position[1] + 1, position[2]),
                shape: checkpointShape,
                isTrigger: true,
                collisionFilterGroup: GROUP_CHECKPOINT_TRIGGER,
                collisionFilterMask: GROUP_PLAYER
            });
            checkpointBody.isCheckpoint = true;
            checkpointBody.isFinalCheckpoint = isFinal;
            checkpointBody.visual = checkpointVisual;
            world.addBody(checkpointBody);
        }
    });

    return { scene, movingPlatforms };
}