import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GROUP_PLAYER, GROUP_GROUND, GROUP_CHECKPOINT_TRIGGER } from '../collisionGroups.js';
import { createBaseScene } from './scene_base.js';

export async function createScene(world, checkpointManager, groundWallMaterial) {
    // Obtém a cena base (que carrega o HDRI para scene.background e scene.environment)
    const scene = await createBaseScene('kloppenheim_02_puresky_1k.hdr');

    // --- CONFIGURAR FUNDO PRETO E ILUMINAÇÃO ZERO ---

    // 1. Definir o fundo como preto sólido
    scene.background = new THREE.Color(0x000000);

    // 2. Remover completamente a contribuição de LUZ e REFLEXOS do HDRI
    scene.environmentIntensity = 0; // Zero luz vinda do ambiente HDRI
    scene.environment = null;       // Remove o HDRI dos cálculos de reflexo PBR

    // 3. Desligar/Remover outras luzes gerais
    scene.traverse((object) => {
        // Desliga a DirectionalLight vinda da base
        if (object instanceof THREE.DirectionalLight) {
            object.intensity = 0; // Intensidade zero
            object.castShadow = false;
            console.log("DirectionalLight intensity set to 0 for scene 3.");
        }
        // Remove a AmbientLight vinda da base
        if (object instanceof THREE.AmbientLight) {
             scene.remove(object);
             console.log("AmbientLight removed for scene 3.");
        }
    });

    // 4. Garantir que NENHUMA AmbientLight é adicionada aqui
    // const ambientLight = new THREE.AmbientLight(0xffffff, 0.1); // REMOVIDO/COMENTADO
    // scene.add(ambientLight); // REMOVIDO/COMENTADO

    // --- FIM CONFIGURAR FUNDO PRETO E ILUMINAÇÃO ZERO ---

    const movingPlatforms = [];
    let movingLightData = null;
    const sequencedSpotlights = [];
    const randomSpotlights = [];

    // --- Materiais ---
    // Remove a cor emissiva das plataformas verdes
    const platformMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x228b22,       // Cor base (verde floresta)
        roughness: 0.9,
        metalness: 0.0
        // emissive: 0x004400,    // REMOVIDO
        // emissiveIntensity: 1.0 // REMOVIDO
    });
    // Mantém a cor emissiva para as plataformas laranjas
    const orangeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffa500,       // Cor base (laranja)
        roughness: 0.8,
        metalness: 0.1,
        emissive: 0x884400,    // Cor emissiva (laranja escuro)
        emissiveIntensity: 1.0 // Intensidade do brilho
    });

    // Mantém a cor emissiva para os checkpoints
    const checkpointMaterialBase = new THREE.MeshPhysicalMaterial({
        color: 0xff0000,
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        emissive: 0x550000,    // Vermelho escuro emissivo
        emissiveIntensity: 1.5
     });
    const finalCheckpointMaterialBase = new THREE.MeshPhysicalMaterial({
        color: 0xffff00,
        roughness: 0.3,
        metalness: 0.6,
        transparent: true,
        emissive: 0x555500,    // Amarelo escuro emissivo
        emissiveIntensity: 2.0
    });

    // --- Luz Móvel Inicial ---
    const movingLight = new THREE.PointLight(0xffffff, 10, 5);
    movingLight.position.set(0, 3, 1);
    scene.add(movingLight);
    const lightPathPoints = [ { z: 5, x: -1 }, { z: 10, x: 2 }, { z: 15, x: -2 }, { z: 20, x: 3 }, { z: 25, x: 0 }, ];
    lightPathPoints.sort((a, b) => a.z - b.z);
    movingLightData = { light: movingLight, pathPoints: lightPathPoints, speed: 0.75 };

    const platforms = [
        // checkpoint 0 e primeira secção
        { position: [0, 1, 0], size: [10, 0.5, 5], isCheckpoint: true },
        { position: [-1, 1, 5], size: [2.5, 0.1, 2.5], skipSpotlight: true },
        { position: [2, 1, 10], size: [2.5, 0.1, 2.5], skipSpotlight: true },
        { position: [-2, 1, 15], size: [2.5, 0.1, 2.5], skipSpotlight: true },
        { position: [3, 1, 20], size: [2.5, 0.1, 2.5], skipSpotlight: true },
        { position: [0, 1, 25], size: [2.5, 0.1, 2.5], skipSpotlight: true },

        // checkpoint 1
        { position: [0, 1, 30], size: [10, 0.5, 5], isCheckpoint: true },
        // Plataformas da sequência ordenada
        { position: [1, 1, 35], size: [2.5, 0.1, 2.5], inSequence: true },
        { position: [-2, 1, 42], size: [2.5, 0.1, 2.5], inSequence: true },
        { position: [2, 1, 49], size: [2.5, 0.1, 2.5], inSequence: true },
        { position: [0, 1, 55], size: [2.5, 0.1, 2.5], inSequence: true },

        // checkpoint 2
        { position: [0, 1, 60], size: [10, 0.5, 5], isCheckpoint: true },
        // Plataformas da sequência aleatória
        { position: [-1, 1, 65], size: [2.5, 0.1, 2.5], isRandomSequence: true },
        { position: [3, 1, 72], size: [2.5, 0.1, 2.5], isRandomSequence: true },
        { position: [-1, 1, 79], size: [2.5, 0.1, 2.5], isRandomSequence: true },
        { position: [1, 1, 86], size: [2.5, 0.1, 2.5], isRandomSequence: true },

        // checkpoint final
        { position: [0, 1, 91], size: [10, 0.5, 5], isCheckpoint: true, isFinal: true },
    ];

    platforms.forEach(({ position, size, isCheckpoint, isFinal = false, skipSpotlight = false, inSequence = false, isRandomSequence = false }) => {
        const isOrangePlatform = size[0] === 10;
        const material = isOrangePlatform ? orangeMaterial : platformMaterial;
        const geometry = new THREE.BoxGeometry(...size);
        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(...position);
        scene.add(platform);
        const shape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2));
        const body = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(...position), shape: shape, material: groundWallMaterial, collisionFilterGroup: GROUP_GROUND, collisionFilterMask: GROUP_PLAYER });
        world.addBody(body);

        if (!isOrangePlatform && !skipSpotlight && !inSequence && !isRandomSequence) {
            const spotLight = new THREE.SpotLight(0xffffff, 10, 15, Math.PI / 7.5, 0.3, 1.5);
            spotLight.position.set(position[0], position[1] + 5, position[2]);
            spotLight.target.position.set(position[0], position[1], position[2]);
            scene.add(spotLight.target);
            scene.add(spotLight);
        }
        if (inSequence) {
            const sequenceLight = new THREE.SpotLight(0xffffff, 10, 15, Math.PI / 7.5, 0.3, 1.5);
            sequenceLight.position.set(position[0], position[1] + 5, position[2]);
            sequenceLight.target.position.set(position[0], position[1], position[2]);
            scene.add(sequenceLight.target);
            scene.add(sequenceLight);
            sequenceLight.visible = false;
            sequencedSpotlights.push(sequenceLight);
        }
        if (isRandomSequence) {
            const randomLight = new THREE.SpotLight(0xffffff, 10, 15, Math.PI / 7.5, 0.3, 1.5);
            randomLight.position.set(position[0], position[1] + 5, position[2]);
            randomLight.target.position.set(position[0], position[1], position[2]);
            scene.add(randomLight.target);
            scene.add(randomLight);
            randomLight.visible = false;
            randomSpotlights.push(randomLight);
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
            const checkpointBody = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(position[0], position[1] + 1, position[2]), shape: checkpointShape, isTrigger: true, collisionFilterGroup: GROUP_CHECKPOINT_TRIGGER, collisionFilterMask: GROUP_PLAYER });
            checkpointBody.isCheckpoint = true; checkpointBody.isFinalCheckpoint = isFinal; checkpointBody.visual = checkpointVisual; world.addBody(checkpointBody);
        }
    });

    return { scene, movingPlatforms, movingLightData, sequencedSpotlights, randomSpotlights };
}