import * as THREE from 'three';

const getViewDistanceSetting = () => {
    const distanceSetting = localStorage.getItem('viewDistance') || 'medium'; 
    
    switch (distanceSetting) {
        case 'short':
            return 50;  
        case 'long':
            return 200; 
        case 'medium':
        default:
            return 100; 
    }
};

const createCamera = (fov = 90, near = 0.1) => {
    const cameraFarDistance = getViewDistanceSetting();
    const camera = new THREE.PerspectiveCamera(
        fov, 
        window.innerWidth / window.innerHeight,
        near,
        cameraFarDistance
    );

    camera.position.set(0, 1.7, 0);

    camera.rotation.order = 'YXZ';

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

    return camera;
};

const camera = createCamera();
export default camera;