import React, { useEffect, useRef, useState } from 'react';
import { WeaponType } from '../types/game';
import { Flame, ShieldAlert, Crosshair, Rocket, Target, Zap } from 'lucide-react';

interface MobileControlsProps {
  onJoystickMove: (pitch: number, roll: number) => void;
  onFireChange: (isFiring: boolean) => void;
  onDeployFlares: () => void;
  onSelectWeapon: (weapon: WeaponType) => void;
  activeWeapon: WeaponType;
  flareCount: number;
  bulletCount: number;
  rocketCount: number;
  missileCount: number;
  isOverdrive: boolean;
  onToggleBoost: (isBoosting: boolean) => void;
  invertPitch: boolean;
  onToggleInvertPitch: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onJoystickMove,
  onFireChange,
  onDeployFlares,
  onSelectWeapon,
  activeWeapon,
  flareCount,
  bulletCount,
  rocketCount,
  missileCount,
  isOverdrive,
  onToggleBoost,
  invertPitch,
  onToggleInvertPitch,
}) => {
  // Joystick Touch Tracking
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const activeTouchId = useRef<number | null>(null);

  // Handle Joystick Touch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    activeTouchId.current = touch.identifier;
    setIsDragging(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchId.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId.current) {
        activeTouchId.current = null;
        setIsDragging(false);
        setKnobPos({ x: 0, y: 0 });
        onJoystickMove(0, 0);
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = rect.width / 2 - 8;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    setKnobPos({ x: dx, y: dy });

    // Normalized outputs: -1 to 1
    const roll = dx / maxRadius;
    const pitch = dy / maxRadius;
    onJoystickMove(pitch, roll);
  };

  // Keyboard desktop fallback support
  useEffect(() => {
    const keysPressed = new Set<string>();

    const updateFromKeys = () => {
      let pitch = 0;
      let roll = 0;
      if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) pitch -= 1;
      if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) pitch += 1;
      if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) roll -= 1;
      if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) roll += 1;

      onJoystickMove(pitch, roll);
      setKnobPos({ x: roll * 35, y: pitch * 35 });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      keysPressed.add(e.code);

      if (e.code === 'Space') {
        onFireChange(true);
      } else if (e.code === 'KeyF') {
        onDeployFlares();
      } else if (e.code === 'Digit1') {
        onSelectWeapon('bullet');
      } else if (e.code === 'Digit2') {
        onSelectWeapon('rocket');
      } else if (e.code === 'Digit3') {
        onSelectWeapon('missile');
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        onToggleBoost(true);
      } else if (e.code === 'KeyI') {
        onToggleInvertPitch();
      }

      updateFromKeys();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
      if (e.code === 'Space') {
        onFireChange(false);
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        onToggleBoost(false);
      }
      updateFromKeys();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onJoystickMove, onFireChange, onDeployFlares, onSelectWeapon, onToggleBoost, onToggleInvertPitch]);

  return (
    <div className="absolute inset-x-0 bottom-0 pointer-events-none select-none z-30 flex justify-between items-end p-4 pb-6 md:p-8">
      {/* LEFT CLUSTER: Flight Joystick & Invert Toggle */}
      <div className="flex flex-col items-center space-y-2 pointer-events-auto">
        <button
          onClick={onToggleInvertPitch}
          className="text-[10px] px-2.5 py-1 bg-black/60 hover:bg-black/80 border border-cyan-500/40 rounded text-cyan-300 font-mono tracking-wider active:scale-95 transition-transform"
        >
          PITCH: {invertPitch ? 'FLIGHT STICK (PULL UP)' : 'NORMAL'}
        </button>

        {/* Virtual Touch Joystick */}
        <div
          ref={joystickBaseRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="relative w-36 h-36 md:w-40 md:h-40 rounded-full bg-slate-950/60 border-2 border-cyan-500/50 flex items-center justify-center touch-none shadow-[0_0_20px_rgba(6,182,212,0.25)]"
        >
          {/* Inner direction crosshairs */}
          <div className="absolute w-full h-[1px] bg-cyan-500/30" />
          <div className="absolute h-full w-[1px] bg-cyan-500/30" />
          <div className="absolute w-24 h-24 rounded-full border border-dashed border-cyan-500/25" />

          {/* Draggable Knob */}
          <div
            className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-2 transition-transform duration-75 flex items-center justify-center ${
              isDragging
                ? 'bg-cyan-500/50 border-cyan-300 scale-105 shadow-[0_0_15px_#22d3ee]'
                : 'bg-slate-800/80 border-cyan-400'
            }`}
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          >
            <div className="w-4 h-4 rounded-full bg-cyan-300" />
          </div>
        </div>

        {/* Boost / Afterburner button */}
        <button
          onTouchStart={() => onToggleBoost(true)}
          onTouchEnd={() => onToggleBoost(false)}
          onMouseDown={() => onToggleBoost(true)}
          onMouseUp={() => onToggleBoost(false)}
          className="w-36 md:w-40 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border border-amber-400 text-black font-black text-xs rounded tracking-widest uppercase flex items-center justify-center space-x-1 active:scale-95 transition-transform"
        >
          <Flame className="w-4 h-4" />
          <span>AFTERBURNER</span>
        </button>
      </div>

      {/* RIGHT CLUSTER: Weapon Selector, Flare Button (Above Shoot), and Primary Fire Button */}
      <div className="flex flex-col items-end space-y-3 pointer-events-auto">
        {/* Weapon Quick-Selector Pills */}
        <div className="flex items-center space-x-1.5 bg-black/70 p-1 rounded-lg border border-cyan-500/40 font-mono">
          {/* 1. Vulcan Cannon (Bullets) */}
          <button
            onClick={() => onSelectWeapon('bullet')}
            className={`px-3 py-1.5 rounded flex items-center space-x-1 text-xs transition-all ${
              activeWeapon === 'bullet'
                ? 'bg-cyan-500 text-black font-bold shadow-[0_0_10px_#06b6d4]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>GUN</span>
            <span className="text-[10px] opacity-75">
              ({isOverdrive ? '∞' : bulletCount})
            </span>
          </button>

          {/* 2. Heavy Rockets */}
          <button
            onClick={() => onSelectWeapon('rocket')}
            className={`px-3 py-1.5 rounded flex items-center space-x-1 text-xs transition-all ${
              activeWeapon === 'rocket'
                ? 'bg-amber-500 text-black font-bold shadow-[0_0_10px_#f59e0b]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>RCKT</span>
            <span className="text-[10px] opacity-75">
              ({isOverdrive ? '∞' : rocketCount})
            </span>
          </button>

          {/* 3. Heat-Seeking Missiles */}
          <button
            onClick={() => onSelectWeapon('missile')}
            className={`px-3 py-1.5 rounded flex items-center space-x-1 text-xs transition-all ${
              activeWeapon === 'missile'
                ? 'bg-red-500 text-white font-bold shadow-[0_0_10px_#ef4444]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>MSL</span>
            <span className="text-[10px] opacity-75">
              ({isOverdrive ? '∞' : missileCount})
            </span>
          </button>
        </div>

        {/* 
          Countermeasures (FLARE BUTTON): 
          Requirement: "the flare button is on the right as well above the shoot button"
        */}
        <button
          onClick={onDeployFlares}
          className="relative w-28 md:w-32 py-3 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 border-2 border-amber-300 rounded-lg text-slate-950 font-black text-xs md:text-sm tracking-wider uppercase flex items-center justify-center space-x-1.5 shadow-[0_0_18px_rgba(245,158,11,0.5)] active:scale-95 transition-transform"
        >
          <ShieldAlert className="w-5 h-5" />
          <span>FLARES</span>
          <span className="bg-black text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
            {isOverdrive ? '∞' : flareCount}
          </span>
        </button>

        {/* 
          PRIMARY FIRE / SHOOT BUTTON:
          Requirement: "there is a fire/shoot button on the right."
        */}
        <button
          onTouchStart={() => onFireChange(true)}
          onTouchEnd={() => onFireChange(false)}
          onMouseDown={() => onFireChange(true)}
          onMouseUp={() => onFireChange(false)}
          className={`w-28 h-24 md:w-32 md:h-28 rounded-2xl border-4 text-white font-black text-base md:text-lg tracking-widest uppercase flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all ${
            activeWeapon === 'missile'
              ? 'bg-gradient-to-b from-red-600 to-red-800 border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.6)]'
              : activeWeapon === 'rocket'
              ? 'bg-gradient-to-b from-amber-600 to-amber-800 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)]'
              : 'bg-gradient-to-b from-red-500 to-red-700 border-red-300 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
          }`}
        >
          <Crosshair className="w-7 h-7 mb-0.5" />
          <span>FIRE</span>
          <span className="text-[10px] tracking-normal opacity-80">
            {activeWeapon.toUpperCase()}
          </span>
        </button>
      </div>
    </div>
  );
};
