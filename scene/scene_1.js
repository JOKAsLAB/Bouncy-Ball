import { createBaseScene } from './scene_base.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GROUP_PLAYER, GROUP_GROUND, GROUP_CHECKPOINT_TRIGGER } from '../collisionGroups.js';

// Torna a função async
export async function createScene(world, checkpointManager, groundWallMaterial) {
    // Usa await para esperar pela Promise de createBaseScene
    const scene = await createBaseScene('autumn_field_puresky_1k.hdr');
    const movingPlatforms = [];

    // --- Carregar Texturas PBR ---
    const textureLoader = new THREE.TextureLoader();

    // Texturas para Plataformas Grandes (agora Plastic015A)
    let largePlasticColorTexture = null;
    let largePlasticNormalTexture = null;
    let largePlasticRoughnessTexture = null;
    let largePlasticDisplacementTexture = null;
    const largePlasticTexturePath = 'assets/textures/Plastic015A_1K-JPG/';

    try {
        largePlasticColorTexture = await textureLoader.loadAsync(`${largePlasticTexturePath}Plastic015A_1K-JPG_Color.jpg`);
        largePlasticColorTexture.colorSpace = THREE.SRGBColorSpace;
        largePlasticColorTexture.wrapS = THREE.RepeatWrapping;
        largePlasticColorTexture.wrapT = THREE.RepeatWrapping;
        console.log("Textura de Cor (Large Plastic015A) carregada.");

        largePlasticNormalTexture = await textureLoader.loadAsync(`${largePlasticTexturePath}Plastic015A_1K-JPG_NormalGL.jpg`);
        largePlasticNormalTexture.wrapS = THREE.RepeatWrapping;
        largePlasticNormalTexture.wrapT = THREE.RepeatWrapping;
        console.log("Textura Normal (Large Plastic015A) carregada.");

        largePlasticRoughnessTexture = await textureLoader.loadAsync(`${largePlasticTexturePath}Plastic015A_1K-JPG_Roughness.jpg`);
        largePlasticRoughnessTexture.wrapS = THREE.RepeatWrapping;
        largePlasticRoughnessTexture.wrapT = THREE.RepeatWrapping;
        console.log("Textura Roughness (Large Plastic015A) carregada.");

        largePlasticDisplacementTexture = await textureLoader.loadAsync(`${largePlasticTexturePath}Plastic015A_1K-JPG_Displacement.jpg`);
        largePlasticDisplacementTexture.wrapS = THREE.RepeatWrapping;
        largePlasticDisplacementTexture.wrapT = THREE.RepeatWrapping;
        console.log("Textura Displacement (Large Plastic015A) carregada.");

    } catch (error) {
        console.error("Erro ao carregar uma ou mais texturas PBR (Large Plastic015A):", error);
    }

    // Texturas para Plataformas Pequenas (Plastic016B) - Mantêm-se
    let smallPlasticColorTexture = null;
    let smallPlasticNormalTexture = null;
    let smallPlasticRoughnessTexture = null;
    let smallPlasticDisplacementTexture = null;
    const smallPlasticTexturePath = 'assets/textures/Plastic016B_1K-JPG/';

    try {
        smallPlasticColorTexture = await textureLoader.loadAsync(`${smallPlasticTexturePath}Plastic016B_1K-JPG_Color.jpg`);
        smallPlasticColorTexture.colorSpace = THREE.SRGBColorSpace;
        smallPlasticColorTexture.wrapS = THREE.RepeatWrapping;
        smallPlasticColorTexture.wrapT = THREE.RepeatWrapping;
        console.log("Textura de Cor (Small Plastic016B) carregada.");

        smallPlasticNormalTexture = await textureLoader.loadAsync(`${smallPlasticTexturePath}Plastic016B_1K-JPG_NormalGL.jpg`);
        smallPlasticNormalTexture.wrapS = THREE.RepeatWrapping;
        smallPlasticNormalTexture.wrapT = THREE.RepeatWrapping;
        console.log("Textura Normal (Small Plastic016B) carregada.");

        smallPlasticRoughnessTexture = await textureLoader.loadAsync(`${smallPlasticTexturePath}Plastic016B_1K-JPG_Roughness.jpg`);
        smallPlasticRoughnessTexture.wrapS = THREE.RepeatWrapping;
        smallPlasticRoughnessTexture.wrapT = THREE.RepeatWrapping;
        console.log("Textura Roughness (Small Plastic016B) carregada.");

        smallPlasticDisplacementTexture = await textureLoader.loadAsync(`${smallPlasticTexturePath}Plastic016B_1K-JPG_Displacement.jpg`);
        smallPlasticDisplacementTexture.wrapS = THREE.RepeatWrapping;
        smallPlasticDisplacementTexture.wrapT = THREE.RepeatWrapping;
        console.log("Textura Displacement (Small Plastic016B) carregada.");

    } catch (error) {
        console.error("Erro ao carregar uma ou mais texturas PBR (Small Plastic016B):", error);
    }

    // --- Materiais ---
    // Material para as plataformas grandes (agora Plastic015A)
    const largePlasticTexturedMaterial = new THREE.MeshPhysicalMaterial({
        map: largePlasticColorTexture,
        normalMap: largePlasticNormalTexture,
        normalScale: new THREE.Vector2(1, 1), 
        roughnessMap: largePlasticRoughnessTexture,
        // Se o roughnessMap estiver a deixar os reflexos muito difusos, 
        // pode experimentar um valor numérico baixo aqui, ex: roughness: 0.1,
        // mas isso anulará o efeito do roughnessMap para a rugosidade base.
        metalness: 0.0, 
        displacementMap: largePlasticDisplacementTexture,
        displacementScale: 0.005, 
        displacementBias: -0.0025, 
        specularIntensity: 0.4, // REDUZI: Antes era 0.8. Experimente valores como 0.3, 0.4, 0.5.
        // specularColor: new THREE.Color(0xffffff), // Cor do reflexo especular (branco é o padrão para dielétricos)
        coat: 1.0, 
        // coatRoughness: 0.1, // EXPERIMENTE: Para um verniz mais brilhante, defina um valor baixo.
                                // Se descomentar, anula o coatRoughnessMap abaixo.
                                // Atualmente, está 1.0 e depois usa o mapa.
    });
    if (largePlasticRoughnessTexture) {
        largePlasticTexturedMaterial.coatRoughnessMap = largePlasticRoughnessTexture;
        // Se o largePlasticRoughnessTexture for muito "áspero" (valores claros),
        // o verniz também será áspero. Considere usar um valor numérico para coatRoughness acima,
        // ou um mapa de rugosidade diferente/ajustado para o verniz.
    }
    if (!largePlasticColorTexture) largePlasticTexturedMaterial.color = new THREE.Color(0xdddddd);

    // Material para as plataformas pequenas (Plastic016B) - Mantém-se
    const smallPlasticTexturedMaterial = new THREE.MeshPhysicalMaterial({
        map: smallPlasticColorTexture,
        normalMap: smallPlasticNormalTexture,
        normalScale: new THREE.Vector2(1, 1),
        roughnessMap: smallPlasticRoughnessTexture,
        // Similar ao de cima, pode experimentar: roughness: 0.1,
        metalness: 0.0,
        displacementMap: smallPlasticDisplacementTexture,
        displacementScale: 0.005,
        displacementBias: -0.0025,
        specularIntensity: 0.4, // REDUZI: Antes era 0.8. Experimente valores como 0.3, 0.4, 0.5.
        // specularColor: new THREE.Color(0xffffff),
        coat: 1.0,
        // coatRoughness: 0.1, // EXPERIMENTE: Para um verniz mais brilhante.
    });
    if (smallPlasticRoughnessTexture) {
        smallPlasticTexturedMaterial.coatRoughnessMap = smallPlasticRoughnessTexture;
        // Mesma consideração sobre o mapa de rugosidade para o verniz.
    }
    if (!smallPlasticColorTexture) smallPlasticTexturedMaterial.color = new THREE.Color(0xcccccc);

    // Material para checkpoints normais
    const checkpointMaterialBase = new THREE.MeshPhysicalMaterial({
        color: 0xff0000,
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
    });

    // Material para o checkpoint final
    const finalCheckpointMaterialBase = new THREE.MeshPhysicalMaterial({
        color: 0xffff00,
        roughness: 0.3,
        metalness: 0.6,
        transparent: true,
    });

    const platforms = [
        // As plataformas grandes (isLargePlatform) usarão largePlasticTexturedMaterial
        // As plataformas pequenas usarão smallPlasticTexturedMaterial
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

        { position: [0, 1, 90], size: [10, 0.5, 5], isCheckpoint: true, isFinal: true }, 
    ];

    platforms.forEach(({ position, size, isCheckpoint, isFinal = false }) => {
        const isLargePlatform = size[0] === 10;
        // Escolhe o material base: plástico grande para as grandes, plástico pequeno para as pequenas
        const baseMaterialToUse = isLargePlatform ? largePlasticTexturedMaterial : smallPlasticTexturedMaterial;
        
        const geometry = new THREE.BoxGeometry(...size);
        
        const platformSpecificMaterial = baseMaterialToUse.clone();
        
        const platform = new THREE.Mesh(geometry, platformSpecificMaterial);

        // Ajustar a repetição da textura para a plataforma atual
        const repeatScaleFactor = isLargePlatform ? 5 : 3; // Mantém os valores definidos anteriormente
        const repeatFactorX = size[0] / repeatScaleFactor;
        const repeatFactorZ = size[2] / repeatScaleFactor;

        if (platformSpecificMaterial.map) {
            platformSpecificMaterial.map = platformSpecificMaterial.map.clone();
            platformSpecificMaterial.map.needsUpdate = true;
            platformSpecificMaterial.map.repeat.set(repeatFactorX, repeatFactorZ);
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
        if (platformSpecificMaterial.coatRoughnessMap) { 
             platformSpecificMaterial.coatRoughnessMap = platformSpecificMaterial.coatRoughnessMap.clone();
             platformSpecificMaterial.coatRoughnessMap.needsUpdate = true;
             platformSpecificMaterial.coatRoughnessMap.repeat.set(repeatFactorX, repeatFactorZ);
        }
            
        platform.position.set(...position);
        platform.castShadow = true;
        platform.receiveShadow = true;
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