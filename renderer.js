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

const getShadowQualitySetting = () => {
    const quality = localStorage.getItem('shadowQuality') || 'soft'; // Default 'soft'
    return quality;
};

const antialiasEnabled = getAntialiasSetting();
const shadowQuality = getShadowQualitySetting();

console.log(`[renderer.js] Antialiasing setting from localStorage: ${antialiasEnabled}`);
console.log(`[renderer.js] Shadow Quality setting from localStorage: ${shadowQuality}`);

const renderer = new THREE.WebGLRenderer({ antialias: antialiasEnabled });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // As sombras estão sempre ligadas, a qualidade muda o tipo/tamanho

if (shadowQuality === 'soft') {
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Poderia também ajustar o tamanho do mapa de sombras para luzes aqui, se necessário
    // Ex: light.shadow.mapSize.width = 1024; light.shadow.mapSize.height = 1024;
} else { // 'basic'
    renderer.shadowMap.type = THREE.BasicShadowMap;
    // Ex: light.shadow.mapSize.width = 512; light.shadow.mapSize.height = 512;
}

// --- Adiciona estas linhas para HDRI ---
renderer.outputColorSpace = THREE.SRGBColorSpace; // Define o espaço de cor de saída
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Aplica tone mapping para HDR
renderer.toneMappingExposure = 1; // Ajusta a exposição (podes precisar de alterar este valor)
// --- Fim das linhas adicionadas ---

document.body.appendChild(renderer.domElement);

export default renderer;