import * as THREE from 'three';

// Cria e configura a câmera
const createCamera = (fov = 90, near = 0.1, far = 1000) => {
    const camera = new THREE.PerspectiveCamera(
        fov, // Campo de visão maior para FPS
        window.innerWidth / window.innerHeight,
        near,
        far
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

    return camera;
};

const camera = createCamera();
export default camera;