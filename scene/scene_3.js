import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GROUP_PLAYER, GROUP_GROUND, GROUP_CHECKPOINT_TRIGGER } from '../collisionGroups.js';
import { createBaseScene } from './scene_base.js';

export async function createScene(world, checkpointManager, groundWallMaterial, camera) { 
    const scene = await createBaseScene('kloppenheim_02_puresky_1k.hdr');

    scene.background = new THREE.Color(0x000000);
    scene.environmentIntensity = 0;
    scene.environment = null; 
    scene.traverse((object) => {
        if (object instanceof THREE.DirectionalLight) {
            object.intensity = 0;
            object.castShadow = false;
        }
        if (object instanceof THREE.AmbientLight) {
             scene.remove(object);
        }
    });

    let backgroundSound;
    let audioListener; 
    if (camera) {
        audioListener = new THREE.AudioListener();
        camera.add(audioListener);

        backgroundSound = new THREE.Audio(audioListener);
        const audioLoader = new THREE.AudioLoader();

        try {
            const buffer = await audioLoader.loadAsync('assets/sound/level3_background_sound.mp3');
            backgroundSound.setBuffer(buffer);
            backgroundSound.setLoop(true);
            backgroundSound.setVolume(0.01); 
            
            if (!backgroundSound.isPlaying) {
                backgroundSound.play();
            }
        } catch (error) {
        }
    }
    
    const starCount = 200;
    const starVertices = [];
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.35, 
        sizeAttenuation: true,
    });
    for (let i = 0; i < starCount; i++) {
        const radius = THREE.MathUtils.randFloat(50, 190); 
        const theta = Math.random() * Math.PI * 2; 
        const phi = Math.acos((Math.random() * 2) - 1); 
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        starVertices.push(x, y, z);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    const movingPlatforms = [];
    let movingLightData = null;
    const sequencedSpotlights = [];
    const randomSpotlights = [];

    const textureLoader = new THREE.TextureLoader();

    let cpTextureColor = null;
    let cpTextureNormal = null;
    let cpTextureRoughness = null;
    let cpTextureMetalness = null;
    let cpTextureDisplacement = null;
    const checkpointTexturePath = 'assets/textures/Metal034_1K-JPG/';
    try {
        cpTextureColor = await textureLoader.loadAsync(`${checkpointTexturePath}Metal034_1K-JPG_Color.jpg`);
        cpTextureColor.colorSpace = THREE.SRGBColorSpace;
        cpTextureColor.wrapS = THREE.RepeatWrapping; cpTextureColor.wrapT = THREE.RepeatWrapping;
        cpTextureNormal = await textureLoader.loadAsync(`${checkpointTexturePath}Metal034_1K-JPG_NormalGL.jpg`);
        cpTextureNormal.wrapS = THREE.RepeatWrapping; cpTextureNormal.wrapT = THREE.RepeatWrapping;
        cpTextureRoughness = await textureLoader.loadAsync(`${checkpointTexturePath}Metal034_1K-JPG_Roughness.jpg`);
        cpTextureRoughness.wrapS = THREE.RepeatWrapping; cpTextureRoughness.wrapT = THREE.RepeatWrapping;
        cpTextureMetalness = await textureLoader.loadAsync(`${checkpointTexturePath}Metal034_1K-JPG_Metalness.jpg`);
        cpTextureMetalness.wrapS = THREE.RepeatWrapping; cpTextureMetalness.wrapT = THREE.RepeatWrapping;
        cpTextureDisplacement = await textureLoader.loadAsync(`${checkpointTexturePath}Metal034_1K-JPG_Displacement.jpg`);
        cpTextureDisplacement.wrapS = THREE.RepeatWrapping; cpTextureDisplacement.wrapT = THREE.RepeatWrapping;
    } catch (error) {
    }

    let normalTextureColor = null;
    let normalTextureNormal = null;
    let normalTextureRoughness = null;
    let normalTextureMetalness = null;
    let normalTextureDisplacement = null;
    const normalPlatformTexturePath = 'assets/textures/Metal049A_1K-JPG/';
    try {
        normalTextureColor = await textureLoader.loadAsync(`${normalPlatformTexturePath}Metal049A_1K-JPG_Color.jpg`);
        normalTextureColor.colorSpace = THREE.SRGBColorSpace;
        normalTextureColor.wrapS = THREE.RepeatWrapping; normalTextureColor.wrapT = THREE.RepeatWrapping;
        normalTextureNormal = await textureLoader.loadAsync(`${normalPlatformTexturePath}Metal049A_1K-JPG_NormalGL.jpg`);
        normalTextureNormal.wrapS = THREE.RepeatWrapping; normalTextureNormal.wrapT = THREE.RepeatWrapping;
        normalTextureRoughness = await textureLoader.loadAsync(`${normalPlatformTexturePath}Metal049A_1K-JPG_Roughness.jpg`);
        normalTextureRoughness.wrapS = THREE.RepeatWrapping; normalTextureRoughness.wrapT = THREE.RepeatWrapping;
        normalTextureMetalness = await textureLoader.loadAsync(`${normalPlatformTexturePath}Metal049A_1K-JPG_Metalness.jpg`);
        normalTextureMetalness.wrapS = THREE.RepeatWrapping; normalTextureMetalness.wrapT = THREE.RepeatWrapping;
        normalTextureDisplacement = await textureLoader.loadAsync(`${normalPlatformTexturePath}Metal049A_1K-JPG_Displacement.jpg`);
        normalTextureDisplacement.wrapS = THREE.RepeatWrapping; normalTextureDisplacement.wrapT = THREE.RepeatWrapping;
    } catch (error) {
    }

    const platformMaterial = new THREE.MeshPhysicalMaterial({
        map: normalTextureColor,
        normalMap: normalTextureNormal,
        normalScale: new THREE.Vector2(1, 1),
        roughness: 0.25, 
        metalnessMap: normalTextureMetalness, 
        metalness: 1.0, 
        displacementMap: normalTextureDisplacement,
        displacementScale: 0.01, 
        displacementBias: -0.005, 
        clearcoat: 1.0, 
        clearcoatRoughness: 0.05, 
        clearcoatNormalMap: normalTextureNormal, 
    });
    if (!normalTextureColor) {
        platformMaterial.color = new THREE.Color(0x666666); 
        platformMaterial.roughness = 0.2;
        platformMaterial.clearcoatRoughness = 0.1;
    }

    const checkpointPlatformTexturedMaterial = new THREE.MeshPhysicalMaterial({
        map: cpTextureColor,
        normalMap: cpTextureNormal,
        normalScale: new THREE.Vector2(1, 1),
        roughnessMap: cpTextureRoughness,
        metalnessMap: cpTextureMetalness,
        metalness: 1.0,
        displacementMap: cpTextureDisplacement,
        displacementScale: 0.01,
        displacementBias: -0.005,
        clearcoat: 1.0, 
        clearcoatRoughness: 0.2, 
        clearcoatNormalMap: cpTextureNormal, 
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.2, 
        emissiveMap: cpTextureColor,
    });
    if (!cpTextureColor) {
        checkpointPlatformTexturedMaterial.color = new THREE.Color(0x888888);
        checkpointPlatformTexturedMaterial.emissive = new THREE.Color(0x333333);
        checkpointPlatformTexturedMaterial.emissiveIntensity = 0.1;
        checkpointPlatformTexturedMaterial.emissiveMap = null;
    }

    const checkpointMaterialBase = new THREE.MeshPhysicalMaterial({
        color: 0xff0000,
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        emissive: 0x550000,
        emissiveIntensity: 1.5
    });
    const finalCheckpointMaterialBase = new THREE.MeshPhysicalMaterial({
        color: 0xffff00,
        roughness: 0.3,
        metalness: 0.6,
        transparent: true,
        emissive: 0x555500,
        emissiveIntensity: 2.0
    });

    const movingLight = new THREE.PointLight(0xffffff, 150, 5); 
    movingLight.position.set(0, 3, 1);
    scene.add(movingLight);
    const lightPathPoints = [ { z: 5, x: -1 }, { z: 10, x: 2 }, { z: 15, x: -2 }, { z: 20, x: 3 }, { z: 25, x: 0 }, ];
    lightPathPoints.sort((a, b) => a.z - b.z);
    movingLightData = { light: movingLight, pathPoints: lightPathPoints, speed: 0.75 };

    const platforms = [
        { position: [0, 1, 0], size: [10, 0.5, 5], isCheckpoint: true },
        { position: [-1, 1, 5], size: [2.5, 0.1, 2.5], skipSpotlight: true },
        { position: [2, 1, 10], size: [2.5, 0.1, 2.5], skipSpotlight: true },
        { position: [-2, 1, 15], size: [2.5, 0.1, 2.5], skipSpotlight: true },
        { position: [3, 1, 20], size: [2.5, 0.1, 2.5], skipSpotlight: true },
        { position: [0, 1, 25], size: [2.5, 0.1, 2.5], skipSpotlight: true },
        { position: [0, 1, 30], size: [10, 0.5, 5], isCheckpoint: true },
        { position: [1, 1, 35], size: [2.5, 0.1, 2.5], inSequence: true },
        { position: [-2, 1, 42], size: [2.5, 0.1, 2.5], inSequence: true },
        { position: [2, 1, 49], size: [2.5, 0.1, 2.5], inSequence: true },
        { position: [0, 1, 55], size: [2.5, 0.1, 2.5], inSequence: true },
        { position: [0, 1, 60], size: [10, 0.5, 5], isCheckpoint: true },
        { position: [-1, 1, 65], size: [2.5, 0.1, 2.5], isRandomSequence: true },
        { position: [3, 1, 72], size: [2.5, 0.1, 2.5], isRandomSequence: true },
        { position: [-1, 1, 79], size: [2.5, 0.1, 2.5], isRandomSequence: true },
        { position: [1, 1, 86], size: [2.5, 0.1, 2.5], isRandomSequence: true },
        { position: [0, 1, 91], size: [10, 0.5, 5], isCheckpoint: true, isFinal: true },
    ];

    platforms.forEach(({ position, size, isCheckpoint, isFinal = false, skipSpotlight = false, inSequence = false, isRandomSequence = false }) => {
        const isCheckpointPlatform = isCheckpoint;
        const baseMaterialToUse = isCheckpointPlatform ? checkpointPlatformTexturedMaterial : platformMaterial;
        
        const geometry = new THREE.BoxGeometry(...size);
        const platformSpecificMaterial = baseMaterialToUse.clone();
        
        const repeatScaleFactor = isCheckpointPlatform ? 5 : 3;
        const repeatFactorX = size[0] / repeatScaleFactor;
        const repeatFactorZ = size[2] / repeatScaleFactor;

        const mapsToRepeat = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'displacementMap', 'emissiveMap', 'clearcoatNormalMap']; 

        for (const mapType of mapsToRepeat) {
            if (platformSpecificMaterial[mapType] && platformSpecificMaterial[mapType].isTexture) {
                platformSpecificMaterial[mapType] = platformSpecificMaterial[mapType].clone();
                platformSpecificMaterial[mapType].repeat.set(repeatFactorX, repeatFactorZ);
            }
        }
        
        const platformMesh = new THREE.Mesh(geometry, platformSpecificMaterial); 
            
        platformMesh.position.set(...position); 
        platformMesh.castShadow = true; 
        platformMesh.receiveShadow = true; 
        scene.add(platformMesh); 

        const shape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2));
        const body = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(...position), shape: shape, material: groundWallMaterial, collisionFilterGroup: GROUP_GROUND, collisionFilterMask: GROUP_PLAYER });
        
        if (!isCheckpoint) { 
            body.isUnsafePlatform = true;
        }
        world.addBody(body);

        if (!isCheckpointPlatform && !skipSpotlight && !inSequence && !isRandomSequence) {
            const spotLight = new THREE.SpotLight(0xffffff, 150, 15, Math.PI / 7.5, 0.3, 1.5);
            spotLight.position.set(position[0], position[1] + 5, position[2]);
            spotLight.target.position.set(position[0], position[1], position[2]);
            scene.add(spotLight.target);
            scene.add(spotLight);
        }
        if (inSequence) {
            const sequenceLight = new THREE.SpotLight(0xffffff, 150, 15, Math.PI / 7.5, 0.3, 1.5);
            sequenceLight.position.set(position[0], position[1] + 5, position[2]);
            sequenceLight.target.position.set(position[0], position[1], position[2]);
            scene.add(sequenceLight.target);
            scene.add(sequenceLight);
            sequenceLight.visible = false;
            sequencedSpotlights.push(sequenceLight);
        }
        if (isRandomSequence) {
            const randomLight = new THREE.SpotLight(0xffffff, 150, 15, Math.PI / 7.5, 0.3, 1.5);
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

    return { 
        scene, 
        movingPlatforms, 
        movingLightData, 
        sequencedSpotlights, 
        randomSpotlights,
        backgroundSound, 
        audioListener    
    };
}