export type WeaponType = 'bullet' | 'rocket' | 'missile';

export interface AmmoState {
  bullets: number;
  maxBullets: number;
  rockets: number;
  maxRockets: number;
  missiles: number;
  maxMissiles: number;
  flares: number;
  maxFlares: number;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  score: number;
  kills: number;
  speed: number;
  altitude: number;
  throttle: number;
  isBoosting: boolean;
  heading: number; // 0 - 359 degrees
  activeWeapon: WeaponType;
  overdriveTimer: number; // >0 means infinite ammo/double fire rate
}

export type EnemyType = 'scout' | 'heavy' | 'ace';

export interface RadarBlip {
  id: string;
  type: 'scout' | 'heavy' | 'ace' | 'missile' | 'pickup';
  relX: number; // -1 (far left) to +1 (far right)
  relY: number; // -1 (behind) to +1 (dead ahead)
  distance: number;
  isLocked?: boolean;
}

export interface EnemyAircraft {
  id: string;
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  position: { x: number; y: number; z: number };
  targetLeadPosition?: { x: number; y: number; z: number };
  distanceToPlayer: number;
  isLocked: boolean;
  isInCrosshair: boolean;
  isFiring: boolean;
  radarX?: number;
  radarY?: number;
}

export type PickupType = 'ammo' | 'flares' | 'repair' | 'overdrive';

export interface PickupItem {
  id: string;
  type: PickupType;
  position: { x: number; y: number; z: number };
  durationLeft: number;
}

export interface GameSettings {
  invertPitch: boolean;
  soundVolume: number;
  musicVolume: number;
  graphicsQuality: 'high' | 'medium' | 'low';
}

export type GameStatus = 'menu' | 'playing' | 'paused' | 'gameover' | 'victory';

export interface WaveConfig {
  waveNumber: number;
  title: string;
  scoutCount: number;
  heavyCount: number;
  aceCount: number;
  spawnDelay: number;
}
