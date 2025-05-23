import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export function createBaseScene(hdriFilename, environmentIntensity = 0.8) {
    return new Promise((resolve, reject) => {
        const scene = new THREE.Scene();

        const addLights = () => {
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
            directionalLight.name = "BaseDirectionalLight"; 
            directionalLight.position.set(10, 20, 10);
            directionalLight.castShadow = true;

            directionalLight.shadow.mapSize.width = 1024;
            directionalLight.shadow.mapSize.height = 1024;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 50;
            directionalLight.shadow.camera.left = -20;
            directionalLight.shadow.camera.right = 20;
            directionalLight.shadow.camera.top = 20;
            directionalLight.shadow.camera.bottom = -20;

            scene.add(directionalLight);
        };

        if (hdriFilename && typeof hdriFilename === 'string' && hdriFilename.trim() !== '') {
            const rgbeLoader = new RGBELoader();
            rgbeLoader.setPath('assets/sky/');
            rgbeLoader.load(hdriFilename, function (texture) {
                texture.mapping = THREE.EquirectangularReflectionMapping;

                scene.background = texture;
                scene.environment = texture;
                scene.environmentIntensity = environmentIntensity;

                addLights(); 
                resolve(scene);

            }, undefined, function (error) {
                reject(error); 
            });
        } else {
            scene.background = new THREE.Color(0xcccccc); 
            addLights();
            resolve(scene);
        }
    });
}

export async function createScene(world, checkpointManager, groundWallMaterial, camera) { 
    const scene = await createBaseScene(null); 

    scene.background = new THREE.Color(0x000000); 
    
    scene.traverse((object) => {
        if (object instanceof THREE.DirectionalLight && object.name === "BaseDirectionalLight") { 
        }
        if (object instanceof THREE.AmbientLight && object.name === "BaseAmbientLight") {
        }
    });
}