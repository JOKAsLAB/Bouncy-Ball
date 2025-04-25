import { createBaseScene } from './scene_base.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createScene(world) {
    const scene = createBaseScene();

    /* --- Texturas (Comentado para usar cores sólidas) ---
    const textureLoader = new THREE.TextureLoader();
    const grassTexture = textureLoader.load('assets/textures/grass.jpg');
    const metalTexture = textureLoader.load('assets/textures/metal_plate.jpg');

    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    metalTexture.wrapS = THREE.RepeatWrapping;
    metalTexture.wrapT = THREE.RepeatWrapping;
    */

    // --- Materiais com Cores Sólidas (Usando MeshPhysicalMaterial) ---
    const platformMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x228b22,
        roughness: 0.7,
        metalness: 0.1
    });
    const orangeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffa500,
        roughness: 0.5,
        metalness: 0.2
    });
    /* --- Materiais com Texturas (Comentado) ---
    // Se usares texturas com Physical, podes ajustar roughness/metalness
    const platformMaterial = new THREE.MeshPhysicalMaterial({ map: grassTexture, roughness: 0.8, metalness: 0.0 });
    const checkpointPlatformMaterial = new THREE.MeshPhysicalMaterial({ map: metalTexture, roughness: 0.2, metalness: 0.8 });
    */

    // Gold color for the final checkpoint visual trigger (Invisible)
    const finalCheckpointMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffd700,
        roughness: 0.3,
        metalness: 0.6,
        transparent: true,
        opacity: 0 // Tornar invisível
    });

    const platforms = [
        { position: [0, 1, 0], size: [10, 0.5, 5], isCheckpoint: true },
        { position: [0, 1, 5], size: [2.5, 0.25, 2.5] },
        { position: [1, 1, 10], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, 15], size: [2.5, 0.25, 2.5] },
        { position: [1, 1, 20], size: [2.5, 0.25, 2.5] },
        { position: [-1, 1, 25], size: [2.5, 0.25, 2.5] },

        { position: [0, 1, 30], size: [10, 0.5, 5], isCheckpoint: true },
        { position: [2, 1, 35], size: [2.5, 0.25, 2.5] },
        { position: [-1, 1, 42], size: [2.5, 0.25, 2.5] },
        { position: [1, 1, 49], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, 55], size: [2.5, 0.25, 2.5] },

        { position: [0, 1, 60], size: [10, 0.5, 5], isCheckpoint: true },
        { position: [1, 1, 65], size: [2.5, 0.25, 2.5] },
        { position: [-3, 1, 72], size: [2.5, 0.25, 2.5] },
        { position: [1, 1, 79], size: [2.5, 0.25, 2.5] },
        { position: [-1, 1, 85], size: [2.5, 0.25, 2.5] },
        
        { position: [0, 1, 90], size: [10, 0.5, 5], isCheckpoint: true, isFinal: true }, // Mark as final
    ];

    platforms.forEach(({ position, size, isCheckpoint, isFinal = false }) => {
        const material = size[0] === 10 ? orangeMaterial : platformMaterial;

        /* --- Ajuste de Textura (Comentado) ---
        // Ajustar repetição da textura baseado no tamanho da plataforma (opcional, mas recomendado)
        const textureRepeatX = size[0] / 4; // Ajusta '4' conforme necessário
        const textureRepeatZ = size[2] / 4; // Ajusta '4' conforme necessário
        material.map.repeat.set(textureRepeatX, textureRepeatZ);
        material.map.needsUpdate = true; // Informa Three.js para atualizar a textura
        */

        const geometry = new THREE.BoxGeometry(...size);
        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(...position);

        platform.castShadow = true;
        platform.receiveShadow = true;

        scene.add(platform);

        const shape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2));
        const body = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(...position),
            shape: shape,
        });
        world.addBody(body);

        body.addEventListener('collide', (event) => {
            const contact = event.contact;
            const normal = contact.ni;
            if (normal.y > 0.9) {
                event.body.isOnTop = true;
            } else {
                event.body.isOnTop = false;
            }
        });

        // Adicionar checkpoint como um cubo invisível
        if (isCheckpoint) {
            const checkpointGeometry = new THREE.BoxGeometry(size[0], 2, size[2]);
            // Usar o material final (já invisível) ou criar um material vermelho invisível
            const checkpointMaterial = isFinal ? finalCheckpointMaterial.clone() : new THREE.MeshPhysicalMaterial({
                color: 0xff0000,
                roughness: 0.9,
                metalness: 0.0,
                transparent: true,
                opacity: 0 // Tornar invisível
            });
            const checkpoint = new THREE.Mesh(checkpointGeometry, checkpointMaterial);
            checkpoint.position.set(position[0], position[1] + 1.5, position[2]);
            checkpoint.isCheckpoint = true;
            // Não adicionar o mesh visual à cena se for para ser invisível
            // scene.add(checkpoint); // Comentado ou removido

            // O corpo físico ainda é necessário para a deteção de trigger
            const checkpointShape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, 1, size[2] / 2));
            const checkpointBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(position[0], position[1] + 1, position[2]),
                shape: checkpointShape,
                collisionResponse: false,
            });
            checkpointBody.isTrigger = true;
            checkpointBody.isCheckpoint = true;
            checkpointBody.isFinalCheckpoint = isFinal;
            // A referência visual pode ser removida ou mantida, mas o objeto não está na cena
            checkpointBody.visual = checkpoint;
            world.addBody(checkpointBody);
        }
    });

    return scene;
}