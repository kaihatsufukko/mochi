import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { GAME_WIDTH, PLAYER_SIZE, PLAYER_SPEED } from "./constants";
import { InputManager } from "./InputManager";

export class Player {
  mesh: Mesh;
  hp: number;
  maxHp: number;
  private input: InputManager;

  constructor(scene: Scene, input: InputManager, maxHp: number) {
    this.input = input;
    this.maxHp = maxHp;
    this.hp = maxHp;

    this.mesh = MeshBuilder.CreateBox("player", { width: PLAYER_SIZE, height: 0.1, depth: PLAYER_SIZE * 1.2 }, scene);
    const mat = new StandardMaterial("playerMat", scene);
    mat.diffuseColor = new Color3(0.2, 0.9, 0.3);
    mat.emissiveColor = new Color3(0.1, 0.5, 0.1);
    this.mesh.material = mat;
    this.mesh.position = new Vector3(0, 0, -6);

    const visor = MeshBuilder.CreateBox("visor", { width: PLAYER_SIZE * 0.6, height: 0.12, depth: PLAYER_SIZE * 0.3 }, scene);
    const visorMat = new StandardMaterial("visorMat", scene);
    visorMat.diffuseColor = new Color3(0.22, 1, 0.08);
    visorMat.emissiveColor = new Color3(0.22, 1, 0.08);
    visor.material = visorMat;
    visor.parent = this.mesh;
    visor.position.z = -PLAYER_SIZE * 0.3;
  }

  update(dt: number) {
    if (this.input.isActive()) {
      const targetX = this.input.getTargetX();
      const diff = targetX - this.mesh.position.x;
      const move = Math.sign(diff) * Math.min(Math.abs(diff), PLAYER_SPEED * dt);
      this.mesh.position.x += move;
    }
    const halfWidth = GAME_WIDTH / 2 - PLAYER_SIZE / 2;
    this.mesh.position.x = Math.max(-halfWidth, Math.min(halfWidth, this.mesh.position.x));
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    if (this.hp <= 0) { this.hp = 0; return true; }
    return false;
  }

  heal(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  getPosition(): Vector3 {
    return this.mesh.position;
  }

  dispose() {
    this.mesh.dispose(false, true);
  }
}
