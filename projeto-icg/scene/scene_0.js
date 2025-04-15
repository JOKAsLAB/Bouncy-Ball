import { createBaseScene } from './scene_base.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es'; // Importa Cannon-es para física

export function createScene(world) {
    const scene = createBaseScene();

    // Configuração das plataformas (caixas)
    const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
    const platforms = [
        { position: [0, 1, 0], size: [5, 1, 5] },  // Plataforma central
        { position: [10, 2, 0], size: [5, 1, 5] }, // Plataforma à direita
        { position: [-10, 3, 0], size: [5, 1, 5] }, // Plataforma à esquerda
        { position: [0, 4, -10], size: [5, 1, 5] }, // Plataforma atrás
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