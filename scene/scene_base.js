import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export function createBaseScene(hdriFilename, environmentIntensity = 0.8) {
    return new Promise((resolve, reject) => {
        const scene = new THREE.Scene();

        // Função para adicionar luzes, para evitar duplicação de código
        const addLights = () => {
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
            directionalLight.name = "BaseDirectionalLight"; // Nomear a luz
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
            
            // Poderia adicionar uma AmbientLight básica aqui se o HDRI não for carregado,
            // mas as cenas individuais podem querer controlar isso.
            // Ex: if (!hdriFilename) {
            //    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
            //    ambientLight.name = "BaseAmbientLight"; // Adiciona um nome para identificação
            //    scene.add(ambientLight);
            // }
        };

        if (hdriFilename && typeof hdriFilename === 'string' && hdriFilename.trim() !== '') {
            const rgbeLoader = new RGBELoader();
            rgbeLoader.setPath('assets/sky/');
            rgbeLoader.load(hdriFilename, function (texture) {
                texture.mapping = THREE.EquirectangularReflectionMapping;

                scene.background = texture;
                scene.environment = texture;
                scene.environmentIntensity = environmentIntensity;

                console.log(`HDRI '${hdriFilename}' carregado e aplicado na cena base.`);
                
                addLights(); // Adiciona luzes após o HDRI estar pronto
                resolve(scene);

            }, undefined, function (error) {
                console.error(`Erro ao carregar o HDRI '${hdriFilename}' na cena base:`, error);
                // Mesmo com erro no HDRI, podemos querer uma cena com luzes
                // addLights(); 
                // resolve(scene); // Ou rejeitar completamente
                reject(error); // Mantendo o comportamento original de rejeitar em erro de HDRI
            });
        } else {
            // Nenhum HDRI fornecido, configurar uma cena sem ele
            console.log("Nenhum HDRI especificado, criando cena base sem ambiente HDRI.");
            scene.background = new THREE.Color(0xcccccc); // Um fundo padrão, ou deixar para a cena individual
            addLights();
            resolve(scene);
        }
    });
}

export async function createScene(world, checkpointManager, groundWallMaterial, camera) { 
    const scene = await createBaseScene(null); // Não carrega HDRI

    scene.background = new THREE.Color(0x000000); // Define o fundo preto
    // scene.environmentIntensity e scene.environment já não serão definidos pelo HDRI
    
    // Remover luzes padrão se createBaseScene(null) ainda as adicionar e você não as quiser
    scene.traverse((object) => {
        if (object instanceof THREE.DirectionalLight && object.name === "BaseDirectionalLight") { // Adicionar um nome à luz em scene_base para identificação
            // scene.remove(object); // ou object.visible = false;
        }
        if (object instanceof THREE.AmbientLight && object.name === "BaseAmbientLight") {
            // scene.remove(object);
        }
    });
}