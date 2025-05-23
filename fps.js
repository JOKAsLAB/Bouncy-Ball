export function createFpsCounter() {
    let lastFpsUpdate = performance.now();
    let frames = 0;
    let currentFps = 0; 

    return {
        update: function(now) {
            frames++;
            if (now - lastFpsUpdate > 500) { 
                currentFps = Math.round((frames * 1000) / (now - lastFpsUpdate));
                lastFpsUpdate = now;
                frames = 0;
            }
        },
        getFps: function() {
            return currentFps;
        }
    };
}