import { createBaseScene } from './scene_base.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es'; // Importa Cannon-es para física

export function createScene(world) {
    const scene = createBaseScene();

    // Materiais
    const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 }); // verde
    const orangeMaterial = new THREE.MeshStandardMaterial({ color: 0xffa500 });   // laranja

    const platforms = [
        { position: [0, 1, -0], size: [10, 1, 5] },  // Plataforma central (laranja)
        { position: [0, 1, -5], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, -10], size: [2.5, 0.25, 2.5] },
        { position: [-2, 1, -15], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, -20], size: [2.5, 0.25, 2.5] },
        { position: [-2, 1, -25], size: [2.5, 0.25, 2.5] },
        { position: [0, 1, -30], size: [10, 1, 5] }, // Plataforma final (laranja)
        { position: [-2, 1, 25], size: [2.5, 0.25, 2.5] },
    ];

    platforms.forEach(({ position, size }) => {
        // Se for plataforma grande, usa laranja
        const isOrange = 
            (size[0] === 10 && size[1] === 1 && size[2] === 5) ||
            (size[0] === 5 && size[1] === 1 && size[2] === 5);

        const material = isOrange ? orangeMaterial : platformMaterial;

        // Criação da plataforma visual (Three.js)
        const geometry = new THREE.BoxGeometry(...size);
        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(...position);
        scene.add(platform);

        // Criação da plataforma física (Cannon-es)
        const shape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2));
        const body = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(...position),
            shape: shape,
        });
        world.addBody(body);
    });

    return scene;
}