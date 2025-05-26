import { createBaseScene } from './scene_base.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GROUP_PLAYER, GROUP_GROUND, GROUP_CHECKPOINT_TRIGGER } from '../collisionGroups.js';

export async function createScene(world, checkpointManager, groundWallMaterial, camera) {
    const scene = await createBaseScene('overcast_soil_puresky_1k.hdr'); 
    const movingPlatforms = [];

    let backgroundSound;
    let audioListener;
    if (camera) {
        audioListener = new THREE.AudioListener();
        camera.add(audioListener);
        backgroundSound = new THREE.Audio(audioListener);
        const audioLoader = new THREE.AudioLoader();
        try {
            const buffer = await audioLoader.loadAsync('assets/sound/level2_background_sound.mp3');
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

    const movingWoodTexturePath = 'assets/textures/PaintedWood003_1K-JPG/';
    let movingWoodColorTexture = null;
    let movingWoodNormalTexture = null;
    let movingWoodRoughnessTexture = null;
    let movingWoodDisplacementTexture = null;

    try {
        movingWoodColorTexture = await textureLoader.loadAsync(`${movingWoodTexturePath}PaintedWood003_1K-JPG_Color.jpg`);
        movingWoodColorTexture.colorSpace = THREE.SRGBColorSpace;
        movingWoodColorTexture.wrapS = THREE.RepeatWrapping;
        movingWoodColorTexture.wrapT = THREE.RepeatWrapping;

        movingWoodNormalTexture = await textureLoader.loadAsync(`${movingWoodTexturePath}PaintedWood003_1K-JPG_NormalGL.jpg`);
        movingWoodNormalTexture.wrapS = THREE.RepeatWrapping;
        movingWoodNormalTexture.wrapT = THREE.RepeatWrapping;

        movingWoodRoughnessTexture = await textureLoader.loadAsync(`${movingWoodTexturePath}PaintedWood003_1K-JPG_Roughness.jpg`);
        movingWoodRoughnessTexture.wrapS = THREE.RepeatWrapping;
        movingWoodRoughnessTexture.wrapT = THREE.RepeatWrapping;

        movingWoodDisplacementTexture = await textureLoader.loadAsync(`${movingWoodTexturePath}PaintedWood003_1K-JPG_Displacement.jpg`);
        movingWoodDisplacementTexture.wrapS = THREE.RepeatWrapping;
        movingWoodDisplacementTexture.wrapT = THREE.RepeatWrapping;
    } catch (error) {
    }

    const staticWoodTexturePath = 'assets/textures/PaintedWood009B_1K-JPG/';
    let staticWoodColorTexture = null;
    let staticWoodNormalTexture = null;
    let staticWoodRoughnessTexture = null;
    let staticWoodDisplacementTexture = null;

    try {
        staticWoodColorTexture = await textureLoader.loadAsync(`${staticWoodTexturePath}PaintedWood009B_1K-JPG_Color.jpg`);
        staticWoodColorTexture.colorSpace = THREE.SRGBColorSpace;
        staticWoodColorTexture.wrapS = THREE.RepeatWrapping;
        staticWoodColorTexture.wrapT = THREE.RepeatWrapping;

        staticWoodNormalTexture = await textureLoader.loadAsync(`${staticWoodTexturePath}PaintedWood009B_1K-JPG_NormalGL.jpg`);
        staticWoodNormalTexture.wrapS = THREE.RepeatWrapping;
        staticWoodNormalTexture.wrapT = THREE.RepeatWrapping;

        staticWoodRoughnessTexture = await textureLoader.loadAsync(`${staticWoodTexturePath}PaintedWood009B_1K-JPG_Roughness.jpg`);
        staticWoodRoughnessTexture.wrapS = THREE.RepeatWrapping;
        staticWoodRoughnessTexture.wrapT = THREE.RepeatWrapping;

        staticWoodDisplacementTexture = await textureLoader.loadAsync(`${staticWoodTexturePath}PaintedWood009B_1K-JPG_Displacement.jpg`);
        staticWoodDisplacementTexture.wrapS = THREE.RepeatWrapping;
        staticWoodDisplacementTexture.wrapT = THREE.RepeatWrapping;
    } catch (error) {
    }

    const movingPaintedWoodMaterial = new THREE.MeshPhysicalMaterial({
        map: movingWoodColorTexture,
        normalMap: movingWoodNormalTexture,
        normalScale: new THREE.Vector2(0.8, 0.8),
        roughnessMap: movingWoodRoughnessTexture,
        metalness: 0.0,
        displacementMap: movingWoodDisplacementTexture,
        displacementScale: 0.005,
        displacementBias: -0.0025,
    });
    if (!movingWoodColorTexture) movingPaintedWoodMaterial.color = new THREE.Color(0x8B4513);

    const staticCheckpointWoodMaterial = new THREE.MeshPhysicalMaterial({
        map: staticWoodColorTexture,
        normalMap: staticWoodNormalTexture,
        normalScale: new THREE.Vector2(1.0, 1.0),
        roughnessMap: staticWoodRoughnessTexture,
        metalness: 0.0,
        displacementMap: staticWoodDisplacementTexture,
        displacementScale: 0.01,
        displacementBias: -0.005,
    });
    if (!staticWoodColorTexture) staticCheckpointWoodMaterial.color = new THREE.Color(0xffa500);

    const checkpointVisualMaterialBase = new THREE.MeshPhysicalMaterial({ color: 0xff0000, roughness: 0.9, metalness: 0.0, transparent: true, opacity: 0.5 });
    const finalCheckpointVisualMaterialBase = new THREE.MeshPhysicalMaterial({ color: 0xffff00, roughness: 0.3, metalness: 0.6, transparent: true, opacity: 0.5 });

    const rainCount = 50000; 
    const rainGeometry = new THREE.BufferGeometry();
    const rainVertices = [];
    const rainSpreadX = 100; 
    const rainSpreadZ = 100; 
    const rainHeight = 30; 

    for (let i = 0; i < rainCount; i++) {
        const x = Math.random() * rainSpreadX - rainSpreadX / 2;
        const y = Math.random() * rainHeight; 
        const z = Math.random() * rainSpreadZ - rainSpreadZ / 2;
        rainVertices.push(x, y, z);
    }
    rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rainVertices, 3));

    const rainMaterial = new THREE.PointsMaterial({
        color: 0x6ca0dc,
        size: 0.05,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true
    });
    const rain = new THREE.Points(rainGeometry, rainMaterial);
    scene.add(rain);

    const platforms = [
        { position: [0, 1, 0], size: [10, 0.5, 5], isCheckpoint: true },
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
        { position: [0, 1, 30], size: [10, 0.5, 5], isCheckpoint: true },
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
        { position: [0, 1, 60], size: [10, 0.5, 5], isCheckpoint: true },
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
        { position: [0, 1, 90], size: [10, 0.5, 5], isCheckpoint: true, isFinal: true },
    ];

    platforms.forEach((platformData) => {
        let baseMaterialToUse;
        if (platformData.isMoving) {
            baseMaterialToUse = movingPaintedWoodMaterial;
        } else if (platformData.isCheckpoint) {
            baseMaterialToUse = staticCheckpointWoodMaterial;
        } else {
            baseMaterialToUse = staticCheckpointWoodMaterial; 
        }

        const geometry = new THREE.BoxGeometry(...platformData.size);
        const platformSpecificMaterial = baseMaterialToUse.clone();
        const platform = new THREE.Mesh(geometry, platformSpecificMaterial);
        platform.position.set(...platformData.position);
        platform.castShadow = true;
        platform.receiveShadow = true;
        scene.add(platform);

        if (platformSpecificMaterial.map) {
            let repeatScaleFactor;
            if (platformData.isMoving) {
                repeatScaleFactor = 3.5; 
            } else {
                repeatScaleFactor = 7.5;   
            }
            const repeatFactorX = platformData.size[0] / repeatScaleFactor;
            const repeatFactorZ = platformData.size[2] / repeatScaleFactor;

            platformSpecificMaterial.map = platformSpecificMaterial.map.clone();
            platformSpecificMaterial.map.repeat.set(repeatFactorX, repeatFactorZ);

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
        if (platformData.isMoving && !platformData.isCheckpoint) {
            body.isUnsafePlatform = true;
        }
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

    return { 
        scene, 
        movingPlatforms, 
        backgroundSound,
        audioListener,
        rainParticles: rain,
        rainHeight: rainHeight,
        rainSpreadX: rainSpreadX,
        rainSpreadZ: rainSpreadZ
    };
}