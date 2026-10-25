import * as THREE from 'three';
import { EnemyType, PickupType } from '../types/game';

// Procedural materials with varied PBR roughness and metalness
const MAT_STEALTH_DARK = new THREE.MeshStandardMaterial({
  color: 0x1f242d,
  roughness: 0.35,
  metalness: 0.75,
});

const MAT_CAMO_GREY = new THREE.MeshStandardMaterial({
  color: 0x475569,
  roughness: 0.5,
  metalness: 0.4,
});

const MAT_ENEMY_RED = new THREE.MeshStandardMaterial({
  color: 0xdc2626,
  roughness: 0.4,
  metalness: 0.3,
});

const MAT_JET_EXHAUST = new THREE.MeshStandardMaterial({
  color: 0x0f172a,
  roughness: 0.8,
  metalness: 0.9,
});

const MAT_AFTERBURNER_GLOW = new THREE.MeshBasicMaterial({
  color: 0x00f0ff,
});

const MAT_ENEMY_GLOW = new THREE.MeshBasicMaterial({
  color: 0xff3b30,
});

const MAT_CANOPY_GLASS = new THREE.MeshPhysicalMaterial({
  color: 0x223344,
  metalness: 0.1,
  roughness: 0.1,
  transmission: 0.85,
  ior: 1.5,
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
});

const MAT_COCKPIT_FRAME = new THREE.MeshStandardMaterial({
  color: 0x11161d,
  roughness: 0.7,
  metalness: 0.3,
});

const MAT_DASHBOARD = new THREE.MeshStandardMaterial({
  color: 0x0b0e14,
  roughness: 0.85,
  metalness: 0.2,
});

/**
 * Creates the first-person cockpit interior model that attaches to the player's camera.
 */
export function createCockpitGroup(): THREE.Group {
  const cockpit = new THREE.Group();

  // 1. Dashboard base console (curved forward console)
  const dashGeo = new THREE.BoxGeometry(2.4, 0.45, 1.2);
  const dashMesh = new THREE.Mesh(dashGeo, MAT_DASHBOARD);
  dashMesh.position.set(0, -0.65, -0.9);
  dashMesh.rotation.x = 0.25;
  cockpit.add(dashMesh);

  // 2. HUD Projector Box (center top of dash)
  const hudBoxGeo = new THREE.BoxGeometry(0.55, 0.18, 0.4);
  const hudBoxMesh = new THREE.Mesh(hudBoxGeo, MAT_COCKPIT_FRAME);
  hudBoxMesh.position.set(0, -0.42, -0.95);
  hudBoxMesh.rotation.x = 0.25;
  cockpit.add(hudBoxMesh);

  // 3. HUD Combiner Glass (angled holographic plate)
  const hudGlassGeo = new THREE.PlaneGeometry(0.48, 0.38);
  const hudGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x22d3ee,
    transmission: 0.92,
    roughness: 0.05,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const hudGlassMesh = new THREE.Mesh(hudGlassGeo, hudGlassMat);
  hudGlassMesh.position.set(0, -0.22, -0.95);
  hudGlassMesh.rotation.x = -0.35;
  cockpit.add(hudGlassMesh);

  // 4. Canopy Main Arch Frame (fore-and-aft structural frame)
  // Left arch strut
  const strutLeftGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.8, 8);
  const strutLeft = new THREE.Mesh(strutLeftGeo, MAT_COCKPIT_FRAME);
  strutLeft.position.set(-0.85, 0.15, -0.5);
  strutLeft.rotation.z = -0.32;
  strutLeft.rotation.x = 0.55;
  cockpit.add(strutLeft);

  // Right arch strut
  const strutRight = new THREE.Mesh(strutLeftGeo, MAT_COCKPIT_FRAME);
  strutRight.position.set(0.85, 0.15, -0.5);
  strutRight.rotation.z = 0.32;
  strutRight.rotation.x = 0.55;
  cockpit.add(strutRight);

  // Top canopy transverse bow frame
  const bowGeo = new THREE.TorusGeometry(0.95, 0.035, 8, 16, Math.PI);
  const bowMesh = new THREE.Mesh(bowGeo, MAT_COCKPIT_FRAME);
  bowMesh.position.set(0, 0.45, -0.35);
  bowMesh.rotation.x = 0.4;
  cockpit.add(bowMesh);

  // Central canopy spine strut (running forward above pilot)
  const spineGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8);
  const spine = new THREE.Mesh(spineGeo, MAT_COCKPIT_FRAME);
  spine.position.set(0, 0.72, -0.85);
  spine.rotation.x = 1.35;
  cockpit.add(spine);

  // 5. Left & Right Instrument panels / MFDs
  const mfdScreenGeo = new THREE.PlaneGeometry(0.42, 0.32);
  const mfdMat = new THREE.MeshBasicMaterial({
    color: 0x052e16,
    side: THREE.DoubleSide,
  });

  const mfdLeft = new THREE.Mesh(mfdScreenGeo, mfdMat);
  mfdLeft.position.set(-0.62, -0.55, -0.85);
  mfdLeft.rotation.x = -0.28;
  mfdLeft.rotation.y = 0.32;
  cockpit.add(mfdLeft);

  const mfdRight = new THREE.Mesh(mfdScreenGeo, mfdMat);
  mfdRight.position.set(0.62, -0.55, -0.85);
  mfdRight.rotation.x = -0.28;
  mfdRight.rotation.y = -0.32;
  cockpit.add(mfdRight);

  // 6. Left & Right Canopy Glass Quarters
  const canopyDomeGeo = new THREE.SphereGeometry(1.4, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.48);
  const canopyDome = new THREE.Mesh(canopyDomeGeo, MAT_CANOPY_GLASS);
  canopyDome.position.set(0, -0.2, -0.35);
  canopyDome.scale.set(0.9, 0.7, 1.5);
  cockpit.add(canopyDome);

  // 7. Pilot Control Stick Base (visible at bottom center)
  const stickBaseGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.15, 8);
  const stickBase = new THREE.Mesh(stickBaseGeo, MAT_COCKPIT_FRAME);
  stickBase.position.set(0, -0.85, -0.4);
  cockpit.add(stickBase);

  const stickGripGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8);
  const stickGrip = new THREE.Mesh(stickGripGeo, MAT_DASHBOARD);
  stickGrip.position.set(0, -0.68, -0.42);
  stickGrip.rotation.x = -0.15;
  cockpit.add(stickGrip);

  // Nose tip visible outside far in front
  const noseGeo = new THREE.ConeGeometry(0.35, 2.5, 8);
  const noseMesh = new THREE.Mesh(noseGeo, MAT_STEALTH_DARK);
  noseMesh.rotation.x = -Math.PI / 2;
  noseMesh.position.set(0, -0.65, -3.2);
  cockpit.add(noseMesh);

  return cockpit;
}

/**
 * Creates a 3–12 part procedural enemy aircraft mesh.
 */
export function createEnemyModel(type: EnemyType): THREE.Group {
  const group = new THREE.Group();

  if (type === 'scout') {
    // Nimble twin-tail Interceptor
    // 1. Fuselage
    const fuseGeo = new THREE.ConeGeometry(0.7, 4.2, 8);
    const fuse = new THREE.Mesh(fuseGeo, MAT_CAMO_GREY);
    fuse.rotation.x = Math.PI / 2;
    group.add(fuse);

    // 2. Main Wings (swept delta)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0.8);
    wingShape.lineTo(2.8, -0.8);
    wingShape.lineTo(2.6, -1.5);
    wingShape.lineTo(0, -1.0);
    wingShape.lineTo(-2.6, -1.5);
    wingShape.lineTo(-2.8, -0.8);
    wingShape.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.08, bevelEnabled: false });
    const wings = new THREE.Mesh(wingGeo, MAT_CAMO_GREY);
    wings.rotation.x = Math.PI / 2;
    wings.position.set(0, 0.02, 0);
    group.add(wings);

    // 3. Canopy Bubble
    const canopyGeo = new THREE.CapsuleGeometry(0.3, 0.8, 6, 8);
    const canopy = new THREE.Mesh(canopyGeo, MAT_CANOPY_GLASS);
    canopy.position.set(0, 0.32, 0.3);
    canopy.rotation.x = Math.PI / 2.3;
    group.add(canopy);

    // 4 & 5. Twin canted vertical stabilizers
    const finGeo = new THREE.BoxGeometry(0.08, 0.85, 0.9);
    const finL = new THREE.Mesh(finGeo, MAT_ENEMY_RED);
    finL.position.set(-0.65, 0.45, -1.3);
    finL.rotation.z = -0.22;
    finL.rotation.y = 0.05;
    group.add(finL);

    const finR = new THREE.Mesh(finGeo, MAT_ENEMY_RED);
    finR.position.set(0.65, 0.45, -1.3);
    finR.rotation.z = 0.22;
    finR.rotation.y = -0.05;
    group.add(finR);

    // 6 & 7. Twin exhaust nozzles with glowing jet flame
    const nozzGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.5, 8);
    const nozzL = new THREE.Mesh(nozzGeo, MAT_JET_EXHAUST);
    nozzL.rotation.x = Math.PI / 2;
    nozzL.position.set(-0.35, 0, -1.8);
    group.add(nozzL);

    const nozzR = new THREE.Mesh(nozzGeo, MAT_JET_EXHAUST);
    nozzR.rotation.x = Math.PI / 2;
    nozzR.position.set(0.35, 0, -1.8);
    group.add(nozzR);

    const flameGeo = new THREE.ConeGeometry(0.18, 0.8, 6);
    const flameL = new THREE.Mesh(flameGeo, MAT_ENEMY_GLOW);
    flameL.rotation.x = -Math.PI / 2;
    flameL.position.set(-0.35, 0, -2.3);
    group.add(flameL);

    const flameR = new THREE.Mesh(flameGeo, MAT_ENEMY_GLOW);
    flameR.rotation.x = -Math.PI / 2;
    flameR.position.set(0.35, 0, -2.3);
    group.add(flameR);

  } else if (type === 'heavy') {
    // Heavy Strike Fighter with dual missile pods and broad fuselage
    // 1. Fuselage
    const fuseGeo = new THREE.BoxGeometry(1.4, 0.65, 5.2);
    const fuse = new THREE.Mesh(fuseGeo, MAT_STEALTH_DARK);
    group.add(fuse);

    // 2. Nose Cone
    const noseGeo = new THREE.ConeGeometry(0.7, 1.8, 6);
    const nose = new THREE.Mesh(noseGeo, MAT_STEALTH_DARK);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, -0.05, 3.2);
    group.add(nose);

    // 3. Broad swept wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 1.2);
    wingShape.lineTo(3.8, -1.0);
    wingShape.lineTo(3.6, -2.0);
    wingShape.lineTo(0, -1.6);
    wingShape.lineTo(-3.6, -2.0);
    wingShape.lineTo(-3.8, -1.0);
    wingShape.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.12, bevelEnabled: false });
    const wings = new THREE.Mesh(wingGeo, MAT_STEALTH_DARK);
    wings.rotation.x = Math.PI / 2;
    group.add(wings);

    // 4. Heavy Rocket pods on wing hardpoints
    const podGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.8, 8);
    const podL = new THREE.Mesh(podGeo, MAT_ENEMY_RED);
    podL.rotation.x = Math.PI / 2;
    podL.position.set(-2.2, -0.2, -0.4);
    group.add(podL);

    const podR = new THREE.Mesh(podGeo, MAT_ENEMY_RED);
    podR.rotation.x = Math.PI / 2;
    podR.position.set(2.2, -0.2, -0.4);
    group.add(podR);

    // 5 & 6. Large twin vertical rudders
    const finGeo = new THREE.BoxGeometry(0.1, 1.3, 1.4);
    const finL = new THREE.Mesh(finGeo, MAT_ENEMY_RED);
    finL.position.set(-0.85, 0.65, -1.8);
    finL.rotation.z = -0.18;
    group.add(finL);

    const finR = new THREE.Mesh(finGeo, MAT_ENEMY_RED);
    finR.position.set(0.85, 0.65, -1.8);
    finR.rotation.z = 0.18;
    group.add(finR);

    // 7. Gold canopy
    const canopyGeo = new THREE.CapsuleGeometry(0.42, 1.2, 6, 8);
    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      metalness: 0.3,
      roughness: 0.15,
      transparent: true,
      opacity: 0.7,
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.45, 0.8);
    canopy.rotation.x = Math.PI / 2.2;
    group.add(canopy);

    // 8. Afterburners
    const flameGeo = new THREE.ConeGeometry(0.28, 1.4, 6);
    const flameL = new THREE.Mesh(flameGeo, MAT_ENEMY_GLOW);
    flameL.rotation.x = -Math.PI / 2;
    flameL.position.set(-0.48, 0, -3.2);
    group.add(flameL);

    const flameR = new THREE.Mesh(flameGeo, MAT_ENEMY_GLOW);
    flameR.rotation.x = -Math.PI / 2;
    flameR.position.set(0.48, 0, -3.2);
    group.add(flameR);

  } else {
    // Ace Boss Jet (Advanced 5th-Gen Stealth Super-Fighter)
    // 1. Faceted stealth hull
    const fuseGeo = new THREE.CylinderGeometry(0.9, 1.2, 6.0, 5);
    const fuse = new THREE.Mesh(fuseGeo, MAT_STEALTH_DARK);
    fuse.rotation.x = Math.PI / 2;
    group.add(fuse);

    // 2. Chiseled forward nose
    const noseGeo = new THREE.ConeGeometry(0.85, 2.5, 5);
    const nose = new THREE.Mesh(noseGeo, MAT_ENEMY_RED);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0, 4.0);
    group.add(nose);

    // 3. Forward-swept stealth delta wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 1.8);
    wingShape.lineTo(4.6, 0.2);
    wingShape.lineTo(4.2, -1.8);
    wingShape.lineTo(0, -2.4);
    wingShape.lineTo(-4.2, -1.8);
    wingShape.lineTo(-4.6, 0.2);
    wingShape.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05 });
    const wings = new THREE.Mesh(wingGeo, MAT_STEALTH_DARK);
    wings.rotation.x = Math.PI / 2;
    group.add(wings);

    // 4 & 5. Canting stealth rudders with crimson glow edges
    const finGeo = new THREE.BoxGeometry(0.12, 1.6, 1.6);
    const finL = new THREE.Mesh(finGeo, MAT_ENEMY_RED);
    finL.position.set(-1.1, 0.8, -2.0);
    finL.rotation.z = -0.38;
    group.add(finL);

    const finR = new THREE.Mesh(finGeo, MAT_ENEMY_RED);
    finR.position.set(1.1, 0.8, -2.0);
    finR.rotation.z = 0.38;
    group.add(finR);

    // 6. Ace Canopy Bubble (dark iridium)
    const canopyGeo = new THREE.CapsuleGeometry(0.48, 1.5, 8, 8);
    const aceCanopyMat = new THREE.MeshPhysicalMaterial({
      color: 0xa855f7,
      metalness: 0.7,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8,
    });
    const canopy = new THREE.Mesh(canopyGeo, aceCanopyMat);
    canopy.position.set(0, 0.55, 1.2);
    canopy.rotation.x = Math.PI / 2.2;
    group.add(canopy);

    // 7. Twin Violet/Cyan Plasma Thrusters
    const plasmaGeo = new THREE.ConeGeometry(0.35, 2.0, 8);
    const plasmaMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const flameL = new THREE.Mesh(plasmaGeo, plasmaMat);
    flameL.rotation.x = -Math.PI / 2;
    flameL.position.set(-0.6, 0, -3.8);
    group.add(flameL);

    const flameR = new THREE.Mesh(plasmaGeo, plasmaMat);
    flameR.rotation.x = -Math.PI / 2;
    flameR.position.set(0.6, 0, -3.8);
    group.add(flameR);
  }

  // Rotate group so it faces forward along -Z in local coords
  group.rotation.y = Math.PI;
  return group;
}

/**
 * Creates a guided missile 3D mesh.
 */
export function createMissileMesh(isEnemy: boolean = false): THREE.Group {
  const missile = new THREE.Group();

  // Cylindrical fuselage
  const bodyGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.4, 8);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0xef4444 : 0xe2e8f0,
    metalness: 0.6,
    roughness: 0.3,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI / 2;
  missile.add(body);

  // Nose cone
  const noseGeo = new THREE.ConeGeometry(0.1, 0.35, 8);
  const noseMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x7f1d1d : 0x0284c7,
    roughness: 0.2,
  });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -0.85;
  missile.add(nose);

  // 4 Stabilizing tail fins
  const finGeo = new THREE.BoxGeometry(0.42, 0.02, 0.25);
  const finMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
  const finH = new THREE.Mesh(finGeo, finMat);
  finH.position.z = 0.55;
  missile.add(finH);

  const finV = new THREE.Mesh(finGeo, finMat);
  finV.position.z = 0.55;
  finV.rotation.z = Math.PI / 2;
  missile.add(finV);

  // Rocket exhaust plume
  const plumeGeo = new THREE.ConeGeometry(0.08, 0.45, 6);
  const plumeMat = new THREE.MeshBasicMaterial({ color: isEnemy ? 0xff4500 : 0x38bdf8 });
  const plume = new THREE.Mesh(plumeGeo, plumeMat);
  plume.rotation.x = Math.PI / 2;
  plume.position.z = 0.9;
  missile.add(plume);

  return missile;
}

/**
 * Creates an unguided heavy rocket 3D mesh.
 */
export function createRocketMesh(): THREE.Group {
  const rocket = new THREE.Group();

  const bodyGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.2, 8);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.7,
    roughness: 0.3,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI / 2;
  rocket.add(body);

  const noseGeo = new THREE.ConeGeometry(0.14, 0.4, 8);
  const noseMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.3 });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -0.8;
  rocket.add(nose);

  const tailGeo = new THREE.BoxGeometry(0.5, 0.03, 0.3);
  const tail = new THREE.Mesh(tailGeo, bodyMat);
  tail.position.z = 0.45;
  rocket.add(tail);

  const flameGeo = new THREE.ConeGeometry(0.12, 0.5, 6);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.rotation.x = Math.PI / 2;
  flame.position.z = 0.8;
  rocket.add(flame);

  return rocket;
}

/**
 * Creates a countermeasure flare 3D mesh.
 */
export function createFlareMesh(): THREE.Group {
  const flare = new THREE.Group();

  const coreGeo = new THREE.SphereGeometry(0.3, 8, 8);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const core = new THREE.Mesh(coreGeo, coreMat);
  flare.add(core);

  const glowGeo = new THREE.SphereGeometry(0.8, 8, 8);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.6,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  flare.add(glow);

  return flare;
}

/**
 * Creates an airborne pickup / tactical supply pod.
 */
export function createPickupMesh(type: PickupType): THREE.Group {
  const pod = new THREE.Group();

  let color = 0x3b82f6;
  if (type === 'ammo') color = 0xeab308; // Yellow
  if (type === 'flares') color = 0xf97316; // Orange
  if (type === 'repair') color = 0x22c55e; // Green
  if (type === 'overdrive') color = 0xa855f7; // Purple

  // Octagonal tactical supply pod
  const podGeo = new THREE.CylinderGeometry(0.65, 0.65, 1.1, 6);
  const podMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.3,
  });
  const podBody = new THREE.Mesh(podGeo, podMat);
  pod.add(podBody);

  // Glowing energy ring in middle
  const ringGeo = new THREE.TorusGeometry(0.72, 0.08, 6, 16);
  const ringMat = new THREE.MeshBasicMaterial({ color });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  pod.add(ring);

  // Glowing hovering beacon icon on top
  const iconGeo = new THREE.OctahedronGeometry(0.4);
  const iconMat = new THREE.MeshBasicMaterial({ color, wireframe: true });
  const icon = new THREE.Mesh(iconGeo, iconMat);
  icon.position.y = 1.0;
  pod.add(icon);

  return pod;
}
