import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GROUP_PLAYER, GROUP_GROUND, GROUP_CHECKPOINT_TRIGGER } from '../collisionGroups.js';
import { createBaseScene } from './scene_base.js';

export async function createScene(world, checkpointManager, groundWallMaterial) {
    // Obtém a cena base
    const scene = await createBaseScene('kloppenheim_02_puresky_1k.hdr');

    // --- CONFIGURAR FUNDO PRETO E ILUMINAÇÃO ZERO ---
    scene.background = new THREE.Color(0x000000);
    scene.environmentIntensity = 0;
    scene.environment = null;
    scene.traverse((object) => {
        if (object instanceof THREE.DirectionalLight) {
            object.intensity = 0;
            object.castShadow = false;
            console.log("DirectionalLight intensity set to 0 for scene 3.");
        }
        if (object instanceof THREE.AmbientLight) {
             scene.remove(object);
             console.log("AmbientLight removed for scene 3.");
        }
    });
    // --- FIM CONFIGURAÇÃO ---

    const movingPlatforms = []; // Manter se ainda usar
    let movingLightData = null; // Manter se ainda usar

    // --- Estrutura para guardar elementos por secção ---
    const checkpointSections = {}; // Ex: { 0: { lights: [], orangeMaterials: [] }, 1: ... }
    let currentCheckpointIndex = -1;

    // --- Materiais Base ---
    const platformMaterial = new THREE.MeshPhysicalMaterial({ color: 0x228b22, roughness: 0.9, metalness: 0.0 });
    // Base para plataformas laranja (checkpoints e outras) - Renomeado para Base
    const orangeMaterialBase = new THREE.MeshPhysicalMaterial({
        color: 0xffa500,       // Cor base (laranja)
        roughness: 0.8,
        metalness: 0.1,
        emissive: 0x884400,    // Cor emissiva (laranja escuro)
        emissiveIntensity: 1.0 // Intensidade do brilho
    });
    // Base para checkpoints normais (será clonado)
    const checkpointMaterialBase = new THREE.MeshPhysicalMaterial({
        color: 0xff0000, // Cor inicial inativa (será mudada pelo manager)
        roughness: 0.9,
        metalness: 0.0,
        transparent: true, // Precisa ser transparente para opacidade
        opacity: 0.5,      // Opacidade inicial (será mudada pelo manager)
        emissive: 0x550000,
        emissiveIntensity: 1.5
     });
    // Base para checkpoint final (será clonado)
    const finalCheckpointMaterialBase = new THREE.MeshPhysicalMaterial({
        color: 0xffff00, // Cor final
        roughness: 0.3,
        metalness: 0.6,
        transparent: true,
        opacity: 0.5,      // Opacidade inicial
        emissive: 0x555500,
        emissiveIntensity: 2.0
    });
    const originalOrangeIntensity = orangeMaterialBase.emissiveIntensity; // Guardar intensidade original

    // --- Luz Móvel Inicial (será sempre ativa?) ---
    const movingLight = new THREE.PointLight(0xffffff, 10, 5);
    movingLight.position.set(0, 3, 1);
    scene.add(movingLight);
    const lightPathPoints = [ { z: 5, x: -1 }, { z: 10, x: 2 }, { z: 15, x: -2 }, { z: 20, x: 3 }, { z: 25, x: 0 }, ];
    lightPathPoints.sort((a, b) => a.z - b.z);
    movingLightData = { light: movingLight, pathPoints: lightPathPoints, speed: 0.75 };


    const platforms = [
        // checkpoint 0 e primeira secção
        { position: [0, 1, 0], size: [10, 0.5, 5], isCheckpoint: true }, // Checkpoint 0
        { position: [-1, 1, 5], size: [2.5, 0.1, 2.5] }, // Luz normal aqui
        { position: [2, 1, 10], size: [2.5, 0.1, 2.5] }, // Luz normal aqui
        { position: [-2, 1, 15], size: [2.5, 0.1, 2.5] }, // Luz normal aqui
        { position: [3, 1, 20], size: [2.5, 0.1, 2.5] }, // Luz normal aqui
        { position: [0, 1, 25], size: [2.5, 0.1, 2.5] }, // Luz normal aqui

        // checkpoint 1
        { position: [0, 1, 30], size: [10, 0.5, 5], isCheckpoint: true }, // Checkpoint 1
        // Plataformas da sequência ordenada
        { position: [1, 1, 35], size: [2.5, 0.1, 2.5], inSequence: true }, // Luz sequencial aqui
        { position: [-2, 1, 42], size: [2.5, 0.1, 2.5], inSequence: true }, // Luz sequencial aqui
        { position: [2, 1, 49], size: [2.5, 0.1, 2.5], inSequence: true }, // Luz sequencial aqui
        { position: [0, 1, 55], size: [2.5, 0.1, 2.5], inSequence: true }, // Luz sequencial aqui

        // checkpoint 2
        { position: [0, 1, 60], size: [10, 0.5, 5], isCheckpoint: true }, // Checkpoint 2
        // Plataformas da sequência aleatória
        { position: [-1, 1, 65], size: [2.5, 0.1, 2.5], isRandomSequence: true }, // Luz aleatória aqui
        { position: [3, 1, 72], size: [2.5, 0.1, 2.5], isRandomSequence: true }, // Luz aleatória aqui
        { position: [-1, 1, 79], size: [2.5, 0.1, 2.5], isRandomSequence: true }, // Luz aleatória aqui
        { position: [1, 1, 86], size: [2.5, 0.1, 2.5], isRandomSequence: true }, // Luz aleatória aqui

        // checkpoint final
        { position: [0, 1, 91], size: [10, 0.5, 5], isCheckpoint: true, isFinal: true }, // Checkpoint 3 (Final)
    ];

    platforms.forEach(({ position, size, isCheckpoint, isFinal = false, inSequence = false, isRandomSequence = false, skipSpotlight = false }) => { // Adicionado skipSpotlight aqui

        // Atualizar índice da secção ao encontrar um checkpoint
        if (isCheckpoint) {
            currentCheckpointIndex++;
            // Inicializar estrutura para esta secção
            checkpointSections[currentCheckpointIndex] = { lights: [], orangeMaterials: [] };
        }

        const isOrangePlatform = size[0] === 10; // Checkpoints são plataformas laranja
        let material;
        let platformMesh; // Precisamos da mesh para aceder ao material clonado

        if (isOrangePlatform) {
            // Usar material base do checkpoint ou laranja normal
            const baseMaterial = isCheckpoint
                ? (isFinal ? finalCheckpointMaterialBase : checkpointMaterialBase)
                : orangeMaterialBase; // Usa orangeMaterialBase para plataformas laranja normais

            // CLONAR o material para controlar o glow individualmente
            material = baseMaterial.clone();

            // Definir intensidade inicial como 0 para plataformas laranja que NÃO são o primeiro checkpoint
            // E para plataformas laranja normais que não estão na primeira secção
            if ((isCheckpoint && currentCheckpointIndex > 0) || (!isCheckpoint && currentCheckpointIndex > 0)) {
                 material.emissiveIntensity = 0;
            }

            // Guardar referência ao material clonado na secção atual (APENAS se NÃO for checkpoint)
            // Assim, o glow dos checkpoints não é desligado pela função updateSectionVisibility
            if (!isCheckpoint && currentCheckpointIndex >= 0) {
                 checkpointSections[currentCheckpointIndex].orangeMaterials.push(material);
            }
        } else {
            material = platformMaterial; // Plataformas verdes normais (sem emissive)
        }

        const geometry = new THREE.BoxGeometry(...size);
        platformMesh = new THREE.Mesh(geometry, material); // Usar o material (potencialmente clonado)
        platformMesh.position.set(...position);
        scene.add(platformMesh);

        // --- Física (sem alterações) ---
        const shape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2));
        const body = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(...position), shape: shape, material: groundWallMaterial, collisionFilterGroup: GROUP_GROUND, collisionFilterMask: GROUP_PLAYER });
        world.addBody(body);

        // --- Luzes ---
        let light = null;
        // Criar luzes apenas para plataformas verdes (não checkpoints) E se não tiver skipSpotlight
        if (!isOrangePlatform && !skipSpotlight && currentCheckpointIndex >= 0) { // Garante que pertence a uma secção
            // Determina se é uma luz normal, sequencial ou aleatória
            // (A distinção inSequence/isRandomSequence pode não ser mais necessária aqui,
            // mas mantemos para clareza ou uso futuro)
            if (inSequence) {
                light = new THREE.SpotLight(0xffffff, 10, 15, Math.PI / 7.5, 0.3, 1.5);
            } else if (isRandomSequence) {
                light = new THREE.SpotLight(0xffffff, 10, 15, Math.PI / 7.5, 0.3, 1.5);
            } else { // Plataforma verde normal
                light = new THREE.SpotLight(0xffffff, 10, 15, Math.PI / 7.5, 0.3, 1.5);
            }
        }

        // Configurar e adicionar luz se criada
        if (light) { // Não precisa mais verificar currentCheckpointIndex >= 0 aqui
            light.position.set(position[0], position[1] + 5, position[2]);
            light.target.position.set(position[0], position[1], position[2]);
            scene.add(light.target);
            scene.add(light);
            light.visible = false; // Começam desligadas (serão ligadas pela função de update)
            // Adicionar à secção atual
            checkpointSections[currentCheckpointIndex].lights.push(light);
        }


        // --- Trigger do Checkpoint ---
        if (isCheckpoint) {
            // O visual do checkpoint é a própria plataforma laranja (platformMesh)
            const checkpointVisual = platformMesh;
            checkpointVisual.isCheckpointVisual = true; // Adicionar flag se necessário
            checkpointManager.registerCheckpointVisual(checkpointVisual); // Registra no manager

            const checkpointShape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, 1, size[2] / 2)); // Trigger um pouco acima
            const checkpointBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(position[0], position[1] + 1, position[2]), // Posição do trigger
                shape: checkpointShape,
                isTrigger: true,
                collisionFilterGroup: GROUP_CHECKPOINT_TRIGGER,
                collisionFilterMask: GROUP_PLAYER
            });
            // Associar o índice do checkpoint ao corpo físico para identificação na colisão
            checkpointBody.checkpointIndex = currentCheckpointIndex; // <<-- IMPORTANTE
            checkpointBody.isCheckpoint = true;
            checkpointBody.isFinalCheckpoint = isFinal;
            checkpointBody.visual = checkpointVisual; // Associa o corpo físico ao visual
            world.addBody(checkpointBody);
        }
    });

    // --- Função para Atualizar Visibilidade ---
    const updateSectionVisibility = (activeIndex) => {
        console.log(`Updating visibility for checkpoint index: ${activeIndex}`);
        Object.keys(checkpointSections).forEach(indexStr => {
            const index = parseInt(indexStr, 10);
            const section = checkpointSections[index];
            const isActive = (index === activeIndex);

            // Atualizar Luzes (Spotlights nas plataformas verdes)
            section.lights.forEach(light => {
                light.visible = isActive;
            });

            // Atualizar Glow das Plataformas Laranja (NÃO-checkpoint)
            section.orangeMaterials.forEach(material => {
                // Garante que o material ainda existe (pode ter sido removido)
                if (material) {
                    material.emissiveIntensity = isActive ? originalOrangeIntensity : 0;
                }
            });

            // Opcional: Gerir o glow dos próprios checkpoints
            // A lógica atual do CheckpointManager já muda a cor/opacidade.
            // Poderíamos também ajustar a emissiveIntensity aqui se quiséssemos.
        });
    };

    // --- Ativar a Primeira Secção Inicialmente ---
    updateSectionVisibility(0);

    // Retornar a cena e a função de atualização
    return {
        scene,
        movingPlatforms, // Se ainda usar
        movingLightData, // Se ainda usar
        // Não precisa mais retornar sequenced/random spotlights separadamente
        updateSectionVisibility // Função para ser chamada pelo main.js
    };
}