import { createBaseScene } from './scene_base.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GROUP_PLAYER, GROUP_GROUND, GROUP_CHECKPOINT_TRIGGER } from '../collisionGroups.js';

// Torna a função async
export async function createScene(world, checkpointManager, groundWallMaterial) {
    // Usa await para esperar pela Promise de createBaseScene
    const scene = await createBaseScene('kloofendal_48d_partly_cloudy_puresky_1k.hdr');
    const movingPlatforms = [];

    // --- Carregar Texturas PBR ---
    const textureLoader = new THREE.TextureLoader();

    // Texturas para Plataformas Móveis (PaintedWood003)
    let movingWoodColorTexture = null;
    let movingWoodNormalTexture = null;
    let movingWoodRoughnessTexture = null;
    let movingWoodDisplacementTexture = null;
    const movingWoodTexturePath = 'assets/textures/PaintedWood003_1K-JPG/';

    try {
        movingWoodColorTexture = await textureLoader.loadAsync(`${movingWoodTexturePath}PaintedWood003_1K-JPG_Color.jpg`);
        movingWoodColorTexture.colorSpace = THREE.SRGBColorSpace;
        movingWoodColorTexture.wrapS = THREE.RepeatWrapping;
        movingWoodColorTexture.wrapT = THREE.RepeatWrapping;
        console.log("Textura de Cor (Wood para plataformas móveis) carregada.");

        movingWoodNormalTexture = await textureLoader.loadAsync(`${movingWoodTexturePath}PaintedWood003_1K-JPG_NormalGL.jpg`);
        movingWoodNormalTexture.wrapS = THREE.RepeatWrapping;
        movingWoodNormalTexture.wrapT = THREE.RepeatWrapping;
        console.log("Textura Normal (Wood para plataformas móveis) carregada.");

        movingWoodRoughnessTexture = await textureLoader.loadAsync(`${movingWoodTexturePath}PaintedWood003_1K-JPG_Roughness.jpg`);
        movingWoodRoughnessTexture.wrapS = THREE.RepeatWrapping;
        movingWoodRoughnessTexture.wrapT = THREE.RepeatWrapping;
        console.log("Textura Roughness (Wood para plataformas móveis) carregada.");

        movingWoodDisplacementTexture = await textureLoader.loadAsync(`${movingWoodTexturePath}PaintedWood003_1K-JPG_Displacement.jpg`);
        movingWoodDisplacementTexture.wrapS = THREE.RepeatWrapping;
        movingWoodDisplacementTexture.wrapT = THREE.RepeatWrapping;
        console.log("Textura Displacement (Wood para plataformas móveis) carregada.");

    } catch (error) {
        console.error("Erro ao carregar uma ou mais texturas PBR (Wood Móvel):", error);
    }

    // Texturas para Plataformas de Checkpoint Estáticas (PaintedWood009B)
    let staticWoodColorTexture = null;
    let staticWoodNormalTexture = null;
    let staticWoodRoughnessTexture = null;
    let staticWoodDisplacementTexture = null;
    // let staticWoodAoTexture = null; // Descomente se tiver AO map
    const staticWoodTexturePath = 'assets/textures/PaintedWood009B_1K-JPG/';

    try {
        staticWoodColorTexture = await textureLoader.loadAsync(`${staticWoodTexturePath}PaintedWood009B_1K-JPG_Color.jpg`);
        staticWoodColorTexture.colorSpace = THREE.SRGBColorSpace;
        staticWoodColorTexture.wrapS = THREE.RepeatWrapping;
        staticWoodColorTexture.wrapT = THREE.RepeatWrapping;
        console.log("Textura de Cor (Wood para plataformas estáticas) carregada.");

        // staticWoodAoTexture = await textureLoader.loadAsync(`${staticWoodTexturePath}PaintedWood009B_1K-JPG_AmbientOcclusion.jpg`);
        // staticWoodAoTexture.wrapS = THREE.RepeatWrapping;
        // staticWoodAoTexture.wrapT = THREE.RepeatWrapping;
        // console.log("Textura AO (Wood para plataformas estáticas) carregada.");

        staticWoodNormalTexture = await textureLoader.loadAsync(`${staticWoodTexturePath}PaintedWood009B_1K-JPG_NormalGL.jpg`);
        staticWoodNormalTexture.wrapS = THREE.RepeatWrapping;
        staticWoodNormalTexture.wrapT = THREE.RepeatWrapping;
        console.log("Textura Normal (Wood para plataformas estáticas) carregada.");

        staticWoodRoughnessTexture = await textureLoader.loadAsync(`${staticWoodTexturePath}PaintedWood009B_1K-JPG_Roughness.jpg`);
        staticWoodRoughnessTexture.wrapS = THREE.RepeatWrapping;
        staticWoodRoughnessTexture.wrapT = THREE.RepeatWrapping;
        console.log("Textura Roughness (Wood para plataformas estáticas) carregada.");

        staticWoodDisplacementTexture = await textureLoader.loadAsync(`${staticWoodTexturePath}PaintedWood009B_1K-JPG_Displacement.jpg`);
        staticWoodDisplacementTexture.wrapS = THREE.RepeatWrapping;
        staticWoodDisplacementTexture.wrapT = THREE.RepeatWrapping;
        console.log("Textura Displacement (Wood para plataformas estáticas) carregada.");

    } catch (error) {
        console.error("Erro ao carregar uma ou mais texturas PBR (Wood Estático):", error);
    }


    // --- Materiais ---
    // Material para plataformas MÓVEIS (PaintedWood003)
    const movingPaintedWoodMaterial = new THREE.MeshPhysicalMaterial({
        map: movingWoodColorTexture,
        normalMap: movingWoodNormalTexture,
        normalScale: new THREE.Vector2(0.8, 0.8),
        roughnessMap: movingWoodRoughnessTexture,
        metalness: 0.0,
        displacementMap: movingWoodDisplacementTexture,
        displacementScale: 0.005, // Ajuste conforme necessário para PaintedWood003
        displacementBias: -0.0025, // Ajuste conforme necessário para PaintedWood003
    });
    if (!movingWoodColorTexture) movingPaintedWoodMaterial.color = new THREE.Color(0x8B4513); // Fallback

    // Material para plataformas de CHECKPOINT ESTÁTICAS (PaintedWood009B)
    const staticCheckpointWoodMaterial = new THREE.MeshPhysicalMaterial({
        map: staticWoodColorTexture,
        // aoMap: staticWoodAoTexture, // Descomente se usar
        // aoMapIntensity: 1.0,
        normalMap: staticWoodNormalTexture,
        normalScale: new THREE.Vector2(1.0, 1.0), // Ajuste conforme necessário para PaintedWood009B
        roughnessMap: staticWoodRoughnessTexture,
        metalness: 0.0, // Madeira geralmente não é metálica
        displacementMap: staticWoodDisplacementTexture,
        displacementScale: 0.01, // Ajuste conforme necessário para PaintedWood009B
        displacementBias: -0.005, // Ajuste conforme necessário para PaintedWood009B
    });
    if (!staticWoodColorTexture) staticCheckpointWoodMaterial.color = new THREE.Color(0xffa500); // Fallback

    // Materiais de checkpoint VISUAL (os triggers transparentes)
    const checkpointVisualMaterialBase = new THREE.MeshPhysicalMaterial({ color: 0xff0000, roughness: 0.9, metalness: 0.0, transparent: true, opacity: 0.5 });
    const finalCheckpointVisualMaterialBase = new THREE.MeshPhysicalMaterial({ color: 0xffff00, roughness: 0.3, metalness: 0.6, transparent: true, opacity: 0.5 });

    const platforms = [
        // Plataformas de Checkpoint (estáticas) - usarão staticCheckpointWoodMaterial
        { position: [0, 1, 0], size: [10, 0.5, 5], isCheckpoint: true },
        // Plataformas Móveis - usarão movingPaintedWoodMaterial
        {
            position: [0, 1, 5], size: [2.5, 0.1, 2.5], isMoving: true,
            movement: { axis: 'x', distance: 2.5, speed: 1, offset: 0 }
        },
        {
            position: [0, 1, 10], size: [2.5, 0.1, 2.5], isMoving: true,
            movement: { axis: 'x', distance: 2.5, speed: 1, offset: -1 }
        },
        {
            position: [0, 1, 15], size: [2.5, 0.1, 2.5], isMoving: true,
            movement: { axis: 'x', distance: 2.5, speed: 1, offset: 2 }
        },
        {
            position: [0, 1, 20], size: [2.5, 0.1, 2.5], isMoving: true,
            movement: { axis: 'x', distance: 2.5, speed: 1, offset: -2 }
        },
        {
            position: [0, 1, 25], size: [2.5, 0.1, 2.5], isMoving: true,
            movement: { axis: 'x', distance: 2.5, speed: 1, offset: 1 }
        },
        // Plataforma de Checkpoint
        { position: [0, 1, 30], size: [10, 0.5, 5], isCheckpoint: true },
        // Plataformas Móveis
        {
            position: [0, 1, 35], size: [2.5, 0.1, 2.5], isMoving: true,
            movement: { axis: 'x', distance: 3.75, speed: 1, offset: -3 }
        },
        {
            position: [0, 1, 42], size: [2.5, 0.1, 2.5], isMoving: true,
            movement: { axis: 'x', distance: 3.75, speed: 1, offset: 2 }
        },
        {
            position: [0, 1, 49], size: [2.5, 0.1, 2.5], isMoving: true,
            movement: { axis: 'x', distance: 3.75, speed: 1, offset: -1 }
        },
        {
            position: [0, 1, 55], size: [2.5, 0.1, 2.5], isMoving: true,
            movement: { axis: 'x', distance: 3.75, speed: 1, offset: 4 }
        },
        // Plataforma de Checkpoint
        { position: [0, 1, 60], size: [10, 0.5, 5], isCheckpoint: true },
        // Plataformas Móveis
        {
            position: [0, 1, 65], size: [2.5, 0.1, 2.5], isMoving: true,
            movement: { axis: 'x', distance: 5, speed: 1, offset: -3 }
        },
        {
            position: [0, 1, 72], size: [2.5, 0.1, 2.5], isMoving: true,
            movement: { axis: 'x', distance: 5, speed: 1, offset: 4 }
        },
        {
            position: [0, 1, 79], size: [2.5, 0.1, 2.5], isMoving: true,
            movement: { axis: 'x', distance: 5, speed: 1, offset: 0 }
        },
        {
            position: [0, 1, 85], size: [2.5, 0.1, 2.5], isMoving: true,
            movement: { axis: 'x', distance: 5, speed: 1.5, offset: 1 }
        },
        // Plataforma de Checkpoint Final
        { position: [0, 1, 90], size: [10, 0.5, 5], isCheckpoint: true, isFinal: true },
    ];

    platforms.forEach((platformData) => {
        let baseMaterialToUse;

        if (platformData.isMoving) {
            baseMaterialToUse = movingPaintedWoodMaterial;
        } else if (platformData.isCheckpoint) {
            baseMaterialToUse = staticCheckpointWoodMaterial; // Usar o novo material de madeira para checkpoints
        } else {
            // Fallback para outras plataformas estáticas não checkpoint (se houver)
            // Você pode definir um material padrão diferente aqui se necessário
            baseMaterialToUse = staticCheckpointWoodMaterial; // Ou um material padrão diferente
        }

        const geometry = new THREE.BoxGeometry(...platformData.size);
        // Geometria com mais segmentos para melhor displacement (opcional, mas recomendado)
        // const geometry = new THREE.BoxGeometry(platformData.size[0], platformData.size[1], platformData.size[2], Math.floor(platformData.size[0]*1.5), 1, Math.floor(platformData.size[2]*1.5));

        const platformSpecificMaterial = baseMaterialToUse.clone();
        const platform = new THREE.Mesh(geometry, platformSpecificMaterial);
        platform.position.set(...platformData.position);
        platform.castShadow = true;
        platform.receiveShadow = true;
        scene.add(platform);

        if (platformSpecificMaterial.map) {
            let repeatScaleFactor;
            if (platformData.isMoving) {
                repeatScaleFactor = 3.5; // Para PaintedWood003 nas plataformas móveis
            } else {
                repeatScaleFactor = 7.5;   // Para PaintedWood009B nas plataformas de checkpoint (ajuste conforme necessário)
            }
            
            const repeatFactorX = platformData.size[0] / repeatScaleFactor;
            const repeatFactorZ = platformData.size[2] / repeatScaleFactor;

            platformSpecificMaterial.map = platformSpecificMaterial.map.clone();
            platformSpecificMaterial.map.needsUpdate = true;
            platformSpecificMaterial.map.repeat.set(repeatFactorX, repeatFactorZ);

            if (platformSpecificMaterial.aoMap) { // Clonar AO map se existir
                platformSpecificMaterial.aoMap = platformSpecificMaterial.aoMap.clone();
                platformSpecificMaterial.aoMap.needsUpdate = true;
                platformSpecificMaterial.aoMap.repeat.set(repeatFactorX, repeatFactorZ);
            }
            if (platformSpecificMaterial.normalMap) {
                platformSpecificMaterial.normalMap = platformSpecificMaterial.normalMap.clone();
                platformSpecificMaterial.normalMap.needsUpdate = true;
                platformSpecificMaterial.normalMap.repeat.set(repeatFactorX, repeatFactorZ);
            }
            if (platformSpecificMaterial.roughnessMap) {
                platformSpecificMaterial.roughnessMap = platformSpecificMaterial.roughnessMap.clone();
                platformSpecificMaterial.roughnessMap.needsUpdate = true;
                platformSpecificMaterial.roughnessMap.repeat.set(repeatFactorX, repeatFactorZ);
            }
            if (platformSpecificMaterial.displacementMap) {
                platformSpecificMaterial.displacementMap = platformSpecificMaterial.displacementMap.clone();
                platformSpecificMaterial.displacementMap.needsUpdate = true;
                platformSpecificMaterial.displacementMap.repeat.set(repeatFactorX, repeatFactorZ);
            }
        }

        const bodyType = platformData.movement ? CANNON.Body.KINEMATIC : CANNON.Body.STATIC;
        const body = new CANNON.Body({
            type: bodyType,
            position: new CANNON.Vec3(...platformData.position),
            shape: new CANNON.Box(new CANNON.Vec3(platformData.size[0] / 2, platformData.size[1] / 2, platformData.size[2] / 2)),
            material: groundWallMaterial,
            collisionFilterGroup: GROUP_GROUND,
            collisionFilterMask: GROUP_PLAYER
        });
        world.addBody(body);

        if (platformData.movement) {
            movingPlatforms.push({
                mesh: platform,
                body: body,
                initialPosition: new CANNON.Vec3(...platformData.position),
                movement: platformData.movement
            });
        }

        if (platformData.isCheckpoint) {
            const checkpointGeometry = new THREE.BoxGeometry(platformData.size[0], 2, platformData.size[2]);
            const checkpointMaterial = platformData.isFinal ? finalCheckpointVisualMaterialBase.clone() : checkpointVisualMaterialBase.clone();
            const checkpointVisual = new THREE.Mesh(checkpointGeometry, checkpointMaterial);
            checkpointVisual.position.set(platformData.position[0], platformData.position[1] + 1.25, platformData.position[2]);
            checkpointVisual.isCheckpointVisual = true;
            scene.add(checkpointVisual);
            checkpointManager.registerCheckpointVisual(checkpointVisual);

            const checkpointShape = new CANNON.Box(new CANNON.Vec3(platformData.size[0] / 2, 1, platformData.size[2] / 2));
            const checkpointBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(platformData.position[0], platformData.position[1] + 1, platformData.position[2]),
                shape: checkpointShape,
                isTrigger: true,
                collisionFilterGroup: GROUP_CHECKPOINT_TRIGGER,
                collisionFilterMask: GROUP_PLAYER
            });
            checkpointBody.isCheckpoint = true;
            checkpointBody.isFinalCheckpoint = platformData.isFinal;
            checkpointBody.visual = checkpointVisual;
            world.addBody(checkpointBody);
        }
    });

    return { scene, movingPlatforms };
}