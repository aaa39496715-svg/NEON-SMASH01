
import React, { useState } from 'react';
import { sound } from './SoundManager';

interface SettingsProps {
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [bgm, setBgm] = useState(sound.getBGMVolume());
  const [sfx, setSfx] = useState(sound.getSFXVolume());

  const handleBGMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setBgm(val);
    sound.setBGMVolume(val);
  };

  const handleSFXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSfx(val);
    sound.setSFXVolume(val);
    sound.playHit(440, 'sine');
  };

  return (
    <div className="flex-1 flex flex-col pt-24 pb-8 px-6 z-10 animate-in slide-in-from-bottom duration-500 overflow-hidden">
      <div className="w-full max-w-md flex flex-col h-full mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-3xl font-orbitron font-black italic text-white tracking-tighter uppercase">SYSTEM_CONFIG</h2>
        </div>

        <div className="flex-1 space-y-12 overflow-y-auto custom-scrollbar pr-1">
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <label className="text-xs font-orbitron text-emerald-400 tracking-[0.4em] uppercase font-black">BGM VOLUME</label>
              <span className="text-lg font-orbitron font-bold text-white">{Math.round(bgm * 100)}%</span>
            </div>
            <div className="relative group">
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={bgm} 
                onChange={handleBGMChange}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <label className="text-xs font-orbitron text-cyan-400 tracking-[0.4em] uppercase font-black">SFX VOLUME</label>
              <span className="text-lg font-orbitron font-bold text-white">{Math.round(sfx * 100)}%</span>
            </div>
            <div className="relative group">
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={sfx} 
                onChange={handleSFXChange}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
              />
            </div>
          </div>

          <div className="glass-card p-8 rounded-[32px] border-white/5 mt-12">
            <h3 className="text-[10px] font-orbitron text-slate-500 tracking-[0.3em] uppercase mb-4">SYSTEM INFO</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[10px] text-slate-400">VERSION</span>
                <span className="text-[10px] text-white font-orbitron">v1.0.0-CORE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-slate-400">ENGINE</span>
                <span className="text-[10px] text-white font-orbitron">NEURAL_TS_2.0</span>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={onBack} 
          className="mt-8 w-full py-5 bg-white/5 border border-white/10 text-white font-orbitron font-black text-xs rounded-2xl hover:bg-white/10 active:scale-95 transition-all uppercase tracking-widest"
        >
          BACK TO MENU
        </button>
      </div>
    </div>
  );
};

export default Settings;
