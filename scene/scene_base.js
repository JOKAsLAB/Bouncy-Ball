import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// Agora retorna uma Promise que resolve com a cena configurada
export function createBaseScene(hdriFilename) {
    // Retorna uma nova Promise
    return new Promise((resolve, reject) => {
        const scene = new THREE.Scene();

        // --- Carregar HDRI ---
        const rgbeLoader = new RGBELoader();
        rgbeLoader.setPath('assets/sky/');
        rgbeLoader.load(hdriFilename, function (texture) {
            texture.mapping = THREE.EquirectangularReflectionMapping;

            scene.background = texture;
            scene.environment = texture;

            console.log(`HDRI '${hdriFilename}' carregado e aplicado na cena base.`);

            // --- AJUSTE IMPORTANTE ---
            // Aumenta a intensidade para que a iluminação seja visível
            scene.environmentIntensity = 0.8; // <<-- Use um valor maior, como 0.8 ou 1.0
            // --- FIM DO AJUSTE ---

            // --- Luzes ---
            // Adiciona as luzes DEPOIS que o HDRI foi carregado (opcional, mas bom local)
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
            directionalLight.position.set(10, 20, 10);
            directionalLight.castShadow = true;

            // Configurações de sombra mantidas
            directionalLight.shadow.mapSize.width = 1024;
            directionalLight.shadow.mapSize.height = 1024;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 50;
            directionalLight.shadow.camera.left = -20;
            directionalLight.shadow.camera.right = 20;
            directionalLight.shadow.camera.top = 20;
            directionalLight.shadow.camera.bottom = -20;

            scene.add(directionalLight);

            // Resolve a Promise com a cena configurada QUANDO o HDRI estiver pronto
            resolve(scene);

        }, undefined, function (error) {
            console.error(`Erro ao carregar o HDRI '${hdriFilename}' na cena base:`, error);
            // Rejeita a Promise em caso de erro
            reject(error);
        });
        // --- Fim Carregar HDRI ---

        // Nota: As luzes foram movidas para dentro do callback do loader
        // para garantir que a cena retornada pela Promise está completa.
    });
}