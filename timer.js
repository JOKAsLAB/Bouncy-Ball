export function createTimer() {
    let startTime = 0;
    let totalPausedTime = 0;
    let pauseStartTime = null;

    return {
        start() {
            startTime = performance.now();
            totalPausedTime = 0;
            pauseStartTime = null;
        },
        pause() {
            if (pauseStartTime === null && startTime !== 0) {
                pauseStartTime = performance.now();
            }
        },
        resume() {
            if (pauseStartTime !== null) {
                totalPausedTime += performance.now() - pauseStartTime;
                pauseStartTime = null;
            }
        },
        getElapsedTime() {
            if (pauseStartTime !== null) {
                return pauseStartTime - startTime - totalPausedTime;
            }
            return performance.now() - startTime - totalPausedTime;
        },
        formatTime(milliseconds) {
            const totalSeconds = Math.floor(milliseconds / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const ms = Math.floor(milliseconds % 1000);
            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(ms).padStart(3, '0')}`;
        },
    };
}