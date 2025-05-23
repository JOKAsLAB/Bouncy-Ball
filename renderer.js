import * as THREE from 'three';

const getAntialiasSetting = () => {
    const storedValue = localStorage.getItem('antialiasEnabled');
    if (storedValue === 'true') {
        return true;
    }
    return false;
};

const getShadowQualitySetting = () => {
    const quality = localStorage.getItem('shadowQuality') || 'soft';
    return quality;
};

const antialiasEnabled = getAntialiasSetting();
const shadowQuality = getShadowQualitySetting();

const renderer = new THREE.WebGLRenderer({ antialias: antialiasEnabled });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

if (shadowQuality === 'soft') {
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
} else {
    renderer.shadowMap.type = THREE.BasicShadowMap;
}

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

document.body.appendChild(renderer.domElement);

export default renderer;