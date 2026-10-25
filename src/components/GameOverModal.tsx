import React from 'react';
import { RotateCcw, Trophy, Skull, Crosshair } from 'lucide-react';

interface GameOverModalProps {
  score: number;
  kills: number;
  wave: number;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  kills,
  wave,
  onRestart,
}) => {
  // Store highscore in localStorage
  const savedHigh = parseInt(localStorage.getItem('skyfire_highscore') || '0', 10);
  const isNewHigh = score > savedHigh;
  if (isNewHigh) {
    localStorage.setItem('skyfire_highscore', score.toString());
  }
  const displayHigh = Math.max(score, savedHigh);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none font-mono">
      <div className="max-w-md w-full bg-slate-900 border-2 border-red-500/60 rounded-xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.4)] text-slate-100 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-950/80 border-2 border-red-500 flex items-center justify-center text-red-400 mb-3">
          <Skull className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-red-500 tracking-wider">
          AIRCRAFT DESTROYED
        </h2>
        <p className="text-xs text-slate-400 tracking-widest uppercase mt-0.5">
          Combat Mission Terminated
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 my-6">
          <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Score</div>
            <div className="text-lg font-black text-amber-400 mt-1">{score}</div>
          </div>
          <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Kills</div>
            <div className="text-lg font-black text-cyan-400 mt-1">{kills}</div>
          </div>
          <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Wave</div>
            <div className="text-lg font-black text-purple-400 mt-1">{wave}</div>
          </div>
        </div>

        {/* High Score */}
        <div className="flex items-center justify-center space-x-2 text-xs text-amber-300 mb-6 bg-amber-950/30 py-2 border border-amber-500/30 rounded">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>
            {isNewHigh ? 'NEW RECORD HIGH SCORE: ' : 'BEST HIGH SCORE: '}
            <strong className="text-amber-200">{displayHigh}</strong>
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={onRestart}
          className="w-full py-3.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm tracking-widest uppercase rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.5)] flex items-center justify-center space-x-2 active:scale-98 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>SCRAMBLE NEXT JET</span>
        </button>
      </div>
    </div>
  );
};
