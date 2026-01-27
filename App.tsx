
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, PlayerStats, MatchResult, GameMode, SKINS } from './types';
import GameEngine from './components/GameEngine';
import Shop from './components/Shop';
import Settings from './components/Settings';
import { getCoachIntro, getMatchAnalysis } from './services/geminiService';
import { sound } from './components/SoundManager';

const DEFAULT_STATS: PlayerStats = {
  name: 'USER_' + Math.floor(Math.random() * 9999),
  power: 80,
  speed: 80,
  accuracy: 75,
  currency: 0,
  upgrades: { powerLevel: 0, speedLevel: 0 },
  activeSkin: 'default',
  ownedSkins: ['default']
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [gameMode, setGameMode] = useState<GameMode>('DOUBLE');
  const [bestScore, setBestScore] = useState<number>(0);
  const [playerStats, setPlayerStats] = useState<PlayerStats>(DEFAULT_STATS);
  const [coachMessage, setCoachMessage] = useState<string>('');
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasCheckedKey, setHasCheckedKey] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  const deferredPrompt = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) { try { await aistudio.hasSelectedApiKey(); } catch (e) {} }
      setHasCheckedKey(true);

      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    (window.navigator as any).standalone === true;
      setIsStandalone(!!isPWA);

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt.current = e;
        if (!isPWA) setShowInstallPrompt(true);
      });

      try {
        const savedBest = localStorage.getItem('neon_smash_best');
        if (savedBest) setBestScore(parseInt(savedBest) || 0);

        const savedStats = localStorage.getItem('neon_smash_stats');
        if (savedStats) {
          const parsed = JSON.parse(savedStats);
          setPlayerStats({ ...DEFAULT_STATS, ...parsed });
        } else {
          setTimeout(() => {
            setGameMode('TUTORIAL');
            setGameState(GameState.PLAYING);
          }, 1500);
        }
      } catch (err) {}
    };
    init();
  }, [isStandalone]);

  const updateStats = (newStats: PlayerStats) => {
    setPlayerStats(newStats);
    try {
      localStorage.setItem('neon_smash_stats', JSON.stringify(newStats));
    } catch (e) {}
  };

  useEffect(() => {
    if ([GameState.MENU, GameState.MODE_SELECT, GameState.SHOP, GameState.SETTINGS].includes(gameState)) {
      sound.resume();
      sound.startBGM('MENU');
      sound.setMuffled(false);
    } else {
      sound.setMuffled(true);
    }
  }, [gameState]);

  const selectMode = () => { sound.playHit(660, 'sine'); setGameState(GameState.MODE_SELECT); };
  
  const chooseMode = (mode: GameMode) => { 
    sound.playHit(550, 'sine'); 
    setGameMode(mode); 
    startCoachTalk(); 
  };

  const startCoachTalk = async () => {
    sound.resume();
    setIsLoading(true);
    setGameState(GameState.COACH_TALK);
    const msg = await getCoachIntro(playerStats, gameMode);
    setCoachMessage(msg);
    setIsLoading(false);
  };

  const startGame = () => { sound.playHit(1320, 'square'); setGameState(GameState.PLAYING); };

  const handleGameOver = useCallback(async (result: any) => {
    if (result.mode === 'TUTORIAL') {
      const bonus = 500;
      updateStats({ ...playerStats, currency: playerStats.currency + bonus });
      setGameState(GameState.MENU);
      return;
    }

    const earned = Math.floor(result.playerScore * 0.1);
    const finalResult: MatchResult = { ...result, earnedCurrency: earned, timestamp: new Date().toISOString() };

    if (finalResult.playerScore > bestScore) {
      setBestScore(finalResult.playerScore);
      localStorage.setItem('neon_smash_best', finalResult.playerScore.toString());
    }

    const newCurrency = playerStats.currency + earned;
    updateStats({ ...playerStats, currency: newCurrency });

    setMatchResult(finalResult);
    setGameState(GameState.GAME_OVER);
    setIsLoading(true);

    const feedback = await getMatchAnalysis(finalResult, playerStats);
    setAnalysis(feedback);
    setIsLoading(false);
  }, [playerStats, bestScore]);

  const resetToMenu = () => { sound.playHit(220, 'sine'); setGameState(GameState.MENU); };

  if (!hasCheckedKey) return null;

  return (
    <div className="h-screen w-full bg-[#010409] text-white flex flex-col font-sans overflow-hidden select-none" onClick={() => sound.resume()}>
      <div className="scanlines"></div>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="cyber-grid"></div>
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-emerald-500/10 blur-[150px] rounded-full"></div>
      </div>

      {gameState === GameState.MENU && (
        <div className="flex-1 flex flex-col items-center justify-between py-16 px-8 z-10 text-center relative safe-pt safe-pb">
          <div className="w-full flex justify-between px-2 pt-4">
            <div className="text-left">
               <div className="text-[10px] font-orbitron text-emerald-400/60 uppercase tracking-tighter">NEURAL_ID</div>
               <div className="text-[12px] font-orbitron font-black text-white">{playerStats.name}</div>
            </div>
            
            <div className="text-right">
              <span className="text-[9px] font-orbitron text-slate-500 uppercase">CREDITS</span>
              <div className="font-orbitron font-black text-lg text-emerald-400">
                {playerStats.currency.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <div className="mb-4">
              <div className="px-5 py-1 glass-card rounded-full border border-emerald-500/20 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                <span className="text-[9px] font-orbitron text-emerald-400 tracking-widest font-black uppercase">BEST_RECORD: {bestScore}</span>
              </div>
            </div>
            <h1 className="text-[52px] font-orbitron font-black italic leading-[0.8] tracking-tighter mb-4">
              <span className="block text-white">NEON</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500">SMASH</span>
            </h1>
          </div>

          <div className="w-full max-w-xs space-y-4 pb-8">
            {showInstallPrompt && !isStandalone && (
              <button onClick={() => { deferredPrompt.current?.prompt(); }} className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center gap-3 active:scale-95 animate-pulse">
                <span className="text-[11px] font-orbitron font-black text-emerald-400 uppercase tracking-widest">INSTALL APP</span>
              </button>
            )}

            <button onClick={selectMode} className="w-full group relative rounded-2xl p-[2px] active:scale-95 transition-transform duration-200">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500 rounded-2xl animate-[gradient_3s_linear_infinite]"></div>
              <div className="relative bg-[#010409] rounded-[14px] py-6 flex flex-col items-center">
                <span className="text-2xl font-orbitron font-black tracking-widest text-white">ENTER ARENA</span>
              </div>
            </button>
            
            <div className="flex gap-3">
              <button onClick={() => setGameState(GameState.SHOP)} className="flex-1 py-5 glass-card rounded-2xl border border-emerald-500/20 active:scale-95 transition-all">
                 <span className="text-xs font-orbitron font-black text-emerald-400 uppercase tracking-widest">UPGRADES</span>
              </button>
              <button onClick={() => setGameState(GameState.SETTINGS)} className="w-20 py-5 glass-card rounded-2xl border border-white/10 active:scale-95 flex items-center justify-center">
                 <span className="text-xl">⚙️</span>
              </button>
            </div>
            
            <button onClick={() => { setGameMode('TUTORIAL'); setGameState(GameState.PLAYING); }} className="w-full py-3 text-[10px] font-orbitron text-slate-500 uppercase tracking-[0.3em] font-black opacity-50 hover:opacity-100 transition-opacity">REWATCH TUTORIAL</button>
          </div>
        </div>
      )}

      {gameState === GameState.SHOP && <Shop stats={playerStats} onUpdateStats={updateStats} onBack={resetToMenu} />}
      {gameState === GameState.SETTINGS && <Settings onBack={resetToMenu} />}
      
      {gameState === GameState.MODE_SELECT && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 space-y-6 safe-pt safe-pb">
          <button onClick={resetToMenu} className="fixed top-[calc(env(safe-area-inset-top)+1rem)] left-8 w-12 h-12 glass-card rounded-2xl flex items-center justify-center border border-white/10 z-[60]">🏠</button>
          <h2 className="text-xs font-orbitron text-slate-500 tracking-[0.4em] uppercase mb-12 font-black">SELECT_MODE</h2>
          
          <button onClick={() => chooseMode('SINGLE')} className="w-full max-w-sm glass-card p-10 rounded-[40px] flex items-center gap-8 active:scale-95 group border-blue-500/10 transition-all">
            <div className="w-20 h-20 bg-blue-500/20 rounded-3xl flex items-center justify-center border border-blue-500/30 text-4xl shadow-[0_0_30px_rgba(59,130,246,0.2)]">☄️</div>
            <div className="text-left">
              <h3 className="text-2xl font-orbitron font-black text-white italic">STARFALL</h3>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">SURVIVAL WALL</p>
            </div>
          </button>
          
          <button onClick={() => chooseMode('DOUBLE')} className="w-full max-w-sm glass-card p-10 rounded-[40px] flex items-center gap-8 active:scale-95 group border-emerald-500/10 transition-all">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center border border-emerald-500/30 text-4xl shadow-[0_0_30px_rgba(16,185,129,0.2)]">🏟️</div>
            <div className="text-left">
              <h3 className="text-2xl font-orbitron font-black text-white italic">STADIUM</h3>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">AI_NEURAL_MATCH</p>
            </div>
          </button>
        </div>
      )}

      {gameState === GameState.COACH_TALK && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 safe-pt safe-pb">
          <div className="w-full max-w-md glass-card p-12 rounded-[56px] border-emerald-500/20 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
             <div className="text-[10px] font-orbitron text-emerald-400 font-black tracking-[0.5em] mb-4">TACTICAL BRIEFING by ACE</div>
             <p className="text-2xl font-black italic text-white leading-relaxed">
               {isLoading ? "SYNCING..." : `"${coachMessage}"`}
             </p>
          </div>
          <button onClick={startGame} disabled={isLoading} className="mt-16 w-64 py-6 bg-emerald-500 text-black font-orbitron font-black rounded-3xl active:scale-95 shadow-[0_0_50px_rgba(16,185,129,0.3)] transition-all">
            {isLoading ? 'LOADING...' : 'CONNECT'}
          </button>
        </div>
      )}

      {gameState === GameState.PLAYING && <GameEngine mode={gameMode} onGameOver={handleGameOver} onHome={resetToMenu} playerStats={playerStats} />}

      {gameState === GameState.GAME_OVER && matchResult && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 text-center animate-in fade-in duration-700 safe-pt safe-pb">
          <div className="text-emerald-400 font-orbitron text-xs tracking-[0.3em] uppercase mb-2 font-black">SESSION TERMINATED</div>
          <h2 className="text-4xl font-orbitron font-black italic text-white tracking-tighter uppercase">Match Result</h2>
          <div className="text-[80px] font-orbitron font-black text-white leading-none my-6 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            {matchResult.playerScore}
          </div>
          
          <div className="w-full max-w-sm glass-card p-8 rounded-[32px] border-emerald-500/10 mb-12">
            <div className="text-[9px] font-orbitron text-slate-500 font-black tracking-[0.3em] mb-2 uppercase text-left">Log Analysis report</div>
            <p className="text-base font-black italic text-slate-200 leading-relaxed text-left">
              {isLoading ? 'ANALYZING...' : analysis}
            </p>
          </div>
          
          <div className="flex gap-4 w-full max-w-sm">
            <button onClick={startCoachTalk} className="flex-[2] py-6 bg-emerald-500 text-black font-orbitron font-black rounded-2xl active:scale-95 shadow-xl transition-all uppercase">Retry</button>
            <button onClick={resetToMenu} className="flex-1 py-6 bg-white/5 text-white font-orbitron font-bold rounded-2xl border border-white/10 active:scale-95 transition-all uppercase">Quit</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
