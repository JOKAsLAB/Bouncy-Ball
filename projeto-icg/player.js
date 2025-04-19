import * as CANNON from 'cannon-es';

export function createPlayerBody() {
    // Cria um corpo físico para o jogador (esfera)
    const radius = 1;
    const body = new CANNON.Body({
        mass: 5,
        shape: new CANNON.Sphere(radius),
        position: new CANNON.Vec3(0, 5, 0)
    });
    return body;
}