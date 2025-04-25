import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'; // Importa o loader para .hdr

export function createBaseScene() {
    const scene = new THREE.Scene();
    // scene.background = new THREE.Color(0x87ceeb); // Remove ou comenta a cor de fundo sólida

    // --- Carregar HDRI ---
    const rgbeLoader = new RGBELoader();
    rgbeLoader.setPath('assets/sky/'); // Define o caminho para a pasta do HDRI
    rgbeLoader.load('autumn_field_puresky_1k.hdr', function (texture) { // Substitui 'teu_hdri.hdr' pelo nome do teu ficheiro
        texture.mapping = THREE.EquirectangularReflectionMapping;

        scene.background = texture; // Define o HDRI como fundo da cena
        scene.environment = texture; // Define o HDRI para iluminação e reflexos PBR

        console.log("HDRI carregado e aplicado na cena base.");

        // Ajusta a intensidade da iluminação do ambiente HDRI
        scene.environmentIntensity = 0.1; // Experimenta valores < 1 (ex: 0.7, 0.5, etc.)

    }, undefined, function (error) {
        console.error('Erro ao carregar o HDRI na cena base:', error);
    });
    // --- Fim Carregar HDRI ---

    // --- Luzes (Ajustar ou Remover) ---
    // Como o HDRI fornece iluminação ambiente, podemos remover ou reduzir a AmbientLight
    // const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    // scene.add(ambientLight); // Comentado/Removido

    // A DirectionalLight ainda pode ser útil para sombras mais definidas.
    // Podemos manter, mas talvez reduzir a intensidade.
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // Intensidade reduzida (exemplo)
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
    // scene.add(new THREE.CameraHelper(directionalLight.shadow.camera));

    return scene;
}