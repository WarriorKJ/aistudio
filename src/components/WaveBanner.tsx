import React, { useEffect, useState } from 'react';

interface WaveBannerProps {
  wave: number;
}

export const WaveBanner: React.FC<WaveBannerProps> = ({ wave }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, 3200);
    return () => clearTimeout(timer);
  }, [wave]);

  if (!visible) return null;

  let waveTitle = 'SCOUT FORMATION';
  let waveSub = 'Light combat aircraft approaching. Practice crosshair alignment.';

  if (wave === 2) {
    waveTitle = 'STRIKE WING SQUADRON';
    waveSub = 'Heavy fighters inbound with rocket pods. Watch your flanks!';
  } else if (wave === 3) {
    waveTitle = 'HOMING MISSILE THREAT';
    waveSub = 'Hostiles equipped with heat-seeking missiles! Deploy flares to evade!';
  } else if (wave >= 4) {
    waveTitle = `SQUADRON ALPHA - WAVE ${wave}`;
    waveSub = 'Elite enemy aces detected in combat sector! Heavy resistance expected!';
  }

  return (
    <div className="absolute top-12 inset-x-0 flex justify-center pointer-events-none z-40 transition-all duration-300">
      <div className="px-6 py-2.5 bg-black/80 border-y-2 border-cyan-400 text-center font-mono shadow-[0_0_20px_rgba(6,182,212,0.5)]">
        <div className="text-sm md:text-base font-black text-cyan-300 tracking-widest">
          ⚔️ WAVE {wave} : {waveTitle}
        </div>
        <div className="text-[11px] text-slate-300 mt-0.5 tracking-wider">
          {waveSub}
        </div>
      </div>
    </div>
  );
};
