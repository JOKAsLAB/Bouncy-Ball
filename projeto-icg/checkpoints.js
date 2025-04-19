export default class CheckpointManager {
    constructor(world, playerBody) {
        this.world = world;
        this.playerBody = playerBody;
        this.lastCheckpoint = null; // Último checkpoint ativado
        this.activeCheckpoint = null; // Referência ao checkpoint ativo

        // Adicionar evento para detectar colisões com checkpoints
        this.world.addEventListener('postStep', this._detectCheckpoints.bind(this));
    }

    setInitialCheckpoint(initialPosition) {
        this.lastCheckpoint = initialPosition.clone();
    }

    _detectCheckpoints() {
        this.world.bodies.forEach(body => {
            if (body.isCheckpoint) {
                const distance = body.position.vsub(this.playerBody.position).length();
                if (distance < 1.5) { // Distância para ativar checkpoint
                    this.lastCheckpoint.copy(body.position);

                    // Atualizar cores dos checkpoints
                    if (this.activeCheckpoint) {
                        this.activeCheckpoint.material.color.set(0xff0000); // Vermelho
                    }
                    this.activeCheckpoint = body.visual; // Novo checkpoint ativo
                    this.activeCheckpoint.material.color.set(0x00ff00); // Verde

                    console.log('Checkpoint atualizado:', this.lastCheckpoint);
                }
            }
        });
    }

    getLastCheckpoint() {
        return this.lastCheckpoint;
    }
}