import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GameCanvas } from './game/GameCanvas';
import { FlightEngine } from './game/flightEngine';
import { HUD } from './components/HUD';
import { MobileControls } from './components/MobileControls';
import { BriefingModal } from './components/BriefingModal';
import { GameOverModal } from './components/GameOverModal';
import { WaveBanner } from './components/WaveBanner';
import { soundManager } from './audio/soundManager';
import { AmmoState, EnemyAircraft, GameStatus, PlayerStats, WeaponType } from './types/game';
import { Volume2, VolumeX, HelpCircle, ShieldAlert, Crosshair, Pause, Play } from 'lucide-react';

export default function App() {
  const engineRef = useRef<FlightEngine | null>(null);

  // Game UI State
  const [gameStatus, setGameStatus] = useState<GameStatus>('menu');
  const [isMuted, setIsMuted] = useState(false);
  const [invertPitch, setInvertPitch] = useState(true);
  const [wave, setWave] = useState(1);

  // Player live stats
  const [stats, setStats] = useState<PlayerStats>({
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
  });

  const [ammo, setAmmo] = useState<AmmoState>({
    bullets: 500,
    maxBullets: 800,
    rockets: 16,
    maxRockets: 24,
    missiles: 6,
    maxMissiles: 10,
    flares: 6,
    maxFlares: 10,
  });

  const [isIncomingMissile, setIsIncomingMissile] = useState(false);
  const [enemies, setEnemies] = useState<EnemyAircraft[]>([]);

  // Start / restart game
  const handleStartGame = useCallback(() => {
    soundManager.init();
    if (engineRef.current) {
      engineRef.current.invertPitch = invertPitch;
      engineRef.current.onGameOver = (finalScore, finalKills) => {
        setGameStatus('gameover');
      };
      engineRef.current.onWaveComplete = (nextWave) => {
        setWave(nextWave);
      };
      engineRef.current.startNewGame();
    }
    setWave(1);
    setGameStatus('playing');
  }, [invertPitch]);

  const handleStatsUpdate = useCallback(
    (newStats: PlayerStats, newAmmo: AmmoState, incomingWarning: boolean) => {
      setStats(newStats);
      setAmmo(newAmmo);
      setIsIncomingMissile(incomingWarning);
    },
    []
  );

  const handleEnemiesUpdate = useCallback((newEnemies: EnemyAircraft[]) => {
    setEnemies(newEnemies);
  }, []);

  // Controls Handlers
  const handleJoystickMove = useCallback((pitch: number, roll: number) => {
    if (engineRef.current) {
      engineRef.current.joystickPitch = pitch;
      engineRef.current.joystickRoll = roll;
    }
  }, []);

  const handleFireChange = useCallback((isFiring: boolean) => {
    if (engineRef.current) {
      engineRef.current.isFiring = isFiring;
    }
  }, []);

  const handleDeployFlares = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.deployFlares();
    }
  }, []);

  const handleSelectWeapon = useCallback((weapon: WeaponType) => {
    if (engineRef.current) {
      engineRef.current.setWeapon(weapon);
      setStats((prev) => ({ ...prev, activeWeapon: weapon }));
    }
  }, []);

  const handleToggleBoost = useCallback((isBoosting: boolean) => {
    if (engineRef.current) {
      engineRef.current.setBoosting(isBoosting);
    }
  }, []);

  const handleToggleInvertPitch = useCallback(() => {
    setInvertPitch((prev) => {
      const next = !prev;
      if (engineRef.current) {
        engineRef.current.invertPitch = next;
      }
      return next;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundManager.setMuted(next);
      return next;
    });
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none touch-none">
      {/* 3D Flight Simulation Canvas */}
      <GameCanvas
        engineRef={engineRef}
        onStatsUpdate={handleStatsUpdate}
        onEnemiesUpdate={handleEnemiesUpdate}
      />

      {/* Cockpit HUD Overlay when playing */}
      {gameStatus === 'playing' && (
        <>
          <HUD
            stats={stats}
            ammo={ammo}
            enemies={enemies}
            isIncomingMissile={isIncomingMissile}
            onDeployFlares={handleDeployFlares}
          />

          <WaveBanner wave={wave} />

          {/* Mobile Touch & Desktop Key Controls */}
          <MobileControls
            onJoystickMove={handleJoystickMove}
            onFireChange={handleFireChange}
            onDeployFlares={handleDeployFlares}
            onSelectWeapon={handleSelectWeapon}
            activeWeapon={stats.activeWeapon}
            flareCount={ammo.flares}
            bulletCount={ammo.bullets}
            rocketCount={ammo.rockets}
            missileCount={ammo.missiles}
            isOverdrive={stats.overdriveTimer > 0}
            onToggleBoost={handleToggleBoost}
            invertPitch={invertPitch}
            onToggleInvertPitch={handleToggleInvertPitch}
          />
        </>
      )}

      {/* Top Header Buttons (Audio Mute, Help/Briefing, Wave Badge) */}
      <div className="absolute top-3 left-4 right-4 z-40 flex justify-between items-center pointer-events-none">
        <div className="flex items-center space-x-2 pointer-events-auto">
          <div className="px-3 py-1 bg-black/60 border border-cyan-500/40 rounded text-cyan-300 font-mono text-xs font-bold flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>SKYFIRE ACE</span>
            <span className="text-slate-400">|</span>
            <span className="text-amber-400">WAVE {wave}</span>
          </div>

          <button
            onClick={() => setGameStatus('menu')}
            className="p-1.5 bg-black/60 hover:bg-slate-800 border border-cyan-500/40 rounded text-cyan-300 transition-colors"
            title="Mission Briefing & Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-2 pointer-events-auto">
          <button
            onClick={handleToggleMute}
            className="p-1.5 bg-black/60 hover:bg-slate-800 border border-cyan-500/40 rounded text-cyan-300 transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-300" />}
          </button>
        </div>
      </div>

      {/* Briefing Modal on initial load or help */}
      {gameStatus === 'menu' && (
        <BriefingModal onStart={handleStartGame} />
      )}

      {/* Game Over Modal */}
      {gameStatus === 'gameover' && (
        <GameOverModal
          score={stats.score}
          kills={stats.kills}
          wave={wave}
          onRestart={handleStartGame}
        />
      )}
    </div>
  );
}
