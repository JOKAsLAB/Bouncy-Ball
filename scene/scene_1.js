import { createBaseScene } from './scene_base.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createScene(world) {
    const scene = createBaseScene();

    // Chão
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const groundBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane(),
        material: new CANNON.Material('groundMaterial')
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    // Obstáculos/plataformas
    const objects = [
        { position: [0, 2.5, -10], size: [5, 5, 5], color: 0xff0000 },
        { position: [10, 1, -15], size: [10, 1, 3], color: 0x00ffcc },
        { position: [-8, 2, -20], size: [6, 1, 6], color: 0xffff00 },
    ];

    objects.forEach(({ position, size, color }) => {
        // Visual
        const geometry = new THREE.BoxGeometry(...size);
        const material = new THREE.MeshStandardMaterial({ color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...position);
        scene.add(mesh);

        // Física
        const shape = new CANNON.Box(new CANNON.Vec3(size[0]/2, size[1]/2, size[2]/2));
        const body = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(...position),
            shape: shape,
        });
        world.addBody(body);
    });

    return scene;
}