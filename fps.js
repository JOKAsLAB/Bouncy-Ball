export function createFpsCounter() {
    let lastFpsUpdate = performance.now();
    let frames = 0;
    let currentFps = 0; // Armazena o valor de FPS calculado

    return {
        /**
         * Atualiza a contagem de frames e recalcula o FPS em intervalos.
         * @param {number} now - O timestamp atual (geralmente de requestAnimationFrame).
         */
        update: function(now) {
            frames++;
            if (now - lastFpsUpdate > 500) { // Atualiza a cada 500ms
                currentFps = Math.round((frames * 1000) / (now - lastFpsUpdate));
                lastFpsUpdate = now;
                frames = 0;
            }
        },
        /**
         * Retorna o último valor de FPS calculado.
         * @returns {number} O valor de FPS.
         */
        getFps: function() {
            return currentFps;
        }
    };
}