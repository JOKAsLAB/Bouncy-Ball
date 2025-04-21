import * as THREE from 'three';

export function createBaseScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Céu azul claro

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 10, 10);
    scene.add(light);

    return scene;
}