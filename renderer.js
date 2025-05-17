import * as THREE from 'three';

// Lê a configuração de antialiasing do localStorage
// Garante que o valor é um booleano; por defeito 'false' se não definido ou inválido
const getAntialiasSetting = () => {
    const storedValue = localStorage.getItem('antialiasEnabled');
    if (storedValue === 'true') {
        return true;
    }
    // Considera 'false' explicitamente, qualquer outra coisa (incluindo null/undefined) será false.
    return false; 
};

const antialiasEnabled = getAntialiasSetting();
console.log(`[renderer.js] Antialiasing setting from localStorage: ${antialiasEnabled}`);

const renderer = new THREE.WebGLRenderer({ antialias: antialiasEnabled });
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