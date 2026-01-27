
import React from 'react';
import { PlayerStats, SKINS, Skin } from '../types';
import { sound } from './SoundManager';

interface ShopProps {
  stats: PlayerStats;
  onUpdateStats: (newStats: PlayerStats) => void;
  onBack: () => void;
}

const Shop: React.FC<ShopProps> = ({ stats, onUpdateStats, onBack }) => {

  const buySkin = (skin: Skin) => {
    if (stats.ownedSkins.includes(skin.id)) {
      onUpdateStats({ ...stats, activeSkin: skin.id });
      sound.playCollect();
      return;
    }
    if (stats.currency >= skin.price) {
      onUpdateStats({
        ...stats,
        currency: stats.currency - skin.price,
        ownedSkins: [...stats.ownedSkins, skin.id],
        activeSkin: skin.id
      });
      sound.playLevelUp();
    } else {
      sound.playHit(110, 'sawtooth');
    }
  };

  const upgradeStat = (type: 'power' | 'speed') => {
    const level = type === 'power' ? stats.upgrades.powerLevel : stats.upgrades.speedLevel;
    const cost = (level + 1) * 500;
    if (stats.currency >= cost && level < 10) {
      const newUpgrades = { ...stats.upgrades };
      if (type === 'power') newUpgrades.powerLevel++;
      else newUpgrades.speedLevel++;

      onUpdateStats({
        ...stats,
        currency: stats.currency - cost,
        upgrades: newUpgrades,
        power: stats.power + (type === 'power' ? 5 : 0),
        speed: stats.speed + (type === 'speed' ? 5 : 0)
      });
      sound.playLevelUp();
    } else {
      sound.playHit(110, 'sawtooth');
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-24 pb-8 px-6 z-10 animate-in slide-in-from-bottom duration-500 overflow-hidden">
      <div className="w-full max-w-md flex flex-col h-full mx-auto">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-orbitron font-black italic text-white tracking-tighter uppercase">NEURAL_SHOP</h2>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-orbitron text-emerald-400 tracking-widest uppercase mb-1">BALANCE</span>
            <div className="text-xl font-orbitron font-black text-white bg-emerald-500/10 px-4 py-1.5 rounded-xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              {stats.currency.toLocaleString()} <span className="text-xs text-emerald-400 ml-1">NC</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
          <section>
            <h3 className="text-[10px] font-orbitron text-slate-500 tracking-[0.4em] uppercase mb-4 px-2 font-black">Performance Upgrades</h3>
            <div className="grid grid-cols-1 gap-3">
              {(['power', 'speed'] as const).map(type => {
                const lvl = type === 'power' ? stats.upgrades.powerLevel : stats.upgrades.speedLevel;
                const cost = (lvl + 1) * 500;
                return (
                  <button 
                    key={type}
                    onClick={() => upgradeStat(type)}
                    className="glass-card p-5 rounded-3xl flex justify-between items-center group active:scale-[0.98] transition-all"
                  >
                    <div className="text-left">
                      <div className="text-xs font-orbitron font-black text-white uppercase">{type === 'power' ? 'PHYSICAL POWER' : 'NEURAL SPEED'}</div>
                      <div className="flex gap-1.5 mt-2">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className={`w-3 h-1.5 rounded-full ${i < lvl ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-white/5'}`}></div>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      {lvl < 10 ? (
                        <div className={`px-4 py-2 rounded-xl font-orbitron font-black text-[11px] ${stats.currency >= cost ? 'bg-emerald-500 text-black' : 'bg-white/5 text-slate-500'}`}>
                          {cost} NC
                        </div>
                      ) : (
                        <div className="text-[11px] font-orbitron font-black text-emerald-400 uppercase">MAXED</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-orbitron text-slate-500 tracking-[0.4em] uppercase mb-4 px-2 font-black">Visual Signatures</h3>
            <div className="grid grid-cols-1 gap-3">
              {SKINS.map(skin => {
                const isOwned = stats.ownedSkins.includes(skin.id);
                const isActive = stats.activeSkin === skin.id;
                return (
                  <button 
                    key={skin.id}
                    onClick={() => buySkin(skin)}
                    className={`glass-card p-5 rounded-3xl flex items-center gap-5 active:scale-[0.98] transition-all border-l-4 ${isActive ? 'border-l-emerald-400 bg-white/5 shadow-xl' : 'border-l-transparent'}`}
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: `${skin.color}15`, border: `1px solid ${skin.color}30` }}>
                       <div className="w-9 h-2.5 rounded-full" style={{ backgroundColor: skin.color, boxShadow: `0 0 20px ${skin.color}` }}></div>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-xs font-orbitron font-black text-white uppercase tracking-widest">{skin.name}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{skin.description}</div>
                    </div>
                    <div className="text-right">
                      {isActive ? (
                        <span className="text-[10px] font-orbitron font-black text-emerald-400 uppercase">ACTIVE</span>
                      ) : isOwned ? (
                        <span className="text-[10px] font-orbitron font-black text-slate-400 uppercase">SELECT</span>
                      ) : (
                        <div className={`px-4 py-2 rounded-xl font-orbitron font-black text-[11px] ${stats.currency >= skin.price ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-500'}`}>
                          {skin.price} NC
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
        
        <button onClick={onBack} className="mt-8 w-full py-5 bg-white/5 border border-white/10 text-white font-orbitron font-black text-xs rounded-2xl hover:bg-white/10 active:scale-95 transition-all uppercase tracking-[0.2em]">RETURN TO HQ</button>
      </div>
    </div>
  );
};

export default Shop;
