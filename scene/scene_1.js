import { createBaseScene } from './scene_base.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GROUP_PLAYER, GROUP_GROUND, GROUP_CHECKPOINT_TRIGGER } from '../collisionGroups.js'; // Ajusta o caminho

// Aceita world, checkpointManager E groundWallMaterial
export function createScene(world, checkpointManager, groundWallMaterial) {
    const scene = createBaseScene();
    // Adiciona um array vazio para consistência, mesmo sem plataformas móveis
    const movingPlatforms = [];

    // --- Materiais com Cores Sólidas ---
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

    // Material para checkpoints normais (vermelho por defeito, opacidade controlada pelo manager)
    const checkpointMaterialBase = new THREE.MeshPhysicalMaterial({
        color: 0xff0000, // Cor inicial inativa
        roughness: 0.9,
        metalness: 0.0,
        transparent: true, // Precisa ser transparente para opacidade < 1
    });

    // Material para o checkpoint final (amarelo, opacidade controlada pelo manager)
    const finalCheckpointMaterialBase = new THREE.MeshPhysicalMaterial({
        color: 0xffff00, // Cor final
        roughness: 0.3,
        metalness: 0.6,
        transparent: true, // Precisa ser transparente para opacidade < 1
    });

    const platforms = [
        { position: [0, 1, 0], size: [10, 0.5, 5], isCheckpoint: true },
        { position: [0, 1, 5], size: [2.5, 0.1, 2.5] },
        { position: [1, 1, 10], size: [2.5, 0.1, 2.5] },
        { position: [0, 1, 15], size: [2.5, 0.1, 2.5] },
        { position: [1, 1, 20], size: [2.5, 0.1, 2.5] },
        { position: [-1, 1, 25], size: [2.5, 0.1, 2.5] },

        { position: [0, 1, 30], size: [10, 0.5, 5], isCheckpoint: true },
        { position: [2, 1, 35], size: [2.5, 0.1, 2.5] },
        { position: [-1, 1, 42], size: [2.5, 0.1, 2.5] },
        { position: [1, 1, 49], size: [2.5, 0.1, 2.5] },
        { position: [0, 1, 55], size: [2.5, 0.1, 2.5] },

        { position: [0, 1, 60], size: [10, 0.5, 5], isCheckpoint: true },
        { position: [1, 1, 65], size: [2.5, 0.1, 2.5] },
        { position: [-3, 1, 72], size: [2.5, 0.1, 2.5] },
        { position: [1, 1, 79], size: [2.5, 0.1, 2.5] },
        { position: [-1, 1, 85], size: [2.5, 0.1, 2.5] },

        { position: [0, 1, 90], size: [10, 0.5, 5], isCheckpoint: true, isFinal: true }, // Mark as final
    ];

    platforms.forEach(({ position, size, isCheckpoint, isFinal = false }) => {
        const material = size[0] === 10 ? orangeMaterial : platformMaterial;
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
            material: groundWallMaterial, // APLICA O MATERIAL AQUI
            // --- Configuração de Colisão ---
            collisionFilterGroup: GROUP_GROUND,
            // O chão colide APENAS com o jogador
            collisionFilterMask: GROUP_PLAYER
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

        // Adicionar trigger visual para checkpoint
        if (isCheckpoint) {
            const checkpointGeometry = new THREE.BoxGeometry(size[0], 2, size[2]); // Geometria do trigger visual
            // Clona o material base apropriado (normal ou final)
            const checkpointMaterial = isFinal ? finalCheckpointMaterialBase.clone() : checkpointMaterialBase.clone();

            const checkpointVisual = new THREE.Mesh(checkpointGeometry, checkpointMaterial);
            // Posiciona o trigger visual ligeiramente acima da plataforma
            checkpointVisual.position.set(position[0], position[1] + 1.25, position[2]); // Ajuste a altura Y conforme necessário
            checkpointVisual.isCheckpointVisual = true; // Marcação opcional

            // ADICIONA O VISUAL À CENA
            scene.add(checkpointVisual);

            // REGISTA O VISUAL NO MANAGER
            // O manager vai definir a opacidade inicial correta (0.5 ou 0.0)
            checkpointManager.registerCheckpointVisual(checkpointVisual);

            // Corpo físico do trigger (sem visual direto, mas com referência)
            const checkpointShape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, 1, size[2] / 2)); // Tamanho físico do trigger
            const checkpointBody = new CANNON.Body({
                mass: 0,
                // Posição física do trigger (pode ser a mesma do visual ou ligeiramente diferente)
                position: new CANNON.Vec3(position[0], position[1] + 1, position[2]),
                shape: checkpointShape,
                isTrigger: true, // Marca como trigger para não ter colisões físicas normais
                // --- Configuração de Colisão ---
                collisionFilterGroup: GROUP_CHECKPOINT_TRIGGER,
                // O trigger "colide" logicamente APENAS com o jogador (para deteção, não física)
                collisionFilterMask: GROUP_PLAYER
            });
            checkpointBody.isCheckpoint = true; // Marcação para o manager
            checkpointBody.isFinalCheckpoint = isFinal;
            checkpointBody.visual = checkpointVisual; // Associa o corpo físico ao visual
            world.addBody(checkpointBody);
        }
    });

    return { scene, movingPlatforms }; // Modificado para retornar também movingPlatforms
}