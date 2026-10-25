import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FlightEngine } from './flightEngine';
import { createCockpitGroup } from './proceduralModels';

interface GameCanvasProps {
  engineRef: React.MutableRefObject<FlightEngine | null>;
  onStatsUpdate: (stats: FlightEngine['playerStats'], ammo: FlightEngine['ammoState'], incomingMissile: boolean) => void;
  onEnemiesUpdate: (enemies: Array<FlightEngine['enemies'] extends Map<string, { data: infer T }> ? T : never>) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  engineRef,
  onStatsUpdate,
  onEnemiesUpdate,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x93c5fd, 0.00022);

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      6000
    );

    // 2. High-performance PBR Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0x93c5fd);
    container.appendChild(renderer.domElement);

    // 3. Studio & Sky Lighting Rig
    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.4);
    sunLight.position.set(500, 1400, -800);
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x38bdf8, 1.4);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    // 4. Procedural Atmospheric Bright Daylight Sky Dome
    const skyGeo = new THREE.SphereGeometry(4500, 32, 16);
    // Gradient sky texture using 2D canvas - bright daylight zenith so top is clearly visible
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 16;
    skyCanvas.height = 256;
    const skyCtx = skyCanvas.getContext('2d')!;
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256);
    skyGrad.addColorStop(0, '#2563eb'); // Zenith clear bright royal blue (was #0f172a)
    skyGrad.addColorStop(0.25, '#38bdf8'); // Upper sky clear cyan/azure
    skyGrad.addColorStop(0.65, '#7dd3fc'); // Mid sky bright daylight
    skyGrad.addColorStop(0.9, '#bae6fd'); // Lower horizon bright azure
    skyGrad.addColorStop(1.0, '#fed7aa'); // Warm golden sun haze at ground horizon
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, 16, 256);

    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    skyTexture.colorSpace = THREE.SRGBColorSpace;
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide,
      fog: false,
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);

    // 5. Procedural Grassy Terrain Ground Plane
    const terrainCanvas = document.createElement('canvas');
    terrainCanvas.width = 512;
    terrainCanvas.height = 512;
    const tCtx = terrainCanvas.getContext('2d')!;

    // Base grassy meadow color
    tCtx.fillStyle = '#2d6a4f';
    tCtx.fillRect(0, 0, 512, 512);

    // Patchy pasture and forest fields
    for (let i = 0; i < 40; i++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const pw = 40 + Math.random() * 80;
      const ph = 40 + Math.random() * 80;
      const colors = ['#1b4332', '#40916c', '#52b788', '#2d5a27', '#386641', '#334155'];
      tCtx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      tCtx.globalAlpha = 0.55;
      tCtx.fillRect(px, py, pw, ph);
    }

    // Grid field lines for aerial altitude reference
    tCtx.strokeStyle = '#1b4332';
    tCtx.lineWidth = 2;
    tCtx.globalAlpha = 0.35;
    for (let x = 0; x < 512; x += 64) {
      tCtx.beginPath();
      tCtx.moveTo(x, 0);
      tCtx.lineTo(x, 512);
      tCtx.stroke();
    }
    for (let y = 0; y < 512; y += 64) {
      tCtx.beginPath();
      tCtx.moveTo(0, y);
      tCtx.lineTo(512, y);
      tCtx.stroke();
    }
    tCtx.globalAlpha = 1.0;

    const terrainTexture = new THREE.CanvasTexture(terrainCanvas);
    terrainTexture.wrapS = THREE.RepeatWrapping;
    terrainTexture.wrapT = THREE.RepeatWrapping;
    terrainTexture.repeat.set(45, 45);
    terrainTexture.colorSpace = THREE.SRGBColorSpace;
    terrainTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const terrainGeo = new THREE.PlaneGeometry(14000, 14000, 2, 2);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTexture,
      roughness: 0.88,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(terrainGeo, terrainMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);

    // 6. Grassy Mountain Peaks & Alpine Ridges
    const mountainGroup = new THREE.Group();
    const mountainGeoLarge = new THREE.ConeGeometry(420, 360, 7);
    const mountainGeoMed = new THREE.ConeGeometry(260, 240, 6);
    const mountainGeoRidge = new THREE.ConeGeometry(340, 290, 8);

    const mountainMatGrass = new THREE.MeshStandardMaterial({
      color: 0x2d6a4f,
      roughness: 0.9,
      metalness: 0.1,
    });

    const mountainMatRock = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.85,
      metalness: 0.15,
    });

    const peakPositions: [number, number, number, 'large' | 'med' | 'ridge'][] = [
      [1400, 0, 1600, 'large'],
      [1800, 0, 1200, 'med'],
      [-1600, 0, 1100, 'large'],
      [-2100, 0, 600, 'ridge'],
      [900, 0, -1900, 'large'],
      [500, 0, -2300, 'med'],
      [-1200, 0, -1500, 'large'],
      [-1800, 0, -1800, 'ridge'],
      [2400, 0, -600, 'large'],
      [-2500, 0, -900, 'large'],
      [0, 0, -2500, 'ridge'],
      [-800, 0, 2100, 'med'],
      [2100, 0, 2100, 'ridge'],
      [-2200, 0, 2200, 'large'],
      [2600, 0, 800, 'med'],
      [-2700, 0, -400, 'ridge'],
      [1600, 0, -1400, 'med'],
      [-1400, 0, 800, 'med'],
    ];

    peakPositions.forEach(([x, y, z, type], idx) => {
      const geo = type === 'large' ? mountainGeoLarge : type === 'ridge' ? mountainGeoRidge : mountainGeoMed;
      // Alternate between mossy green alpine and slate mountain rock
      const mat = idx % 2 === 0 ? mountainMatGrass : mountainMatRock;
      const mountain = new THREE.Mesh(geo, mat);
      const heightOffset = type === 'large' ? 140 : type === 'ridge' ? 110 : 90;
      mountain.position.set(x, y + heightOffset, z);
      const sc = 0.9 + (idx % 4) * 0.25;
      mountain.scale.set(sc, sc * 0.9, sc);
      mountain.rotation.y = (idx * 1.3);
      mountainGroup.add(mountain);
    });
    scene.add(mountainGroup);

    // 7. Procedural Volumetric Cloud Bank
    const cloudGeo = new THREE.DodecahedronGeometry(60, 1);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.72,
    });

    const cloudsGroup = new THREE.Group();
    for (let c = 0; c < 45; c++) {
      const cluster = new THREE.Group();
      const cx = (Math.random() - 0.5) * 4500;
      const cy = 400 + Math.random() * 350;
      const cz = (Math.random() - 0.5) * 4500;
      cluster.position.set(cx, cy, cz);

      const puffs = 3 + Math.floor(Math.random() * 4);
      for (let p = 0; p < puffs; p++) {
        const puff = new THREE.Mesh(cloudGeo, cloudMat);
        puff.position.set(
          (Math.random() - 0.5) * 120,
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 120
        );
        const sc = 0.8 + Math.random() * 1.5;
        puff.scale.set(sc * 1.6, sc * 0.7, sc * 1.4);
        cluster.add(puff);
      }
      cloudsGroup.add(cluster);
    }
    scene.add(cloudsGroup);

    // 8. Flight Engine Initialization & Cockpit Mount
    const engine = new FlightEngine(scene, camera);
    const cockpit = createCockpitGroup();
    engine.setCockpit(cockpit);
    engineRef.current = engine;

    // Pre-warm shaders
    renderer.compile(scene, camera);

    // 9. High Precision Clock Game Loop
    const clock = new THREE.Clock();
    let animId: number;
    let uiUpdateTimer = 0;

    const tick = () => {
      animId = requestAnimationFrame(tick);
      const delta = clock.getDelta();

      // Update flight simulation
      engine.update(delta);

      // Render 3D Scene
      renderer.render(scene, camera);

      // Throttled UI State dispatch (~30fps for smooth React rendering without CPU bog)
      uiUpdateTimer += delta;
      if (uiUpdateTimer > 0.033) {
        uiUpdateTimer = 0;
        onStatsUpdate(
          { ...engine.playerStats },
          { ...engine.ammoState },
          engine.isIncomingMissileWarning
        );

        const enemyList: any[] = [];
        engine.enemies.forEach((e) => {
          enemyList.push({ ...e.data });
        });
        onEnemiesUpdate(enemyList);
      }
    };

    tick();

    // 10. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-slate-950 pointer-events-none select-none"
    />
  );
};
