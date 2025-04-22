import { createBaseScene } from './scene_base.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createScene(world) {
    const scene = createBaseScene();

    const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
    const orangeMaterial = new THREE.MeshStandardMaterial({ color: 0xffa500 });
    // Gold color for the final checkpoint visual
    const finalCheckpointMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, transparent: true, opacity: 0.6 });

    const platforms = [
        { position: [0, 1, 0], size: [10, 1, 5], isCheckpoint: true },
        { position: [0, 1, 5], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, 10], size: [2.5, 0.25, 2.5] },
        { position: [-2, 1, 15], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, 20], size: [2.5, 0.25, 2.5] },
        { position: [-2, 1, 25], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, 30], size: [10, 1, 5], isCheckpoint: true },
        { position: [0, 1, 35], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, 40], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, 45], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, 50], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, 55], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, 60], size: [10, 1, 5], isCheckpoint: true },
        { position: [0, 1, 65], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, 70], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, 75], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, 80], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, 85], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, 90], size: [10, 1, 5], isCheckpoint: true, isFinal: true }, // Mark as final
    ];

    platforms.forEach(({ position, size, isCheckpoint, isFinal = false }) => {
        const material = size[0] === 10 ? orangeMaterial : platformMaterial;

        const geometry = new THREE.BoxGeometry(...size);
        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(...position);
        scene.add(platform);

        const shape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2));
        const body = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(...position),
            shape: shape,
        });
        world.addBody(body);

        // Adiciona listener de colisão para verificar a normal
        body.addEventListener('collide', (event) => {
            const contact = event.contact;
            const normal = contact.ni; // Normal da colisão (direção perpendicular)

            // Verifica se a colisão é na parte de cima da plataforma
            if (normal.y > 0.9) {
                // Permite o salto (colisão válida)
                event.body.isOnTop = true;
            } else {
                // Ignora colisões laterais
                event.body.isOnTop = false;
            }
        });

        // Adicionar checkpoint como um cubo invisível
        if (isCheckpoint) {
            const checkpointGeometry = new THREE.BoxGeometry(size[0], 2, size[2]);
            const checkpointMaterial = isFinal ? finalCheckpointMaterial.clone() : new THREE.MeshStandardMaterial({
                color: 0xff0000, // Vermelho inicialmente
                transparent: true,
                opacity: 0.5, // Visível para depuração
            });
            const checkpoint = new THREE.Mesh(checkpointGeometry, checkpointMaterial);
            checkpoint.position.set(position[0], position[1] + 1.5, position[2]);
            checkpoint.isCheckpoint = true; // Identificador para lógica
            scene.add(checkpoint);

            const checkpointShape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, 1, size[2] / 2));
            const checkpointBody = new CANNON.Body({
                mass: 0, // Sem massa, não afeta a física
                position: new CANNON.Vec3(position[0], position[1] + 1, position[2]),
                shape: checkpointShape,
                collisionResponse: false, // Desativa resposta de colisão
            });
            checkpointBody.isTrigger = true; // Marcador para lógica de detecção
            checkpointBody.isCheckpoint = true; // Identificador
            checkpointBody.isFinalCheckpoint = isFinal; // <-- Add the final flag here
            checkpointBody.visual = checkpoint; // Referência ao objeto visual
            world.addBody(checkpointBody);
        }
    });

    return scene;
}