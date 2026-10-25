import * as THREE from 'three';
import { AmmoState, EnemyAircraft, EnemyType, PickupItem, PickupType, PlayerStats, WeaponType } from '../types/game';
import { createEnemyModel, createFlareMesh, createMissileMesh, createPickupMesh, createRocketMesh } from './proceduralModels';
import { soundManager } from '../audio/soundManager';

export interface Projectile {
  id: string;
  type: 'bullet' | 'rocket' | 'missile' | 'enemy_bullet' | 'enemy_missile';
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  targetId?: string; // For homing missiles
  isDecoyed?: boolean; // If seduced by flare
  decoyTargetPos?: THREE.Vector3;
  damage: number;
}

export interface FlareObject {
  id: string;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface ParticleEffect {
  mesh: THREE.Points;
  velocities: Float32Array;
  life: number;
  maxLife: number;
}

export class FlightEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  // Player state
  public playerPosition = new THREE.Vector3(0, 300, 0);
  public playerQuaternion = new THREE.Quaternion();
  public playerSpeed = 65; // base m/s
  public playerThrottle = 0.6;
  public isBoosting = false;
  public playerStats: PlayerStats = {
    health: 100,
    maxHealth: 100,
    shield: 100,
    maxShield: 100,
    score: 0,
    kills: 0,
    speed: 65,
    altitude: 300,
    throttle: 0.6,
    isBoosting: false,
    heading: 0,
    activeWeapon: 'bullet',
    overdriveTimer: 0,
  };

  public ammoState: AmmoState = {
    bullets: 500,
    maxBullets: 800,
    rockets: 16,
    maxRockets: 24,
    missiles: 6,
    maxMissiles: 10,
    flares: 6,
    maxFlares: 10,
  };

  // Input state from joystick and controls
  public joystickPitch = 0; // -1 to 1
  public joystickRoll = 0;  // -1 to 1
  public invertPitch = true; // Traditional flight stick: pulling back climbs
  public isFiring = false;

  // Cockpit reference
  public cockpitGroup: THREE.Group | null = null;
  private cockpitRecoil = 0;
  private cockpitSway = new THREE.Vector2(0, 0);

  // Entities
  public enemies: Map<string, { data: EnemyAircraft; mesh: THREE.Group; velocity: THREE.Vector3; attackCooldown: number }> = new Map();
  public projectiles: Projectile[] = [];
  public flares: FlareObject[] = [];
  public pickups: Map<string, { data: PickupItem; mesh: THREE.Group }> = new Map();
  public particles: ParticleEffect[] = [];

  // Wave system
  public currentWave = 1;
  public waveEnemiesRemaining = 0;
  public isWaveSpawning = false;
  public waveAlertText: string | null = null;
  public onWaveComplete?: (wave: number) => void;
  public onGameOver?: (score: number, kills: number) => void;

  // Timers
  private lastShootTime = 0;
  private missileLockTargetId: string | null = null;
  public isIncomingMissileWarning = false;

  // Temp reusable math helpers (Zero GC in loop)
  private readonly _forward = new THREE.Vector3();
  private readonly _up = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();
  private readonly _targetQuat = new THREE.Quaternion();
  private readonly _euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly _tempVec = new THREE.Vector3();
  private readonly _tempVec2 = new THREE.Vector3();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.camera.position.set(0, 300, 0);
  }

  public setCockpit(cockpit: THREE.Group) {
    this.cockpitGroup = cockpit;
    this.scene.add(cockpit);
  }

  public startNewGame() {
    this.playerPosition.set(0, 320, 0);
    this.playerQuaternion.identity();
    this.playerSpeed = 65;
    this.playerThrottle = 0.6;
    this.isBoosting = false;
    this.playerStats.health = 100;
    this.playerStats.shield = 100;
    this.playerStats.score = 0;
    this.playerStats.kills = 0;
    this.playerStats.overdriveTimer = 0;

    this.ammoState = {
      bullets: 500,
      maxBullets: 800,
      rockets: 16,
      maxRockets: 24,
      missiles: 6,
      maxMissiles: 10,
      flares: 6,
      maxFlares: 10,
    };

    // Clear all existing entities
    this.clearAllEntities();
    this.currentWave = 1;
    this.spawnWave(1);
  }

  public clearAllEntities() {
    // Remove enemies
    this.enemies.forEach((e) => this.scene.remove(e.mesh));
    this.enemies.clear();

    // Remove projectiles
    this.projectiles.forEach((p) => this.scene.remove(p.mesh));
    this.projectiles = [];

    // Remove flares
    this.flares.forEach((f) => this.scene.remove(f.mesh));
    this.flares = [];

    // Remove pickups
    this.pickups.forEach((p) => this.scene.remove(p.mesh));
    this.pickups.clear();

    // Remove particles
    this.particles.forEach((p) => this.scene.remove(p.mesh));
    this.particles = [];
  }

  public spawnWave(waveNum: number) {
    this.currentWave = waveNum;
    this.isWaveSpawning = true;
    soundManager.playWaveAlert();

    const scoutCount = 2 + Math.min(waveNum * 2, 8);
    const heavyCount = waveNum >= 2 ? Math.min(Math.floor(waveNum * 1.5), 6) : 0;
    const aceCount = waveNum >= 4 ? Math.floor((waveNum - 3) * 1) : 0;
    this.waveEnemiesRemaining = scoutCount + heavyCount + aceCount;

    // Spawn scouts
    for (let i = 0; i < scoutCount; i++) {
      this.spawnEnemy('scout', i * 0.4);
    }
    // Spawn heavies
    for (let i = 0; i < heavyCount; i++) {
      this.spawnEnemy('heavy', (scoutCount + i) * 0.5);
    }
    // Spawn aces
    for (let i = 0; i < aceCount; i++) {
      this.spawnEnemy('ace', (scoutCount + heavyCount + i) * 0.6);
    }

    setTimeout(() => {
      this.isWaveSpawning = false;
    }, 1500);
  }

  private spawnEnemy(type: EnemyType, spawnOffset: number) {
    const id = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const mesh = createEnemyModel(type);

    // Get player's horizontal forward direction
    const playerFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.playerQuaternion);
    playerFwd.y = 0;
    if (playerFwd.lengthSq() < 0.001) {
      playerFwd.set(0, 0, -1);
    } else {
      playerFwd.normalize();
    }

    // Narrow front cone (within ±15 degrees directly in front)
    const lateralSpread = (Math.random() - 0.5) * 0.35;
    const perp = new THREE.Vector3(-playerFwd.z, 0, playerFwd.x);
    const spawnDir = playerFwd.clone().addScaledVector(perp, lateralSpread).normalize();

    // Spawn 650m - 900m ahead in front of the aircraft
    const distance = 650 + spawnOffset * 45 + Math.random() * 180;
    const pos = this.playerPosition.clone().add(spawnDir.multiplyScalar(distance));
    // Keep altitude level with player (±20m) so enemies come head-on from the FRONT, never from the top!
    pos.y = THREE.MathUtils.clamp(
      this.playerPosition.y + (Math.random() - 0.5) * 40,
      120,
      1200
    );

    mesh.position.copy(pos);
    mesh.lookAt(this.playerPosition.x, this.playerPosition.y, this.playerPosition.z);
    this.scene.add(mesh);

    let maxHealth = 60;
    let speed = 55;
    if (type === 'heavy') {
      maxHealth = 130;
      speed = 48;
    } else if (type === 'ace') {
      maxHealth = 260;
      speed = 75;
    }

    this.enemies.set(id, {
      data: {
        id,
        type,
        health: maxHealth,
        maxHealth,
        speed,
        position: { x: pos.x, y: pos.y, z: pos.z },
        distanceToPlayer: distance,
        isLocked: false,
        isInCrosshair: false,
        isFiring: false,
      },
      mesh,
      velocity: new THREE.Vector3(0, 0, -speed).applyQuaternion(mesh.quaternion),
      attackCooldown: 1.5 + Math.random() * 2,
    });
  }

  public setThrottle(val: number) {
    this.playerThrottle = Math.max(0.2, Math.min(1.0, val));
  }

  public setBoosting(boosting: boolean) {
    this.isBoosting = boosting;
  }

  public setWeapon(weapon: WeaponType) {
    this.playerStats.activeWeapon = weapon;
  }

  public deployFlares() {
    if (this.ammoState.flares <= 0 && this.playerStats.overdriveTimer <= 0) return;
    if (this.playerStats.overdriveTimer <= 0) {
      this.ammoState.flares--;
    }

    soundManager.playFlareLaunch();

    // Launch 3 flares in a spread pattern behind and down from player
    const flareOffsets = [
      new THREE.Vector3(-3, -1, 4),
      new THREE.Vector3(0, -1.5, 5),
      new THREE.Vector3(3, -1, 4),
    ];

    flareOffsets.forEach((offset) => {
      const mesh = createFlareMesh();
      const worldPos = offset.clone().applyQuaternion(this.playerQuaternion).add(this.playerPosition);
      mesh.position.copy(worldPos);
      this.scene.add(mesh);

      // Flare eject velocity (backward drift with atmospheric drag)
      const ejectVel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        -4 - Math.random() * 4,
        15 + Math.random() * 8
      ).applyQuaternion(this.playerQuaternion);

      const flareObj: FlareObject = {
        id: `flare_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        mesh,
        position: worldPos,
        velocity: ejectVel,
        life: 0,
        maxLife: 4.5,
      };
      this.flares.push(flareObj);
    });

    // Decoy all active incoming enemy missiles towards these flares!
    this.projectiles.forEach((proj) => {
      if (proj.type === 'enemy_missile' && !proj.isDecoyed) {
        // High probability to decoy missile
        proj.isDecoyed = true;
        proj.decoyTargetPos = this.playerPosition.clone().add(new THREE.Vector3(0, -10, 20).applyQuaternion(this.playerQuaternion));
      }
    });

    this.isIncomingMissileWarning = false;
    soundManager.setRwrAlert(false);
  }

  public shootWeapon() {
    const now = performance.now() / 1000;
    const isOverdrive = this.playerStats.overdriveTimer > 0;
    const weapon = this.playerStats.activeWeapon;

    if (weapon === 'bullet') {
      const cooldown = isOverdrive ? 0.05 : 0.09;
      if (now - this.lastShootTime < cooldown) return;
      if (this.ammoState.bullets <= 0 && !isOverdrive) return;

      this.lastShootTime = now;
      if (!isOverdrive) this.ammoState.bullets--;

      this.cockpitRecoil = 0.04;
      soundManager.playGunShot();

      // Dual wing cannon firing
      const leftMuzzle = new THREE.Vector3(-1.4, -0.4, -2.5).applyQuaternion(this.playerQuaternion).add(this.playerPosition);
      const rightMuzzle = new THREE.Vector3(1.4, -0.4, -2.5).applyQuaternion(this.playerQuaternion).add(this.playerPosition);
      const muzzlePos = (Math.random() > 0.5 ? leftMuzzle : rightMuzzle);

      const bulletGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 4);
      const bulletMat = new THREE.MeshBasicMaterial({ color: isOverdrive ? 0xc084fc : 0xfde047 });
      const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);
      bulletMesh.rotation.x = Math.PI / 2;
      bulletMesh.quaternion.copy(this.playerQuaternion);

      const bulletDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.playerQuaternion);
      // Slight spread
      bulletDir.x += (Math.random() - 0.5) * 0.015;
      bulletDir.y += (Math.random() - 0.5) * 0.015;
      bulletDir.normalize();

      bulletMesh.position.copy(muzzlePos);
      this.scene.add(bulletMesh);

      this.projectiles.push({
        id: `bullet_${Date.now()}_${Math.random()}`,
        type: 'bullet',
        mesh: bulletMesh,
        position: muzzlePos,
        velocity: bulletDir.multiplyScalar(450),
        life: 0,
        maxLife: 2.5,
        damage: 18,
      });

    } else if (weapon === 'rocket') {
      const cooldown = isOverdrive ? 0.25 : 0.5;
      if (now - this.lastShootTime < cooldown) return;
      if (this.ammoState.rockets <= 0 && !isOverdrive) return;

      this.lastShootTime = now;
      if (!isOverdrive) this.ammoState.rockets--;

      this.cockpitRecoil = 0.08;
      soundManager.playRocketLaunch();

      const launchPos = new THREE.Vector3(0, -0.8, -2.5).applyQuaternion(this.playerQuaternion).add(this.playerPosition);
      const rocketMesh = createRocketMesh();
      rocketMesh.quaternion.copy(this.playerQuaternion);
      rocketMesh.position.copy(launchPos);
      this.scene.add(rocketMesh);

      const rocketDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.playerQuaternion);
      this.projectiles.push({
        id: `rocket_${Date.now()}_${Math.random()}`,
        type: 'rocket',
        mesh: rocketMesh,
        position: launchPos,
        velocity: rocketDir.multiplyScalar(240),
        life: 0,
        maxLife: 4.0,
        damage: 85,
      });

    } else if (weapon === 'missile') {
      const cooldown = isOverdrive ? 0.5 : 1.2;
      if (now - this.lastShootTime < cooldown) return;
      if (this.ammoState.missiles <= 0 && !isOverdrive) return;

      this.lastShootTime = now;
      if (!isOverdrive) this.ammoState.missiles--;

      this.cockpitRecoil = 0.06;
      soundManager.playMissileLaunch();

      const launchPos = new THREE.Vector3(1.2, -0.7, -2.2).applyQuaternion(this.playerQuaternion).add(this.playerPosition);
      const missileMesh = createMissileMesh(false);
      missileMesh.quaternion.copy(this.playerQuaternion);
      missileMesh.position.copy(launchPos);
      this.scene.add(missileMesh);

      const missileDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.playerQuaternion);
      this.projectiles.push({
        id: `missile_${Date.now()}_${Math.random()}`,
        type: 'missile',
        mesh: missileMesh,
        position: launchPos,
        velocity: missileDir.multiplyScalar(150), // Accelerates up to 320 m/s
        life: 0,
        maxLife: 6.0,
        targetId: this.missileLockTargetId || undefined,
        damage: 130,
      });
    }
  }

  public update(delta: number) {
    if (delta > 0.1) delta = 0.1; // clamp lag spike

    // Update overdrive
    if (this.playerStats.overdriveTimer > 0) {
      this.playerStats.overdriveTimer = Math.max(0, this.playerStats.overdriveTimer - delta);
    }

    // 1. Flight Dynamics & Cockpit Navigation
    this.updateFlightPhysics(delta);

    // 2. Continuous Gun Shooting if fire button held
    if (this.isFiring) {
      this.shootWeapon();
    }

    // 3. Update Projectiles & Flare Decoys
    this.updateProjectiles(delta);
    this.updateFlares(delta);

    // 4. Update Enemy Aircraft AI & Target Acquisition
    this.updateEnemies(delta);

    // 5. Update Pickups
    this.updatePickups(delta);

    // 6. Update Particle Systems
    this.updateParticles(delta);

    // 7. Check Wave Status
    this.checkWaveProgress();

    // 8. Sound Engine Update
    soundManager.updateEngineSound(this.playerThrottle, this.isBoosting);
  }

  private updateFlightPhysics(delta: number) {
    // Base speed modulated by throttle + boost
    let targetSpeed = 40 + this.playerThrottle * 55;
    if (this.isBoosting) {
      targetSpeed += 45;
    }
    if (this.playerStats.overdriveTimer > 0) {
      targetSpeed += 25;
    }

    this.playerSpeed = THREE.MathUtils.damp(this.playerSpeed, targetSpeed, 4.0, delta);
    this.playerStats.speed = Math.round(this.playerSpeed * 3.6); // km/h
    this.playerStats.altitude = Math.round(this.playerPosition.y);
    this.playerStats.throttle = this.playerThrottle;
    this.playerStats.isBoosting = this.isBoosting;

    // Calculate real compass heading (0 = North, 90 = East, 180 = South, 270 = West)
    const fwdDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.playerQuaternion);
    let headingDeg = Math.round(Math.atan2(fwdDir.x, -fwdDir.z) * (180 / Math.PI));
    if (headingDeg < 0) headingDeg += 360;
    if (headingDeg >= 360) headingDeg = 0;
    this.playerStats.heading = headingDeg;

    // Turn rates: Pitch (X), Roll (Z), Yaw (Y)
    const pitchMultiplier = this.invertPitch ? 1 : -1;
    const pitchRate = this.joystickPitch * pitchMultiplier * 1.8 * delta;
    const rollRate = -this.joystickRoll * 2.8 * delta;
    const yawRate = -this.joystickRoll * 0.9 * delta; // Coordinated bank-to-turn

    // Apply incremental rotations to player orientation
    const rotX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchRate);
    const rotZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rollRate);
    const rotY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawRate);

    this.playerQuaternion.multiply(rotY).multiply(rotX).multiply(rotZ);
    this.playerQuaternion.normalize();

    // Forward translation
    this._forward.set(0, 0, -1).applyQuaternion(this.playerQuaternion);
    this.playerPosition.addScaledVector(this._forward, this.playerSpeed * delta);

    // Soft boundary leash: keep combat within 2500m radius
    const distFromOrigin = Math.sqrt(this.playerPosition.x * this.playerPosition.x + this.playerPosition.z * this.playerPosition.z);
    if (distFromOrigin > 2200) {
      // Guide back toward center
      const returnDir = new THREE.Vector3(-this.playerPosition.x, 0, -this.playerPosition.z).normalize();
      this.playerPosition.addScaledVector(returnDir, 25 * delta);
    }

    // Altitude floor / ceiling clamp
    if (this.playerPosition.y < 45) {
      this.playerPosition.y = 45;
      // Hull scrape damage if hitting mountain terrain
      this.takePlayerDamage(18 * delta);
    } else if (this.playerPosition.y > 1600) {
      this.playerPosition.y = 1600;
    }

    // Sync camera to player position & orientation
    this.camera.position.copy(this.playerPosition);
    this.camera.quaternion.copy(this.playerQuaternion);

    // Sync Cockpit Model with subtle recoil and head-bob sway
    if (this.cockpitGroup) {
      this.cockpitRecoil = THREE.MathUtils.damp(this.cockpitRecoil, 0, 8.0, delta);
      const swayAmount = this.isBoosting ? 0.015 : 0.006;
      this.cockpitSway.x = Math.sin(performance.now() * 0.012) * swayAmount;
      this.cockpitSway.y = Math.cos(performance.now() * 0.015) * swayAmount;

      this.cockpitGroup.position.copy(this.playerPosition);
      this.cockpitGroup.quaternion.copy(this.playerQuaternion);
      this.cockpitGroup.translateZ(this.cockpitRecoil);
      this.cockpitGroup.translateX(this.cockpitSway.x);
      this.cockpitGroup.translateY(this.cockpitSway.y);
    }
  }

  private updateProjectiles(delta: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Homing behavior for player missiles
      if (p.type === 'missile' && p.targetId) {
        const enemy = this.enemies.get(p.targetId);
        if (enemy) {
          const toTarget = enemy.mesh.position.clone().sub(p.position).normalize();
          // Proportional navigation turn
          p.velocity.lerp(toTarget.multiplyScalar(310), 4.5 * delta);
          p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), p.velocity.clone().normalize());
        }
      }

      // Homing behavior for enemy missiles
      if (p.type === 'enemy_missile') {
        let dest = this.playerPosition.clone();
        if (p.isDecoyed && p.decoyTargetPos) {
          // Guided missile tracks the decoy flare!
          dest = p.decoyTargetPos;
        }

        const toPlayer = dest.sub(p.position);
        const dist = toPlayer.length();

        // Check proximity detonation near flare
        if (p.isDecoyed && dist < 12) {
          this.createExplosion(p.position, false);
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
          continue;
        }

        const dir = toPlayer.normalize();
        p.velocity.lerp(dir.multiplyScalar(220), 3.2 * delta);
        p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), p.velocity.clone().normalize());

        // Check hit player
        if (!p.isDecoyed && p.position.distanceTo(this.playerPosition) < 6.0) {
          this.takePlayerDamage(45);
          this.createExplosion(p.position, true);
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      // Move projectile
      p.position.addScaledVector(p.velocity, delta);
      p.mesh.position.copy(p.position);

      // Player projectiles hit enemies
      if (p.type === 'bullet' || p.type === 'rocket' || p.type === 'missile') {
        let hit = false;
        for (const [id, enemy] of this.enemies) {
          const hitRadius = enemy.data.type === 'ace' ? 7.5 : enemy.data.type === 'heavy' ? 6.0 : 4.5;
          const dist = p.position.distanceTo(enemy.mesh.position);

          if (dist < hitRadius) {
            hit = true;
            enemy.data.health -= p.damage;
            this.createSparks(p.position, 12);

            if (p.type === 'rocket' || p.type === 'missile') {
              this.createExplosion(p.position, true);
            }

            if (enemy.data.health <= 0) {
              this.destroyEnemy(id);
            }
            break;
          }
        }

        if (hit) {
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      // Enemy bullets hit player
      if (p.type === 'enemy_bullet') {
        if (p.position.distanceTo(this.playerPosition) < 4.0) {
          this.takePlayerDamage(p.damage);
          this.createSparks(p.position, 8);
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
          continue;
        }
      }
    }
  }

  private updateFlares(delta: number) {
    for (let i = this.flares.length - 1; i >= 0; i--) {
      const f = this.flares[i];
      f.life += delta;

      if (f.life >= f.maxLife) {
        this.scene.remove(f.mesh);
        this.flares.splice(i, 1);
        continue;
      }

      // Flares decelerate due to air drag and fall slowly
      f.velocity.multiplyScalar(0.96);
      f.velocity.y -= 3.5 * delta;
      f.position.addScaledVector(f.velocity, delta);
      f.mesh.position.copy(f.position);

      // Flickering scale
      const scale = 1.0 + Math.sin(f.life * 25) * 0.3;
      f.mesh.scale.set(scale, scale, scale);
    }
  }

  private updateEnemies(delta: number) {
    const playerFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.playerQuaternion);
    let closestLockDistance = Infinity;
    let newLockTargetId: string | null = null;
    let anyMissileIncoming = false;

    // Check if any enemy missile is active
    for (const p of this.projectiles) {
      if (p.type === 'enemy_missile' && !p.isDecoyed) {
        anyMissileIncoming = true;
        break;
      }
    }

    if (anyMissileIncoming !== this.isIncomingMissileWarning) {
      this.isIncomingMissileWarning = anyMissileIncoming;
      soundManager.setRwrAlert(anyMissileIncoming);
    }

    for (const [id, enemy] of this.enemies) {
      const eData = enemy.data;
      const mesh = enemy.mesh;
      const toPlayer = this.playerPosition.clone().sub(mesh.position);
      const dist = toPlayer.length();
      eData.distanceToPlayer = Math.round(dist);

      // Calculate if in player crosshair / lock cone
      const toEnemyNorm = mesh.position.clone().sub(this.playerPosition).normalize();
      const dot = playerFwd.dot(toEnemyNorm); // 1 = directly in front
      const isInSight = dot > 0.88; // ~30 degree cone
      eData.isInCrosshair = dot > 0.985; // directly in bore crosshair

      if (isInSight && dist < 700 && dist < closestLockDistance) {
        closestLockDistance = dist;
        newLockTargetId = id;
      }

      // AI Flight Logic: Keep combat level, dogfight in front, no flying to the top
      enemy.attackCooldown -= delta;

      // Keep combat altitude band matched with player (±60m)
      const altDiff = this.playerPosition.y - mesh.position.y;

      if (dist > 180) {
        // Intercepting path: steer toward player, but clamp vertical climb/dive
        const desiredDir = toPlayer.clone().normalize();
        // Prevent steep climbs into the stratosphere: clamp vertical angle
        desiredDir.y = THREE.MathUtils.clamp(desiredDir.y, -0.22, 0.22);
        desiredDir.normalize();

        const currentFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(mesh.quaternion);
        currentFwd.lerp(desiredDir, 2.4 * delta);
        currentFwd.y = THREE.MathUtils.clamp(currentFwd.y, -0.25, 0.22);
        currentFwd.normalize();
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), currentFwd);
      } else {
        // Breakaway dogfight scissor: bank HORIZONTALLY (no climbing upwards!)
        const relPos = mesh.position.clone().sub(this.playerPosition);
        // Turn left or right across the horizontal plane
        const sideSign = (mesh.position.x > this.playerPosition.x) ? 1 : -1;
        const breakDir = new THREE.Vector3(-relPos.z * sideSign, 0, relPos.x * sideSign).normalize();
        // Subtle altitude correction to stay level
        breakDir.y = THREE.MathUtils.clamp(altDiff * 0.015, -0.15, 0.15);
        breakDir.normalize();
        mesh.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), breakDir), 2.2 * delta);
      }

      // Move enemy forward
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(mesh.quaternion);
      mesh.position.addScaledVector(fwd, eData.speed * delta);

      // Clamp altitude so enemies stay in combat arena and NEVER fly to the top of the sky!
      const minAlt = Math.max(70, this.playerPosition.y - 75);
      const maxAlt = Math.min(1300, this.playerPosition.y + 75);
      mesh.position.y = THREE.MathUtils.clamp(mesh.position.y, minAlt, maxAlt);

      eData.position = { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };

      // Compute precise cockpit-relative Radar Coordinates
      // Invert player orientation so:
      // - relPos.x > 0 is RIGHT, < 0 is LEFT
      // - relPos.z < 0 is FORWARD (top of radar), > 0 is BEHIND (bottom of radar)
      const invQuat = this.playerQuaternion.clone().invert();
      const localRelPos = mesh.position.clone().sub(this.playerPosition).applyQuaternion(invQuat);
      const radarMaxRange = 750; // 750m radar radius
      eData.radarX = THREE.MathUtils.clamp(localRelPos.x / radarMaxRange, -1, 1);
      eData.radarY = THREE.MathUtils.clamp(-localRelPos.z / radarMaxRange, -1, 1);

      // Attack player when lined up
      const enemyToPlayerNorm = toPlayer.clone().normalize();
      const enemyAimDot = fwd.dot(enemyToPlayerNorm);

      if (enemyAimDot > 0.92 && dist < 450 && enemy.attackCooldown <= 0) {
        if (eData.type === 'heavy' && Math.random() < 0.35 && dist > 150) {
          // Launch enemy heat-seeking missile at player!
          this.spawnEnemyMissile(mesh.position, mesh.quaternion);
          enemy.attackCooldown = 5.0 + Math.random() * 3.0;
        } else if (eData.type === 'ace' && Math.random() < 0.5 && dist > 140) {
          // Ace launches aggressive missile
          this.spawnEnemyMissile(mesh.position, mesh.quaternion);
          enemy.attackCooldown = 4.0 + Math.random() * 2.0;
        } else {
          // Fire enemy gun burst
          this.spawnEnemyBullet(mesh.position, enemyToPlayerNorm);
          enemy.attackCooldown = 0.45;
        }
      }
    }

    // Update target lock sound
    if (newLockTargetId !== this.missileLockTargetId) {
      this.missileLockTargetId = newLockTargetId;
      if (newLockTargetId) {
        soundManager.playLockOnTone(true);
      }
    }

    // Update target lock states on enemy objects
    this.enemies.forEach((e, id) => {
      e.data.isLocked = id === this.missileLockTargetId;
    });
  }

  private spawnEnemyBullet(pos: THREE.Vector3, dir: THREE.Vector3) {
    const bulletGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.0, 4);
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);
    bulletMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    bulletMesh.position.copy(pos);
    this.scene.add(bulletMesh);

    this.projectiles.push({
      id: `ebullet_${Date.now()}_${Math.random()}`,
      type: 'enemy_bullet',
      mesh: bulletMesh,
      position: pos.clone(),
      velocity: dir.clone().multiplyScalar(360),
      life: 0,
      maxLife: 2.5,
      damage: 10,
    });
  }

  private spawnEnemyMissile(pos: THREE.Vector3, quat: THREE.Quaternion) {
    const missileMesh = createMissileMesh(true);
    missileMesh.position.copy(pos);
    missileMesh.quaternion.copy(quat);
    this.scene.add(missileMesh);

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
    this.projectiles.push({
      id: `emissile_${Date.now()}_${Math.random()}`,
      type: 'enemy_missile',
      mesh: missileMesh,
      position: pos.clone(),
      velocity: fwd.multiplyScalar(180),
      life: 0,
      maxLife: 7.0,
      damage: 40,
    });

    this.isIncomingMissileWarning = true;
    soundManager.setRwrAlert(true);
  }

  private updatePickups(delta: number) {
    for (const [id, p] of this.pickups) {
      p.data.durationLeft -= delta;
      if (p.data.durationLeft <= 0) {
        this.scene.remove(p.mesh);
        this.pickups.delete(id);
        continue;
      }

      // Rotate pickup slowly
      p.mesh.rotation.y += 1.5 * delta;

      // Magnetic tractor pull if player gets near
      const dist = p.mesh.position.distanceTo(this.playerPosition);
      if (dist < 45) {
        // Pull towards player
        p.mesh.position.lerp(this.playerPosition, 6.0 * delta);
      }

      // Collect pickup
      if (dist < 8.0) {
        this.collectPickup(p.data.type);
        this.createSparks(p.mesh.position, 20);
        this.scene.remove(p.mesh);
        this.pickups.delete(id);
      }
    }
  }

  private collectPickup(type: PickupType) {
    soundManager.playPickup();
    this.playerStats.score += 500;

    if (type === 'ammo') {
      this.ammoState.bullets = Math.min(this.ammoState.maxBullets, this.ammoState.bullets + 300);
      this.ammoState.rockets = Math.min(this.ammoState.maxRockets, this.ammoState.rockets + 8);
      this.ammoState.missiles = Math.min(this.ammoState.maxMissiles, this.ammoState.missiles + 4);
    } else if (type === 'flares') {
      this.ammoState.flares = Math.min(this.ammoState.maxFlares, this.ammoState.flares + 4);
    } else if (type === 'repair') {
      this.playerStats.health = Math.min(this.playerStats.maxHealth, this.playerStats.health + 45);
      this.playerStats.shield = this.playerStats.maxShield;
    } else if (type === 'overdrive') {
      this.playerStats.overdriveTimer = 10.0;
    }
  }

  private destroyEnemy(id: string) {
    const enemy = this.enemies.get(id);
    if (!enemy) return;

    const pos = enemy.mesh.position.clone();
    this.createExplosion(pos, true);
    soundManager.playExplosion(enemy.data.type === 'ace' || enemy.data.type === 'heavy');

    // Score and kill count
    const scoreAdd = enemy.data.type === 'ace' ? 3000 : enemy.data.type === 'heavy' ? 1500 : 750;
    this.playerStats.score += scoreAdd;
    this.playerStats.kills += 1;
    this.waveEnemiesRemaining--;

    // Drop tactical pickup with high chance
    const pickupTypes: PickupType[] = ['ammo', 'flares', 'repair', 'overdrive'];
    const chosenType = pickupTypes[Math.floor(Math.random() * pickupTypes.length)];
    this.spawnPickup(chosenType, pos);

    this.scene.remove(enemy.mesh);
    this.enemies.delete(id);
  }

  public spawnPickup(type: PickupType, pos: THREE.Vector3) {
    const id = `pickup_${Date.now()}_${Math.random()}`;
    const mesh = createPickupMesh(type);
    mesh.position.copy(pos);
    this.scene.add(mesh);

    this.pickups.set(id, {
      data: {
        id,
        type,
        position: { x: pos.x, y: pos.y, z: pos.z },
        durationLeft: 40.0,
      },
      mesh,
    });
  }

  private takePlayerDamage(amount: number) {
    if (this.playerStats.shield > 0) {
      this.playerStats.shield -= amount;
      if (this.playerStats.shield < 0) {
        this.playerStats.health += this.playerStats.shield;
        this.playerStats.shield = 0;
      }
    } else {
      this.playerStats.health -= amount;
    }

    this.cockpitRecoil = 0.12;
    soundManager.playExplosion(false);

    if (this.playerStats.health <= 0) {
      this.playerStats.health = 0;
      if (this.onGameOver) {
        this.onGameOver(this.playerStats.score, this.playerStats.kills);
      }
    }
  }

  private checkWaveProgress() {
    if (this.waveEnemiesRemaining <= 0 && this.enemies.size === 0 && !this.isWaveSpawning) {
      this.currentWave++;
      if (this.onWaveComplete) {
        this.onWaveComplete(this.currentWave);
      }
      this.spawnWave(this.currentWave);
    }
  }

  private createExplosion(pos: THREE.Vector3, isLarge: boolean) {
    const count = isLarge ? 48 : 24;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const speed = 15 + Math.random() * (isLarge ? 45 : 25);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocities[i * 3 + 2] = Math.cos(phi) * speed;

      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.4 + Math.random() * 0.4;
      colors[i * 3 + 2] = 0.05;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: isLarge ? 2.8 : 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.particles.push({
      mesh: points,
      velocities,
      life: 0,
      maxLife: isLarge ? 1.4 : 0.8,
    });
  }

  private createSparks(pos: THREE.Vector3, count: number) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const speed = 8 + Math.random() * 20;
      velocities[i * 3] = (Math.random() - 0.5) * speed;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * speed;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * speed;

      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 0.2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.particles.push({
      mesh: points,
      velocities,
      life: 0,
      maxLife: 0.5,
    });
  }

  private updateParticles(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      const progress = p.life / p.maxLife;
      const positions = p.mesh.geometry.attributes.position.array as Float32Array;

      for (let j = 0; j < positions.length / 3; j++) {
        positions[j * 3] += p.velocities[j * 3] * delta;
        positions[j * 3 + 1] += p.velocities[j * 3 + 1] * delta;
        positions[j * 3 + 2] += p.velocities[j * 3 + 2] * delta;
      }
      p.mesh.geometry.attributes.position.needsUpdate = true;

      const mat = p.mesh.material as THREE.PointsMaterial;
      mat.opacity = 1.0 - progress;
    }
  }
}
