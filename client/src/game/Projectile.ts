import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { BULLET_SIZE, BULLET_SPEED, GAME_HEIGHT } from "./constants";

export class Projectile {
  mesh: Mesh;
  active = true;
  damage: number;

  constructor(scene: Scene, position: Vector3, damage: number) {
    this.damage = damage;
    this.mesh = MeshBuilder.CreateBox("bullet", { width: BULLET_SIZE, height: 0.05, depth: BULLET_SIZE * 2 }, scene);
    const mat = new StandardMaterial("bulletMat", scene);
    mat.diffuseColor = new Color3(0.22, 1, 0.08);
    mat.emissiveColor = new Color3(0.22, 1, 0.08);
    this.mesh.material = mat;
    this.mesh.position = position.clone();
  }

  update(dt: number) {
    this.mesh.position.z += BULLET_SPEED * dt;
    if (this.mesh.position.z > GAME_HEIGHT / 2 + 1) {
      this.active = false;
    }
  }

  dispose() {
    this.mesh.dispose();
  }
}
