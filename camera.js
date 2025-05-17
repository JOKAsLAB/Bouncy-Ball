import * as THREE from 'three';

// --- INÍCIO DA LÓGICA DA DISTÂNCIA DE VISÃO ---
const getViewDistanceSetting = () => {
    const distanceSetting = localStorage.getItem('viewDistance') || 'medium'; // Default 'medium'
    // Mapeia a configuração para um valor numérico para camera.far
    switch (distanceSetting) {
        case 'short':
            return 50;  // Exemplo: 50 unidades
        case 'long':
            return 200; // Exemplo: 200 unidades
        case 'medium':
        default:
            return 100; // Exemplo: 100 unidades
    }
};
// --- FIM DA LÓGICA DA DISTÂNCIA DE VISÃO ---

// Cria e configura a câmera
const createCamera = (fov = 90, near = 0.1) => {
    const cameraFarDistance = getViewDistanceSetting();
    const camera = new THREE.PerspectiveCamera(
        fov, // Campo de visão maior para FPS
        window.innerWidth / window.innerHeight,
        near,
        cameraFarDistance
    );

    // Posição inicial será controlada pelos controles
    camera.position.set(0, 1.7, 0);

    // Configurações adicionais para FPS
    camera.rotation.order = 'YXZ'; // Ordem de rotação importante para FPS

    // Atualiza o aspecto da câmera ao redimensionar a janela
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

    console.log(`[camera.js] Camera 'far' plane set to: ${camera.far} based on viewDistance setting: '${localStorage.getItem('viewDistance') || 'medium'}'`);

    return camera;
};

const camera = createCamera();
export default camera;