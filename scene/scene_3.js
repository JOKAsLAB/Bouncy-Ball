import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GROUP_PLAYER, GROUP_GROUND, GROUP_CHECKPOINT_TRIGGER } from '../collisionGroups.js'; // Ajusta o caminho
// Importar libs necessárias para RectAreaLight
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js'; // Opcional, para debug

// Aceita world, checkpointManager E groundWallMaterial
export function createScene(world, checkpointManager, groundWallMaterial) {
    // Cria uma nova cena vazia
    const scene = new THREE.Scene();

    // Inicializa RectAreaLight (necessário)
    RectAreaLightUniformsLib.init();

    // Define o fundo como preto
    scene.background = new THREE.Color(0x000000);

    // Adiciona uma luz ambiente muito fraca para que não fique totalmente invisível
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05); // Intensidade muito baixa
    scene.add(ambientLight);

    // Adiciona um array vazio para consistência, mesmo sem plataformas móveis
    const movingPlatforms = [];

    // --- Materiais com Cores Sólidas ---
    const platformMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x228b22, // Verde escuro pode ficar quase preto
        roughness: 0.9, // Aumentar roughness para menos reflexos
        metalness: 0.0
    });
    const orangeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffa500, // Laranja ainda será visível
        roughness: 0.8,
        metalness: 0.1
    });

    // Material para checkpoints normais (vermelho por defeito, opacidade controlada pelo manager)
    const checkpointMaterialBase = new THREE.MeshPhysicalMaterial({
        color: 0xff0000, // Cor inicial inativa
        roughness: 0.9,
        metalness: 0.0,
        transparent: true, // Precisa ser transparente para opacidade < 1
        emissive: 0x550000, // Adiciona um brilho próprio fraco
    });

    // Material para o checkpoint final (amarelo, opacidade controlada pelo manager)
    const finalCheckpointMaterialBase = new THREE.MeshPhysicalMaterial({
        color: 0xffff00, // Cor final
        roughness: 0.3,
        metalness: 0.6,
        transparent: true, // Precisa ser transparente para opacidade < 1
        emissive: 0x555500, // Adiciona um brilho próprio fraco
    });

    const platforms = [
        { position: [0, 1, 0], size: [10, 0.5, 5], isCheckpoint: true }, // Laranja/Checkpoint
        { position: [0, 1, 5], size: [2.5, 0.1, 2.5] }, // Verde
        { position: [0, 1, 10], size: [2.5, 0.1, 2.5] }, // Verde
        { position: [0, 1, 15], size: [2.5, 0.1, 2.5] }, // Verde
        { position: [0, 1, 20], size: [2.5, 0.1, 2.5] }, // Verde
        { position: [0, 1, 25], size: [2.5, 0.1, 2.5] }, // Verde

        { position: [0, 1, 30], size: [10, 0.5, 5], isCheckpoint: true }, // Laranja/Checkpoint
        { position: [0, 1, 35], size: [2.5, 0.1, 2.5] }, // Verde
        { position: [0, 1, 42], size: [2.5, 0.1, 2.5] }, // Verde
        { position: [0, 1, 49], size: [2.5, 0.1, 2.5] }, // Verde
        { position: [0, 1, 55], size: [2.5, 0.1, 2.5] }, // Verde

        { position: [0, 1, 60], size: [10, 0.5, 5], isCheckpoint: true }, // Laranja/Checkpoint
        { position: [0, 1, 65], size: [2.5, 0.1, 2.5] }, // Verde
        { position: [0, 1, 72], size: [2.5, 0.1, 2.5] }, // Verde
        { position: [0, 1, 79], size: [2.5, 0.1, 2.5] }, // Verde
        { position: [0, 1, 85], size: [2.5, 0.1, 2.5] }, // Verde

        { position: [0, 1, 90], size: [10, 0.5, 5], isCheckpoint: true, isFinal: true }, // Laranja/Checkpoint Final
    ];

    platforms.forEach(({ position, size, isCheckpoint, isFinal = false }) => {
        const isOrangePlatform = size[0] === 10; // Verifica se é a plataforma laranja/checkpoint
        const material = isOrangePlatform ? orangeMaterial : platformMaterial;

        const geometry = new THREE.BoxGeometry(...size);
        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(...position);
        scene.add(platform);

        const shape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2));
        const body = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(...position),
            shape: shape,
            material: groundWallMaterial,
            collisionFilterGroup: GROUP_GROUND,
            collisionFilterMask: GROUP_PLAYER
        });
        world.addBody(body);

        // --- Adicionar RectAreaLight para Plataformas Verdes ---
        if (!isOrangePlatform) {
            const rectLight = new THREE.RectAreaLight(
                0xffffff, // Cor (branca)
                5,        // Intensidade (ajuste conforme necessário - RectAreaLight usa unidades diferentes)
                size[0],  // Largura da luz (igual à largura X da plataforma)
                size[2]   // Altura da luz (igual à profundidade Z da plataforma)
            );

            // Posição da luz: ligeiramente acima da plataforma
            rectLight.position.set(position[0], position[1] + 3, position[2]); // Ajuste a altura Y se necessário

            // Apontar a luz para baixo (diretamente para a plataforma)
            rectLight.lookAt(position[0], position[1], position[2]);

            scene.add(rectLight); // Adiciona a luz à cena

            // (Opcional) Adicionar um helper para visualizar a área da luz
            // const rectLightHelper = new RectAreaLightHelper(rectLight);
            // scene.add(rectLightHelper);
        }
        // --- Fim Adicionar RectAreaLight ---

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