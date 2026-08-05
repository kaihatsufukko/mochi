import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { EnemyDef } from "../data/enemies";

export class Enemy {
  mesh: Mesh;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  active = true;
  def: EnemyDef;
  private disposed = false;

  constructor(scene: Scene, def: EnemyDef, x: number, z: number) {
    this.def = def;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.speed = def.speed;
    this.damage = def.damage;

    const size = def.size;
    this.mesh = MeshBuilder.CreateBox("enemy_" + def.id + "_" + Math.random().toString(36).slice(2, 6), { width: size * 0.8, height: 0.1, depth: size }, scene);
    const mat = new StandardMaterial("enemyMat_" + Math.random().toString(36).slice(2, 6), scene);
    const color = Color3.FromHexString(def.color);
    mat.diffuseColor = color;
    mat.emissiveColor = color.scale(0.3);
    this.mesh.material = mat;
    this.mesh.position = new Vector3(x, 0, z);
  }

  update(dt: number) {
    this.mesh.position.z -= this.speed * dt;
    if (this.mesh.position.z < -9) {
      this.active = false;
    }
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    if (this.hp <= 0) { this.active = false; return true; }
    const mat = this.mesh.material as StandardMaterial;
    const origColor = Color3.FromHexString(this.def.color);
    mat.emissiveColor = new Color3(1, 1, 1);
    setTimeout(() => {
      if (mat && !this.disposed) {
        mat.emissiveColor = origColor.scale(0.3);
      }
    }, 80);
    return false;
  }

  dispose() {
    this.disposed = true;
    this.mesh.dispose(false, true);
  }
}
