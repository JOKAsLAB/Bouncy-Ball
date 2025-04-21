export default class CheckpointManager {
    // Add levelCompleteCallback parameter
    constructor(world, playerBody, levelCompleteCallback = null) {
        this.world = world;
        this.playerBody = playerBody;
        this.lastCheckpoint = null; // Último checkpoint ativado
        this.activeCheckpointVisual = null; // Referência ao visual do checkpoint ativo
        this.initialCheckpointSet = false;
        this.levelCompleteCallback = levelCompleteCallback; // Store the callback
        this.completedLevel = false; // Flag to prevent multiple callbacks

        // Adicionar evento para detectar colisões com checkpoints
        this.world.addEventListener('postStep', this._detectCheckpoints.bind(this));
    }

    setInitialCheckpoint(initialPosition) {
        this.lastCheckpoint = initialPosition.clone();
        this.initialCheckpointSet = true;
        console.log('Initial checkpoint set:', this.lastCheckpoint);
    }

    _detectCheckpoints() {
        if (this.completedLevel) return;

        this.world.bodies.forEach(body => {
            if (body.isCheckpoint && body.isTrigger) {
                const playerPos = this.playerBody.position;
                const triggerPos = body.position;
                const triggerHalfExtents = body.shapes[0].halfExtents; // Cannon-es Box shape half-extents

                // --- AABB Check ---
                // Check if player's center X is within trigger's X bounds
                const withinX = playerPos.x >= triggerPos.x - triggerHalfExtents.x &&
                                playerPos.x <= triggerPos.x + triggerHalfExtents.x;
                // Check if player's center Y is within trigger's Y bounds
                const withinY = playerPos.y >= triggerPos.y - triggerHalfExtents.y &&
                                playerPos.y <= triggerPos.y + triggerHalfExtents.y;
                // Check if player's center Z is within trigger's Z bounds
                const withinZ = playerPos.z >= triggerPos.z - triggerHalfExtents.z &&
                                playerPos.z <= triggerPos.z + triggerHalfExtents.z;
                // --- End AABB Check ---

                // Trigger only if player center is inside the trigger box on all axes
                if (withinX && withinY && withinZ) {
                    // Check if it's the final checkpoint
                    if (body.isFinalCheckpoint && this.levelCompleteCallback) {
                        console.log('Final checkpoint reached! (AABB)');
                        this.completedLevel = true;
                        this.levelCompleteCallback();
                        if (body.visual) {
                            body.visual.material.color.set(0x00ff00);
                            body.visual.material.opacity = 0.7;
                        }
                        return; // Stop checking
                    }
                    // Regular checkpoint logic (if not the final one and not the active one)
                    else if (!body.isFinalCheckpoint && body.visual !== this.activeCheckpointVisual) {
                        this.lastCheckpoint.copy(triggerPos); // Use trigger position
                        // Optional: Adjust Y if needed, e.g., this.lastCheckpoint.y -= triggerHalfExtents.y;
                        console.log('Checkpoint updated (AABB):', this.lastCheckpoint);

                        if (this.activeCheckpointVisual) {
                            this.activeCheckpointVisual.material.color.set(0xff0000);
                        }
                        this.activeCheckpointVisual = body.visual;
                        if (this.activeCheckpointVisual) {
                            this.activeCheckpointVisual.material.color.set(0x00ff00);
                        }
                    }
                }
            }
        });
    }

    getLastCheckpoint() {
        // Return initial spawn if no checkpoint has been hit yet
        return this.lastCheckpoint && this.initialCheckpointSet ? this.lastCheckpoint : null;
    }

    // Optional: Add a method to clean up the event listener if needed later
    destroy() {
        this.world.removeEventListener('postStep', this._detectCheckpoints.bind(this));
    }
}