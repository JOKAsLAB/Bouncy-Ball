import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: false }); // Adicione antialias: true
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Ou outro tipo de sombra

// --- Adiciona estas linhas para HDRI ---
renderer.outputColorSpace = THREE.SRGBColorSpace; // Define o espaço de cor de saída
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Aplica tone mapping para HDR
renderer.toneMappingExposure = 1; // Ajusta a exposição (podes precisar de alterar este valor)
// --- Fim das linhas adicionadas ---

document.body.appendChild(renderer.domElement);

export default renderer;