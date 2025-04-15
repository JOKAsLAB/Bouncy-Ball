import { createBaseScene } from './scene_base.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es'; // Importa Cannon-es para física

export function createScene(world) {
    const scene = createBaseScene();

    // Configuração das plataformas (caixas)
    const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
    const platforms = [
        { position: [0, 1, 0], size: [10, 1, 10] },  // Plataforma central
        { position: [0, 1, -15], size: [5, 0.25, 5] }, // Plataforma atrás
        { position: [0, 1, -30], size: [5, 0.25, 5] },
        { position: [5, 1, -45], size: [5, 0.25, 5] },
        { position: [-5, 1, -60], size: [5, 0.25, 5] },
        { position: [5, 1, -75], size: [5, 0.25, 5] },
        { position: [0, 1, -90], size: [10, 1, 10] },
    ];

    platforms.forEach(({ position, size }) => {
        // Criação da plataforma visual (Three.js)
        const geometry = new THREE.BoxGeometry(...size);
        const platform = new THREE.Mesh(geometry, platformMaterial);
        platform.position.set(...position);
        scene.add(platform);

        // Criação da plataforma física (Cannon-es)
        const shape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2));
        const body = new CANNON.Body({
            mass: 0, // Mass = 0 torna o objeto estático
            position: new CANNON.Vec3(...position),
            shape: shape,
        });
        world.addBody(body); // Adiciona o corpo ao mundo físico
    });

    return scene;
}