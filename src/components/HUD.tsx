import React from 'react';
import { AmmoState, EnemyAircraft, PlayerStats } from '../types/game';
import { AlertTriangle, Shield, Heart, Zap, Crosshair } from 'lucide-react';

interface HUDProps {
  stats: PlayerStats;
  ammo: AmmoState;
  enemies: EnemyAircraft[];
  isIncomingMissile: boolean;
  onDeployFlares: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  ammo,
  enemies,
  isIncomingMissile,
  onDeployFlares,
}) => {
  const currentHeading = stats.heading ?? 0;
  const lockedEnemy = enemies.find((e) => e.isLocked);

  // Generate dynamic compass tape ticks from heading -30° to +30°
  const compassTicks: { deg: number; label: string; offsetPx: number }[] = [];
  const startDeg = Math.floor((currentHeading - 35) / 5) * 5;
  for (let d = startDeg; d <= currentHeading + 35; d += 5) {
    const normalizedDeg = ((d % 360) + 360) % 360;
    const diff = d - currentHeading;
    const offsetPx = diff * 4.5; // 4.5px per degree
    let label = '';
    if (normalizedDeg === 0) label = 'N';
    else if (normalizedDeg === 90) label = 'E';
    else if (normalizedDeg === 180) label = 'S';
    else if (normalizedDeg === 270) label = 'W';
    else if (normalizedDeg % 10 === 0) {
      label = (normalizedDeg / 10).toString().padStart(2, '0');
    }
    compassTicks.push({ deg: normalizedDeg, label, offsetPx });
  }

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-mono text-cyan-400">
      {/* 1. Authentic Fighter HUD Heading Tape (Dynamic Compass) */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
        {/* Dynamic Sliding Compass Tape Box */}
        <div className="relative w-64 h-8 bg-black/60 border border-cyan-500/40 rounded-sm overflow-hidden flex flex-col items-center">
          {/* Central Lubber Line Caret */}
          <div className="absolute top-0 z-10 text-[10px] text-cyan-300 font-bold leading-none">
            ▼
          </div>
          <div className="absolute bottom-0 w-0.5 h-2 bg-cyan-400 z-10" />

          {/* Sliding Tick Marks */}
          <div className="relative w-full h-full flex items-center justify-center">
            {compassTicks.map((tick, i) => (
              <div
                key={i}
                className="absolute flex flex-col items-center transition-transform duration-75"
                style={{ transform: `translateX(${tick.offsetPx}px)` }}
              >
                <div
                  className={`w-[1px] bg-cyan-400/80 ${
                    tick.label ? 'h-2.5' : 'h-1.5 opacity-50'
                  }`}
                />
                {tick.label && (
                  <span
                    className={`text-[9px] mt-0.5 leading-none font-bold ${
                      tick.label === 'N'
                        ? 'text-red-400'
                        : tick.label === 'E' || tick.label === 'S' || tick.label === 'W'
                        ? 'text-amber-300'
                        : 'text-cyan-300'
                    }`}
                  >
                    {tick.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Flight Data Sub-Bar */}
        <div className="flex items-center space-x-4 px-3 py-0.5 bg-black/50 border-x border-b border-cyan-500/30 rounded-b-sm text-[11px] tracking-wider mt-0.5">
          <span className="text-cyan-200 font-black">
            HDG {currentHeading.toString().padStart(3, '0')}°
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-400">MACH {(stats.speed / 1234).toFixed(2)}</span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-400">ALT {stats.altitude}M</span>
          <span className="text-slate-500">|</span>
          <span className="text-amber-400 font-bold">SCORE {stats.score}</span>
        </div>
      </div>

      {/* 2. Top-Center Warning Alert: INCOMING MISSILE LOCK */}
      {isIncomingMissile && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
          <div className="flex items-center space-x-3 px-4 py-2 bg-red-950/95 border-2 border-red-500 rounded text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.8)] animate-bounce pointer-events-auto">
            <AlertTriangle className="w-5 h-5 text-red-400 animate-spin" />
            <div className="text-center">
              <div className="text-xs font-black tracking-widest text-red-300">
                ⚠️ WARNING: MISSILE LOCK INCOMING
              </div>
              <div className="text-[10px] text-red-200 mt-0.5">
                PRESS <span className="font-bold underline text-amber-300">FLARES</span> TO DECOY!
              </div>
            </div>
            <button
              onClick={onDeployFlares}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] rounded uppercase active:scale-95 transition-transform cursor-pointer"
            >
              FLARE
            </button>
          </div>
        </div>
      )}

      {/* Overdrive Notification */}
      {stats.overdriveTimer > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center space-x-2 px-3 py-1 bg-purple-950/85 border border-purple-400 rounded text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.5)]">
          <Zap className="w-3.5 h-3.5 text-purple-300" />
          <span className="text-[11px] font-bold tracking-wider">
            OVERDRIVE: {stats.overdriveTimer.toFixed(1)}s (UNLIMITED AMMO)
          </span>
        </div>
      )}

      {/* 3. Sleek, Compact Bore Crosshair ("make crow hair smaller") */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-20 h-20 flex items-center justify-center">
          {/* Precision Compact Aiming Ring (56px) */}
          <div
            className={`w-14 h-14 rounded-full border transition-all duration-150 ${
              lockedEnemy
                ? 'border-red-500 border-dashed scale-105 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                : 'border-cyan-400/60 border-dashed'
            }`}
          />

          {/* Tiny Center Bore Pip Dot */}
          <div className="absolute w-2 h-2 rounded-full border border-cyan-300 flex items-center justify-center">
            <div className="w-0.5 h-0.5 bg-cyan-200 rounded-full" />
          </div>

          {/* Short Precision Lead Line Ticks (4px) */}
          <div className="absolute -top-1 w-[1px] h-2 bg-cyan-400/80" />
          <div className="absolute -bottom-1 w-[1px] h-2 bg-cyan-400/80" />
          <div className="absolute -left-1 w-2 h-[1px] bg-cyan-400/80" />
          <div className="absolute -right-1 w-2 h-[1px] bg-cyan-400/80" />

          {/* Small Corner Framing Brackets for Missile Lock */}
          {lockedEnemy && (
            <div className="absolute w-20 h-20 flex items-center justify-center pointer-events-none">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-500" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-500" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-500" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-500" />
              <div className="absolute -top-4 text-[9px] font-black text-red-400 tracking-widest bg-black/80 px-1 border border-red-500/60 rounded-xs">
                LOCK {lockedEnemy.distanceToPlayer}M
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Left HUD Flight Tape & Fully Working Cockpit Radar */}
      <div className="absolute left-4 top-20 bottom-32 flex flex-col justify-between pointer-events-none">
        {/* Speedometer & Thrust Panel */}
        <div className="bg-black/60 border border-cyan-500/40 p-2 rounded text-xs space-y-1 w-32">
          <div className="text-[9px] text-cyan-300/80 uppercase tracking-wider">Airspeed</div>
          <div className="text-lg font-black text-cyan-300">
            {stats.speed} <span className="text-[9px] text-slate-400">KM/H</span>
          </div>

          <div>
            <div className="flex justify-between text-[9px] text-slate-300">
              <span>THRUST</span>
              <span>{Math.round(stats.throttle * 100)}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden mt-0.5">
              <div
                className={`h-full transition-all duration-75 ${
                  stats.isBoosting ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
                style={{ width: `${stats.throttle * 100}%` }}
              />
            </div>
          </div>

          {stats.isBoosting && (
            <div className="text-[9px] font-bold text-amber-400">
              AFTERBURNER
            </div>
          )}
        </div>

        {/* Real Dynamic Tactical Radar / Mini-Map ("minimap and radar to actually work") */}
        <div className="relative w-36 h-36 bg-black/80 border-2 border-cyan-500/60 rounded-full p-1 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          {/* Range rings (250m, 500m, 750m) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-[1px] bg-cyan-500/20" />
            <div className="h-full w-[1px] bg-cyan-500/20" />
          </div>
          <div className="absolute w-12 h-12 rounded-full border border-cyan-500/25" />
          <div className="absolute w-24 h-24 rounded-full border border-cyan-500/20" />
          <div className="absolute w-32 h-32 rounded-full border border-dashed border-cyan-500/15" />

          {/* Heading references on radar circumference: FWD is UP */}
          <span className="absolute top-1 text-[8px] font-bold text-cyan-300">FWD</span>
          <span className="absolute right-1 text-[8px] text-cyan-500/60">R</span>
          <span className="absolute left-1 text-[8px] text-cyan-500/60">L</span>
          <span className="absolute bottom-1 text-[8px] text-cyan-500/60">AFT</span>

          {/* Player Aircraft Chevron in center pointing straight UP (Forward) */}
          <div className="relative w-3 h-3 flex items-center justify-center z-10">
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-cyan-300 drop-shadow-[0_0_4px_#38bdf8]" />
          </div>

          {/* Active Enemy Blips on Radar mapped to exact cockpit-relative coordinates */}
          {enemies.map((e) => {
            const radarRadius = 56; // max pixel radius
            const rx = (e.radarX ?? 0) * radarRadius;
            const ry = -(e.radarY ?? 0) * radarRadius; // Invert: positive radarY (ahead) is negative top in CSS!
            const isAce = e.type === 'ace';
            const isLocked = e.isLocked;

            return (
              <div
                key={e.id}
                className="absolute flex items-center justify-center"
                style={{
                  transform: `translate(${rx}px, ${ry}px)`,
                }}
              >
                {/* Locked target pulsing target circle */}
                {isLocked && (
                  <div className="absolute w-4 h-4 rounded-full border border-red-500 animate-ping" />
                )}
                {/* Blip marker */}
                <div
                  className={`rounded-full ${
                    isAce
                      ? 'w-2.5 h-2.5 bg-purple-400 shadow-[0_0_6px_#c084fc]'
                      : isLocked
                      ? 'w-2 h-2 bg-red-400 shadow-[0_0_6px_#ef4444]'
                      : 'w-1.5 h-1.5 bg-red-500'
                  }`}
                />
              </div>
            );
          })}

          {/* Range label */}
          <div className="absolute bottom-1 right-2 text-[8px] text-cyan-400/80">
            750M
          </div>
        </div>
      </div>

      {/* 5. Right HUD Aircraft Status & Defense: Hull, Shield & Flares */}
      <div className="absolute right-4 top-20 flex flex-col items-end space-y-2 pointer-events-none">
        {/* Hull Health Bar */}
        <div className="bg-black/60 border border-cyan-500/40 p-2 rounded text-xs w-36 space-y-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-1 text-[10px] text-red-400">
              <Heart className="w-3 h-3 fill-red-500 text-red-500" />
              <span>HULL</span>
            </span>
            <span className="font-bold text-red-400">{Math.round(stats.health)}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                stats.health > 40 ? 'bg-emerald-400' : 'bg-red-500'
              }`}
              style={{ width: `${Math.max(0, stats.health)}%` }}
            />
          </div>

          {/* Energy Shield Bar */}
          <div className="flex items-center justify-between pt-0.5">
            <span className="flex items-center space-x-1 text-[10px] text-cyan-300">
              <Shield className="w-3 h-3 text-cyan-400" />
              <span>SHIELD</span>
            </span>
            <span className="font-bold text-cyan-300">{Math.round(stats.shield)}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-150"
              style={{ width: `${Math.max(0, stats.shield)}%` }}
            />
          </div>
        </div>

        {/* Countermeasures (Flares) Status Display */}
        <div className="bg-black/60 border border-amber-500/40 p-2 rounded text-xs w-36">
          <div className="flex justify-between items-center text-[10px] text-amber-300">
            <span>FLARES READY</span>
            <span className="text-sm font-black text-amber-400">
              {stats.overdriveTimer > 0 ? '∞' : ammo.flares}
            </span>
          </div>
          <div className="flex space-x-1 mt-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-xs ${
                  i < ammo.flares || stats.overdriveTimer > 0 ? 'bg-amber-400' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Active Weapon Ammo Counter */}
        <div className="bg-black/60 border border-cyan-500/40 p-2 rounded text-xs w-36">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
            ARMAMENT: <span className="text-cyan-300 font-bold">{stats.activeWeapon.toUpperCase()}</span>
          </div>
          <div className="text-base font-black text-cyan-300 mt-0.5">
            {stats.overdriveTimer > 0 ? (
              <span className="text-purple-300">UNLIMITED</span>
            ) : stats.activeWeapon === 'bullet' ? (
              `${ammo.bullets} / ${ammo.maxBullets}`
            ) : stats.activeWeapon === 'rocket' ? (
              `${ammo.rockets} / ${ammo.maxRockets}`
            ) : (
              `${ammo.missiles} / ${ammo.maxMissiles}`
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
