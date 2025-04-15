import * as CANNON from 'cannon-es';

const playerBody = new CANNON.Body({
    mass: 5,
    shape: new CANNON.Sphere(0.3),
    position: new CANNON.Vec3(0, 3, 0),
    linearDamping: 0.2,  // Resistência ao movimento
    fixedRotation: true
});

export function setupPhysics() {
    const world = new CANNON.World();
    world.gravity.set(0, -9.8, 0);  // Queda mais rápida
    
    const playerMaterial = new CANNON.Material("player");
    const groundMaterial = new CANNON.Material("ground");
    
    world.addContactMaterial(
        new CANNON.ContactMaterial(
            groundMaterial,
            playerMaterial,
            { friction: 0.1, restitution: 0.3 }  // Atrito e quique ajustados
        )
    );
    
    playerBody.material = playerMaterial;
    world.addBody(playerBody);

    const groundBody = new CANNON.Body({
        mass: 0, // Chão deve ser estático
        shape: new CANNON.Plane(),
        material: groundMaterial
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Rotaciona o plano para ser horizontal
    world.addBody(groundBody);

    return world;
}

export function updatePhysics(world, deltaTime) {
    world.step(deltaTime);
}

export { playerBody };