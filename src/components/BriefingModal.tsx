import React from 'react';
import { Plane, ShieldAlert, Crosshair, Target, Rocket, Zap, Play, Volume2 } from 'lucide-react';

interface BriefingModalProps {
  onStart: () => void;
}

export const BriefingModal: React.FC<BriefingModalProps> = ({ onStart }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-none font-mono">
      <div className="relative max-w-xl w-full bg-slate-900 border-2 border-cyan-500/60 rounded-xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.3)] text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center space-x-3 border-b border-cyan-500/30 pb-4">
          <div className="p-2.5 bg-cyan-950 border border-cyan-400 rounded-lg text-cyan-300">
            <Plane className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-cyan-300 tracking-wider">
              SKYFIRE ACE
            </h1>
            <p className="text-xs text-slate-400 tracking-widest uppercase">
              First-Person Cockpit Aerial Combat Simulator
            </p>
          </div>
        </div>

        {/* Mission Objectives */}
        <div className="mt-4 space-y-4 text-xs md:text-sm">
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <div className="text-cyan-400 font-bold uppercase tracking-wider mb-1">
              MISSION BRIEFING:
            </div>
            <p className="text-slate-300 leading-relaxed">
              Hostile squadrons are entering your airspace in progressive waves. Pilot your jet from the first-person cockpit, intercept enemy fighters, and manage limited ammunition and defensive countermeasure flares.
            </p>
          </div>

          {/* Armament & Tactical Flares */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="bg-slate-950/60 p-2.5 rounded border border-cyan-500/30">
              <div className="flex items-center space-x-1.5 text-cyan-300 font-bold mb-1">
                <Crosshair className="w-4 h-4" />
                <span>GUNS & ROCKETS</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Bullets & heavy rockets shoot straight. Align with the cockpit bore crosshair to strike targets.
              </p>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded border border-red-500/30">
              <div className="flex items-center space-x-1.5 text-red-400 font-bold mb-1">
                <Target className="w-4 h-4" />
                <span>HOMING MISSILES</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Auto-tracks locked enemy planes with proportional navigation. Devastating direct hits!
              </p>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded border border-amber-500/30">
              <div className="flex items-center space-x-1.5 text-amber-400 font-bold mb-1">
                <ShieldAlert className="w-4 h-4" />
                <span>DEFENSIVE FLARES</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                When enemies fire missiles at you (RWR Alarm!), deploy flares (above FIRE button) to decoy them away!
              </p>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded border border-purple-500/30">
              <div className="flex items-center space-x-1.5 text-purple-400 font-bold mb-1">
                <Zap className="w-4 h-4" />
                <span>AMMO & POWERUPS</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Collect floating pods: Restores ammo, shields, hull repairs, and 10s Overdrive (unlimited ammo)!
              </p>
            </div>
          </div>

          {/* Controls Summary */}
          <div className="bg-black/40 p-3 rounded border border-slate-800 text-[11px] text-slate-300 space-y-1">
            <div className="text-cyan-400 font-bold">CONTROLS:</div>
            <div>• <span className="text-white font-bold">Mobile:</span> Left Virtual Stick (Pitch & Roll), Right FIRE (Shoot), Right FLARES (above Fire), Afterburner.</div>
            <div>• <span className="text-white font-bold">Keyboard:</span> W/S (Pitch), A/D (Roll), Space (Shoot), F (Flares), 1/2/3 (Weapons), Shift (Afterburner).</div>
          </div>
        </div>

        {/* Start Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onStart}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-sm tracking-widest uppercase rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.6)] flex items-center justify-center space-x-2 active:scale-98 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>LAUNCH SORTIE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
