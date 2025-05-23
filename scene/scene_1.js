import { createBaseScene } from './scene_base.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GROUP_PLAYER, GROUP_GROUND, GROUP_CHECKPOINT_TRIGGER } from '../collisionGroups.js';

export async function createScene(world, checkpointManager, groundWallMaterial, camera) {
    const scene = await createBaseScene('autumn_field_puresky_1k.hdr'); 
    const movingPlatforms = [];

    
    let backgroundSound;
    let listener; 
    if (camera) {
        listener = new THREE.AudioListener();
        camera.add(listener); 

        backgroundSound = new THREE.Audio(listener);
        const audioLoader = new THREE.AudioLoader();

        try {
            
            const buffer = await audioLoader.loadAsync('assets/sound/level1_background_sound.mp3');
            backgroundSound.setBuffer(buffer);
            backgroundSound.setLoop(true);
            backgroundSound.setVolume(0.05); 
            if (!backgroundSound.isPlaying) {
                backgroundSound.play();
            }
        } catch (error) {
        }
    }
    
    const textureLoader = new THREE.TextureLoader();

    
    const largePlasticTexturePath = 'assets/textures/Plastic015A_1K-JPG/';
    const smallPlasticTexturePath = 'assets/textures/Plastic016B_1K-JPG/';

    let largePlasticColorTexture = null;
    let largePlasticNormalTexture = null;
    let largePlasticRoughnessTexture = null;
    let largePlasticDisplacementTexture = null;

    let smallPlasticColorTexture = null;
    let smallPlasticNormalTexture = null;
    let smallPlasticRoughnessTexture = null;
    let smallPlasticDisplacementTexture = null;

    try {
        largePlasticColorTexture = await textureLoader.loadAsync(`${largePlasticTexturePath}Plastic015A_1K-JPG_Color.jpg`);
        largePlasticColorTexture.colorSpace = THREE.SRGBColorSpace;
        largePlasticColorTexture.wrapS = THREE.RepeatWrapping;
        largePlasticColorTexture.wrapT = THREE.RepeatWrapping;

        largePlasticNormalTexture = await textureLoader.loadAsync(`${largePlasticTexturePath}Plastic015A_1K-JPG_NormalGL.jpg`);
        largePlasticNormalTexture.wrapS = THREE.RepeatWrapping;
        largePlasticNormalTexture.wrapT = THREE.RepeatWrapping;

        largePlasticRoughnessTexture = await textureLoader.loadAsync(`${largePlasticTexturePath}Plastic015A_1K-JPG_Roughness.jpg`);
        largePlasticRoughnessTexture.wrapS = THREE.RepeatWrapping;
        largePlasticRoughnessTexture.wrapT = THREE.RepeatWrapping;

        largePlasticDisplacementTexture = await textureLoader.loadAsync(`${largePlasticTexturePath}Plastic015A_1K-JPG_Displacement.jpg`);
        largePlasticDisplacementTexture.wrapS = THREE.RepeatWrapping;
        largePlasticDisplacementTexture.wrapT = THREE.RepeatWrapping;

        smallPlasticColorTexture = await textureLoader.loadAsync(`${smallPlasticTexturePath}Plastic016B_1K-JPG_Color.jpg`);
        smallPlasticColorTexture.colorSpace = THREE.SRGBColorSpace;
        smallPlasticColorTexture.wrapS = THREE.RepeatWrapping;
        smallPlasticColorTexture.wrapT = THREE.RepeatWrapping;

        smallPlasticNormalTexture = await textureLoader.loadAsync(`${smallPlasticTexturePath}Plastic016B_1K-JPG_NormalGL.jpg`);
        smallPlasticNormalTexture.wrapS = THREE.RepeatWrapping;
        smallPlasticNormalTexture.wrapT = THREE.RepeatWrapping;

        smallPlasticRoughnessTexture = await textureLoader.loadAsync(`${smallPlasticTexturePath}Plastic016B_1K-JPG_Roughness.jpg`);
        smallPlasticRoughnessTexture.wrapS = THREE.RepeatWrapping;
        smallPlasticRoughnessTexture.wrapT = THREE.RepeatWrapping;

        smallPlasticDisplacementTexture = await textureLoader.loadAsync(`${smallPlasticTexturePath}Plastic016B_1K-JPG_Displacement.jpg`);
        smallPlasticDisplacementTexture.wrapS = THREE.RepeatWrapping;
        smallPlasticDisplacementTexture.wrapT = THREE.RepeatWrapping;
    } catch (error) {
    }

    
    const largePlasticTexturedMaterial = new THREE.MeshPhysicalMaterial({
        map: largePlasticColorTexture,
        normalMap: largePlasticNormalTexture,
        normalScale: new THREE.Vector2(1, 1), 
        roughnessMap: largePlasticRoughnessTexture,
        metalness: 0.0, 
        displacementMap: largePlasticDisplacementTexture,
        displacementScale: 0.005, 
        displacementBias: -0.0025, 
        specularIntensity: 0.4,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
    });
    if (!largePlasticColorTexture) largePlasticTexturedMaterial.color = new THREE.Color(0xdddddd);

    const smallPlasticTexturedMaterial = new THREE.MeshPhysicalMaterial({
        map: smallPlasticColorTexture,
        normalMap: smallPlasticNormalTexture,
        normalScale: new THREE.Vector2(1, 1),
        roughnessMap: smallPlasticRoughnessTexture,
        metalness: 0.0,
        displacementMap: smallPlasticDisplacementTexture,
        displacementScale: 0.005,
        displacementBias: -0.0025,
        specularIntensity: 0.4,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
    });
    if (!smallPlasticColorTexture) smallPlasticTexturedMaterial.color = new THREE.Color(0xcccccc);

    const checkpointMaterialBase = new THREE.MeshPhysicalMaterial({
        color: 0xff0000,
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
    });

    const finalCheckpointMaterialBase = new THREE.MeshPhysicalMaterial({
        color: 0xffff00,
        roughness: 0.3,
        metalness: 0.6,
        transparent: true,
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

        { position: [0, 1, 90], size: [10, 0.5, 5], isCheckpoint: true, isFinal: true }, 
    ];

    platforms.forEach(({ position, size, isCheckpoint, isFinal = false }) => {
        const isLargePlatform = size[0] === 10;
        const baseMaterialToUse = isLargePlatform ? largePlasticTexturedMaterial : smallPlasticTexturedMaterial;
        
        const geometry = new THREE.BoxGeometry(...size);
        
        const platformSpecificMaterial = baseMaterialToUse.clone();
        
        const repeatScaleFactor = isLargePlatform ? 5 : 3; 
        const repeatFactorX = size[0] / repeatScaleFactor;
        const repeatFactorZ = size[2] / repeatScaleFactor;

        if (platformSpecificMaterial.map) {
            platformSpecificMaterial.map = platformSpecificMaterial.map.clone();
            platformSpecificMaterial.map.repeat.set(repeatFactorX, repeatFactorZ);
        }
        if (platformSpecificMaterial.normalMap) {
            platformSpecificMaterial.normalMap = platformSpecificMaterial.normalMap.clone();
            platformSpecificMaterial.normalMap.repeat.set(repeatFactorX, repeatFactorZ);
        }
        if (platformSpecificMaterial.roughnessMap) {
            platformSpecificMaterial.roughnessMap = platformSpecificMaterial.roughnessMap.clone();
            platformSpecificMaterial.roughnessMap.repeat.set(repeatFactorX, repeatFactorZ);
        }
        if (platformSpecificMaterial.displacementMap && platformSpecificMaterial.displacementScale > 0) {
            platformSpecificMaterial.displacementMap = platformSpecificMaterial.displacementMap.clone();
            platformSpecificMaterial.displacementMap.repeat.set(repeatFactorX, repeatFactorZ);
        }
        if (platformSpecificMaterial.clearcoatRoughnessMap) { 
             platformSpecificMaterial.clearcoatRoughnessMap = platformSpecificMaterial.clearcoatRoughnessMap.clone();
             platformSpecificMaterial.clearcoatRoughnessMap.repeat.set(repeatFactorX, repeatFactorZ);
        }
            
        const platform = new THREE.Mesh(geometry, platformSpecificMaterial);
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
        if (!isCheckpoint) {
            body.isUnsafePlatform = true;
        }
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

    return { scene, movingPlatforms, backgroundSound, audioListener: listener };
}