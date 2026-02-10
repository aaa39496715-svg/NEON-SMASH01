

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Heart, Zap, Trophy, Rocket, Shield, Play, ChevronLeft, ChevronRight, ChevronUp, Car, ShoppingBag, Globe, Eye, Box, X, Zap as ZapIcon, Flame, Gift, Sparkles, PlusCircle, Wrench, ShieldCheck, Crown, Clapperboard, Bike, Star, Gem } from 'lucide-react';
import { useStore } from '../../store';
import { GameStatus, GEMINI_COLORS, ShopItem, RUN_SPEED_BASE, Locale } from '../../types';
import { translations } from '../../locales';
import { audio } from '../System/Audio';
import { Tutorial } from './Tutorial';

const getShopItems = (t: (key: string) => string): ShopItem[] => [
    { id: 'CAR_NEON', name: 'STREAK', description: 'Default high-performance streak.', cost: 0, icon: Car, category: 'CAR' },
    { id: 'CAR_SHADOW', name: t('item_car_shadow_name'), description: t('item_car_shadow_desc'), cost: 4000, icon: Eye, category: 'CAR' },
    { id: 'CAR_BIKE', name: t('item_car_bike_name'), description: t('item_car_bike_desc'), cost: 5500, icon: Bike, category: 'CAR' },
    { id: 'CAR_RETRO', name: t('item_car_retro_name'), description: t('item_car_retro_desc'), cost: 6500, icon: Trophy, category: 'CAR' },
    { id: 'CAR_TRUCK', name: t('item_car_truck_name'), description: t('item_car_truck_desc'), cost: 2500, icon: Box, category: 'CAR' },
    { id: 'CAR_MUSCLE', name: t('item_car_muscle_name'), description: t('item_car_muscle_desc'), cost: 3500, icon: Flame, category: 'CAR' },
    { id: 'CAR_BLADE', name: t('item_car_blade_name'), description: t('item_car_blade_desc'), cost: 5000, icon: ZapIcon, category: 'CAR' },
    { id: 'CAR_AERO', name: t('item_car_aero_name'), description: t('item_car_aero_desc'), cost: 7000, icon: Rocket, category: 'CAR' },
    { id: 'CAR_VOID', name: t('item_car_void_name'), description: t('item_car_void_desc'), cost: 9000, icon: Globe, category: 'CAR' }
];

const LanguageToggle: React.FC = () => {
    const { locale, setLocale } = useStore();
    return (
        <button onClick={(e) => { e.stopPropagation(); setLocale(locale === 'ko' ? 'en' : 'ko'); }}
            className="pointer-events-auto flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md hover:bg-white/10 transition-all text-white/80 hover:text-white">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold font-cyber tracking-widest">{locale.toUpperCase()}</span>
        </button>
    );
};

const ShopScreen: React.FC = () => {
    const { locale, score, buyItem, closeShop, ownedCars, equippedCarId, equipCar, setPreviewCarId, previewCarId, watchAd, isPremium, buyPremium } = useStore();
    const t = useCallback((key: string) => translations[locale][key as keyof typeof translations['en']] || key, [locale]);
    
    const items = useMemo(() => getShopItems(t), [t]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        if (previewCarId && itemRefs.current[previewCarId] && scrollRef.current) {
            const container = scrollRef.current;
            const element = itemRefs.current[previewCarId];
            if (element) {
                const scrollLeft = element.offsetLeft - (container.clientWidth / 2) + (element.clientWidth / 2);
                container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        }
    }, [previewCarId, items]);

    const handleSelectCar = (id: string) => {
        if (previewCarId === id) return;
        audio.init();
        setPreviewCarId(id);
    };

    return (
        <div className="absolute inset-0 z-[100] text-white pointer-events-none flex flex-col overflow-hidden bg-black/10">
             
             {/* 상단 자동차 캐릭터 프리뷰 존 (60%) */}
             <div className="h-[60%] relative flex flex-col items-center justify-start pt-12">
                 <div className="bg-black/40 border border-cyan-500/20 backdrop-blur-md px-6 py-2 rounded-full flex items-center space-x-3 shadow-2xl animate-in fade-in slide-in-from-top-4">
                    <Box className="w-4 h-4 text-cyan-400 animate-spin-slow" />
                    <span className="text-[11px] font-cyber font-black tracking-[0.5em] text-cyan-400 uppercase">360° INSPECTION</span>
                 </div>
                 
                 {/* 상단 구석에 정보 배치 */}
                 <div className="absolute top-6 left-6 flex flex-col space-y-2 pointer-events-auto">
                    <div className="text-[10px] font-cyber text-cyan-400/60 tracking-widest uppercase font-bold">CURRENT CREDITS</div>
                    <div className="text-3xl font-black font-cyber italic tracking-tight">{score.toLocaleString()} <span className="text-cyan-400 text-sm">CP</span></div>
                 </div>

                 {/* 프리미엄 배너 (결제 유도) */}
                 {!isPremium && (
                     <div className="absolute top-24 left-6 flex flex-col space-y-3 pointer-events-auto animate-in slide-in-from-left duration-1000">
                         <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-[1px] rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                             <div className="bg-black/80 px-4 py-3 rounded-xl flex items-center space-x-3">
                                <Crown className="w-5 h-5 text-yellow-400 animate-bounce" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-cyber font-black text-yellow-400 uppercase tracking-tighter">{t('premium_bundle')}</span>
                                    <span className="text-[8px] text-gray-400 font-medium">{t('premium_desc')}</span>
                                </div>
                                <button onClick={buyPremium} className="bg-yellow-400 text-black text-[9px] font-black px-3 py-1.5 rounded-lg hover:bg-white transition-colors uppercase font-cyber">{t('shop_buy_gems')}</button>
                             </div>
                         </div>
                     </div>
                 )}

                 <button onClick={closeShop} className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-red-500/20 border border-white/10 rounded-full text-white/50 hover:text-white transition-all pointer-events-auto active:scale-90">
                    <X className="w-6 h-6" />
                 </button>
             </div>

             {/* 하단 아이템 조작창 (40%) */}
             <div className="h-[40%] w-full bg-gradient-to-t from-black via-black/95 to-transparent backdrop-blur-md border-t border-white/5 flex flex-col pointer-events-auto mt-auto px-4 pb-4">
                 
                 {/* 선택된 아이템 정보 및 버튼 (중앙 플로팅) */}
                 {previewCarId && (
                     <div className="flex-grow flex items-center justify-between max-w-6xl mx-auto w-full px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col space-y-1">
                            {(() => {
                                const item = items.find(i => i.id === previewCarId);
                                if (!item) return null;
                                return (
                                    <>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(6,182,212,1)]" />
                                            <h3 className="text-2xl font-black font-cyber text-white uppercase italic tracking-tighter">{item.name}</h3>
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-cyber font-medium tracking-wide max-w-xs">{item.description}</p>
                                    </>
                                );
                            })()}
                        </div>

                        <div className="flex items-center space-x-4">
                            {(() => {
                                const item = items.find(i => i.id === previewCarId);
                                if (!item) return null;
                                const isOwned = ownedCars.includes(item.id);
                                const isEquipped = equippedCarId === item.id;
                                
                                return isOwned ? (
                                    <button onClick={() => equipCar(item.id)} disabled={isEquipped} className={`px-10 py-3.5 rounded-xl font-black font-cyber uppercase tracking-[0.3em] text-xs transition-all flex items-center space-x-2 ${isEquipped ? 'bg-gray-800/50 text-gray-600 border border-white/5' : 'bg-white text-black hover:bg-cyan-400 active:scale-95 shadow-lg'}`}>
                                        {isEquipped ? <ShieldCheck className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        <span>{isEquipped ? t('shop_equipped') : t('shop_equip')}</span>
                                    </button>
                                ) : (
                                    <button onClick={() => { audio.init(); buyItem(item.id, item.cost); }} disabled={score < item.cost} className={`px-10 py-3.5 rounded-xl font-black font-cyber uppercase tracking-[0.3em] text-xs transition-all flex items-center space-x-3 ${score >= item.cost ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_30px_rgba(6,182,212,0.3)] active:scale-95' : 'bg-gray-800 text-gray-600 grayscale'}`}>
                                        <Sparkles className="w-4 h-4" />
                                        <span>BUY: {item.cost.toLocaleString()} CP</span>
                                    </button>
                                );
                            })()}
                        </div>
                     </div>
                 )}

                 {/* 최하단 아이템 리스트 (슬라이더) */}
                 <div className="h-28 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 items-center px-4">
                    {/* 프리미엄 번들 상품 상시 노출 (결제 유도) */}
                    {!isPremium && (
                        <div 
                            onClick={buyPremium}
                            className="flex-shrink-0 w-44 h-20 snap-center rounded-xl border-2 border-yellow-400/50 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex flex-col items-center justify-center space-y-1 cursor-pointer hover:scale-105 transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                        >
                            <Crown className="w-6 h-6 text-yellow-400" />
                            <div className="text-[9px] font-black font-cyber text-white tracking-tighter uppercase">{t('premium_bundle')}</div>
                            <div className="text-[10px] font-black text-yellow-400 uppercase font-cyber italic">$9.99</div>
                        </div>
                    )}
                    
                    {items.map(item => {
                        const isPreviewed = previewCarId === item.id;
                        const isOwned = ownedCars.includes(item.id);
                        const isEquipped = equippedCarId === item.id;
                        
                        return (
                            <div 
                                key={item.id} 
                                ref={el => itemRefs.current[item.id] = el}
                                onClick={() => handleSelectCar(item.id)}
                                className={`flex-shrink-0 w-24 h-20 snap-center rounded-xl border transition-all duration-300 flex flex-col items-center justify-center space-y-2 cursor-pointer ${isPreviewed ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)] scale-110 z-10' : 'bg-white/5 border-white/5 opacity-40 hover:opacity-80'}`}
                            >
                                <item.icon className={`w-6 h-6 ${isPreviewed ? 'text-cyan-400' : 'text-white'}`} />
                                <div className="text-[8px] font-black font-cyber tracking-tighter uppercase truncate w-full text-center px-1">
                                    {isEquipped ? 'EQUIPPED' : (isOwned ? 'OWNED' : `${item.cost}`)}
                                </div>
                            </div>
                        );
                    })}
                 </div>
             </div>
        </div>
    );
};

const AttendanceModal: React.FC = () => {
    const { showAttendanceToast, hideAttendanceToast } = useStore();
    if (!showAttendanceToast) return null;
    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-xl animate-in fade-in duration-500 pointer-events-auto">
            <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-cyan-400/40 p-10 rounded-[50px] flex flex-col items-center text-center shadow-[0_0_100px_rgba(6,182,212,0.4)] max-w-sm mx-4 animate-in zoom-in duration-700">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-cyan-400 blur-3xl opacity-20 animate-pulse" />
                    <Gift className="w-24 h-24 text-cyan-400 relative z-10" />
                </div>
                <h2 className="text-4xl font-black font-cyber text-white uppercase tracking-tighter mb-3 italic">SYSTEM REBOOT</h2>
                <p className="text-gray-400 text-sm mb-10 leading-relaxed font-medium">Daily supply sequence initialized. Emergency resources have been added to your inventory.</p>
                <div className="flex flex-col w-full space-y-4 mb-10">
                    <div className="bg-yellow-400/10 border border-yellow-400/30 px-6 py-4 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Crown className="w-5 h-5 text-yellow-400" />
                            <span className="text-[10px] font-cyber text-yellow-400 font-bold tracking-widest uppercase">CREDITS</span>
                        </div>
                        <span className="text-2xl font-black font-cyber text-yellow-400">+1,000</span>
                    </div>
                    <div className="bg-cyan-400/10 border border-cyan-400/30 px-6 py-4 rounded-2xl flex items-center justify-between">
                         <div className="flex items-center space-x-3">
                            <ZapIcon className="w-5 h-5 text-cyan-400" />
                            <span className="text-[10px] font-cyber text-cyan-400 font-bold tracking-widest uppercase">ENERGY</span>
                        </div>
                        <span className="text-2xl font-black font-cyber text-cyan-400">+10</span>
                    </div>
                </div>
                <button onClick={() => { audio.init(); hideAttendanceToast(); }} className="w-full bg-white text-black py-5 rounded-2xl font-black font-cyber uppercase tracking-[0.4em] text-sm hover:bg-cyan-400 hover:shadow-2xl transition-all active:scale-95">REDEEM</button>
            </div>
        </div>
    );
};

export const HUD: React.FC = () => {
    const { status, locale, score, highScore, lives, maxLives, speed, level, distance, collectedLetters, isLevelTransition, restartGame, startGame, openShop, setStatus, checkAttendance, hasImmortality, energy, watchAd, isPremium, buyPremium, hasCompletedTutorial, completeTutorial } = useStore();
    const t = useCallback((key: string) => translations[locale][key as keyof typeof translations['en']] || key, [locale]);
    const scoreRef = useRef<HTMLDivElement>(null);
    const bonusRef = useRef<HTMLDivElement>(null);
    const energyRef = useRef<HTMLDivElement>(null);
    const [showTutorial, setShowTutorial] = useState(false);

    useEffect(() => { if (status === GameStatus.MENU) checkAttendance(); }, [status, checkAttendance]);

    useEffect(() => {
        const handlePulse = (e: any) => {
            const target = e.detail.target === 'score' ? scoreRef.current : (e.detail.target === 'energy' ? energyRef.current : bonusRef.current);
            if (target) {
                target.classList.remove('animate-pulse-ui');
                void target.offsetWidth;
                target.classList.add('animate-pulse-ui');
            }
        };
        window.addEventListener('hud-pulse', handlePulse);
        return () => window.removeEventListener('hud-pulse', handlePulse);
    }, []);

    const handleStartGame = async () => {
        await audio.init();
        audio.playStartBuzz();
        startGame();
    };

    const handleTutorialClose = () => {
        setShowTutorial(false);
        completeTutorial();
        handleStartGame();
    };

    const handleLaunchClick = async () => {
        if (!isPremium && energy <= 0) return;
        
        if (!hasCompletedTutorial) {
            setShowTutorial(true);
        } else {
            handleStartGame();
        }
    };

    if (status === GameStatus.SHOP) return <ShopScreen />;

    return (
        <div className="absolute inset-0 z-10 p-4 md:p-8 flex flex-col pointer-events-none text-white overflow-hidden">
            <AttendanceModal />
            {showTutorial && <Tutorial onClose={handleTutorialClose} />}
            {isLevelTransition && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-cyan-500/10 backdrop-blur-3xl border-y border-cyan-400/40 w-full py-12 flex flex-col items-center shadow-[0_0_100px_rgba(6,182,212,0.3)]">
                        <div className="text-cyan-400 font-cyber font-black text-6xl md:text-8xl tracking-tighter uppercase italic drop-shadow-[0_0_40px_rgba(6,182,212,0.8)] animate-pulse">Level {level}</div>
                        <div className="mt-2 text-white font-cyber font-black text-2xl tracking-[0.5em] uppercase opacity-50">INITIALIZING</div>
                    </div>
                </div>
            )}
            
            {status === GameStatus.MENU ? (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto">
                    
                    {/* 상단 왼쪽 프리미엄 구매 버튼 이동 */}
                    <div className="absolute top-8 left-8 flex flex-col items-start space-y-4 pointer-events-auto">
                        {!isPremium && (
                            <button onClick={buyPremium} className="group flex items-center space-x-3 bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.4)] hover:scale-105 transition-all animate-bounce">
                                <Crown className="w-5 h-5 text-black animate-spin-slow" />
                                <div className="flex flex-col items-start">
                                    <span className="text-[9px] font-black font-cyber text-black uppercase tracking-widest leading-none">{t('premium_buy')}</span>
                                    <span className="text-[7px] font-black text-black/70 uppercase">No Ads + All Cars</span>
                                </div>
                            </button>
                        )}
                        {isPremium && (
                            <div className="bg-yellow-400/20 border border-yellow-400/40 px-4 py-2 rounded-xl flex items-center space-x-2">
                                <Crown className="w-4 h-4 text-yellow-400" />
                                <span className="text-[9px] font-black font-cyber text-yellow-400 uppercase">{t('premium_status')}</span>
                            </div>
                        )}
                    </div>

                    {/* 상단 에너지바 영역 (오른쪽 유지) */}
                    <div ref={energyRef} className="absolute top-8 right-8 flex flex-col items-end space-y-4">
                        <div className="bg-black/60 border border-white/10 backdrop-blur-md px-5 py-3 rounded-2xl flex flex-col items-center transition-all hover:bg-white/10 shadow-2xl">
                            <span className="text-[8px] font-cyber text-gray-400 tracking-[0.4em] uppercase mb-1">{t('energy')}</span>
                            <div className="flex items-center space-x-2">
                                <ZapIcon className={`w-4 h-4 ${energy > 0 || isPremium ? 'text-cyan-400' : 'text-red-500 animate-pulse'}`} />
                                <span className={`text-2xl font-black font-cyber ${energy > 0 || isPremium ? 'text-white' : 'text-red-500'}`}>{isPremium ? 'MAX' : energy}</span>
                            </div>
                            {!isPremium && (
                                <button onClick={() => { audio.init(); watchAd(); }} className="mt-2 text-[10px] font-cyber text-cyan-400 border-t border-white/5 pt-2 hover:text-white transition-colors uppercase tracking-widest font-bold">{t('watch_ad')}</button>
                            )}
                        </div>
                    </div>

                    <div className="text-center animate-in zoom-in duration-1000">
                        <div className="relative mb-14">
                            <h1 className="text-8xl md:text-[10rem] font-black text-white font-cyber tracking-tighter drop-shadow-[0_0_50px_rgba(255,255,255,0.2)] leading-[0.85] uppercase italic">Racing<br/><span className="text-cyan-400 drop-shadow-[0_0_30px_rgba(6,182,212,0.6)]">Car</span></h1>
                            {/* 게임 한 줄 설명 추가 */}
                            <p className="mt-4 text-xs font-cyber tracking-[0.3em] text-cyan-400/60 uppercase font-bold max-w-sm mx-auto leading-relaxed">{t('game_desc_short')}</p>
                            
                            {highScore > 0 && (
                                <div className="mt-6 flex items-center justify-center space-x-3 text-yellow-400 font-cyber font-bold italic animate-pulse">
                                    <Crown className="w-5 h-5" />
                                    <span className="text-lg tracking-tight uppercase">SYSTEM BEST: {highScore.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col space-y-5 w-72 mx-auto">
                            <button 
                                disabled={!isPremium && energy <= 0}
                                onPointerDown={handleLaunchClick} 
                                className={`group relative font-black font-cyber text-xl py-6 rounded-2xl overflow-hidden transition-all shadow-[0_15px_40px_rgba(0,0,0,0.5)] ${(isPremium || energy > 0) ? 'bg-white text-black hover:scale-105 active:scale-95' : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'}`}>
                                <div className={`absolute inset-0 bg-cyan-400 translate-x-[-100%] transition-transform duration-500 ${(isPremium || energy > 0) ? 'group-hover:translate-x-0' : ''}`} />
                                <span className="relative z-10 tracking-[0.2em]">{(isPremium || energy > 0) ? t('launch_engine') : t('no_energy')}</span>
                            </button>
                            <button onPointerDown={() => { audio.init(); openShop(); }} className="bg-black/80 border-2 border-white/20 text-white font-cyber py-7 rounded-2xl hover:bg-white/10 hover:border-cyan-400/50 transition-all flex items-center justify-center space-x-5 group shadow-2xl">
                                <ShoppingBag className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform" />
                                <span className="tracking-[0.3em] uppercase text-xl font-black">{t('cyber_shop')}</span>
                            </button>
                            {/* 다국어 선택 중앙 정렬 */}
                            <div className="pt-8 flex justify-center w-full"><LanguageToggle /></div>
                        </div>
                    </div>
                </div>
            ) : (status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) ? (
                <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/85 backdrop-blur-2xl animate-in fade-in duration-700 pointer-events-auto">
                    <div className="text-center p-8 max-w-lg w-full">
                        <div className={`text-6xl md:text-8xl font-black font-cyber mb-6 tracking-tighter italic uppercase ${status === GameStatus.VICTORY ? 'text-cyan-400 drop-shadow-[0_0_30px_rgba(6,182,212,0.5)]' : 'text-red-500 animate-pulse drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]'}`}>{t(status === GameStatus.VICTORY ? 'victory' : 'game_over')}</div>
                        <div className="bg-white/5 border border-white/10 rounded-[40px] p-10 mb-10 backdrop-blur-md shadow-2xl">
                            <div className="flex flex-col space-y-8">
                                <div>
                                    <div className="text-[10px] font-cyber text-gray-500 tracking-[0.6em] mb-3 uppercase font-black">{t('final_score')}</div>
                                    <div className="text-6xl font-black text-white font-cyber tracking-tight">{score.toLocaleString()}</div>
                                    {score >= highScore && score > 0 && <div className="text-yellow-400 font-cyber text-sm mt-3 animate-bounce font-black tracking-widest">! NEW WORLD RECORD !</div>}
                                </div>
                                <div className="flex justify-center space-x-12 pt-4 border-t border-white/5">
                                    <div className="text-center"><div className="text-[9px] font-cyber text-gray-500 uppercase tracking-widest mb-1">LV</div><div className="text-3xl font-black text-cyan-400 font-cyber">{level}</div></div>
                                    <div className="text-center"><div className="text-[9px] font-cyber text-gray-500 uppercase tracking-widest mb-1">DIST</div><div className="text-3xl font-black text-yellow-400 font-cyber">{distance}m</div></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col space-y-5 w-full max-w-sm mx-auto">
                            <button 
                                disabled={!isPremium && energy <= 0}
                                onPointerDown={async () => { 
                                    if (isPremium || energy > 0) {
                                        await audio.init(); 
                                        audio.playStartBuzz(); 
                                        restartGame(); 
                                    }
                                }} 
                                className={`py-6 rounded-2xl font-black font-cyber text-xl uppercase tracking-[0.3em] transition-all shadow-2xl ${(isPremium || energy > 0) ? 'bg-white text-black hover:scale-105 active:scale-95' : 'bg-gray-800 text-gray-500 opacity-50'}`}>
                                {(isPremium || energy > 0) ? t(status === GameStatus.VICTORY ? 'run_again' : 'restart_mission') : t('no_energy')}
                            </button>
                            {(!isPremium && energy <= 0) && (
                                <div className="flex flex-col space-y-3">
                                    <button onClick={() => { audio.init(); watchAd(); }} className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 py-4 rounded-2xl font-cyber text-sm flex items-center justify-center space-x-3 hover:bg-cyan-500/30 transition-all font-black tracking-widest uppercase shadow-lg">
                                        <Clapperboard className="w-5 h-5" />
                                        <span>{t('watch_ad')}</span>
                                    </button>
                                    <button onClick={buyPremium} className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black py-4 rounded-2xl font-black font-cyber text-xs uppercase tracking-widest shadow-xl flex items-center justify-center space-x-3">
                                        <Crown className="w-4 h-4" />
                                        <span>{t('premium_remove_ads')}</span>
                                    </button>
                                </div>
                            )}
                            <button onPointerDown={() => { audio.init(); setStatus(GameStatus.MENU); }} className="py-4 text-gray-500 font-cyber text-[10px] hover:text-white transition-colors tracking-[0.4em] uppercase font-bold">{t('shop_back_menu')}</button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                            <div ref={scoreRef} className="bg-black/50 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-xl flex flex-col shadow-2xl">
                                <span className="text-[7px] font-cyber text-gray-400 tracking-[0.3em] uppercase mb-1 font-bold">{t('score')}</span>
                                <span className="text-2xl font-black font-cyber tabular-nums italic">{score.toLocaleString()}</span>
                            </div>
                            <div className="bg-black/50 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-xl flex flex-col shadow-2xl">
                                <span className="text-[7px] font-cyber text-gray-400 tracking-[0.3em] uppercase mb-1 font-bold">{t('level')}</span>
                                <span className="text-xl font-black font-cyber text-cyan-400 uppercase tracking-tighter leading-none italic">LV.{level}</span>
                            </div>
                        </div>
                        <div ref={bonusRef} className="hidden sm:flex bg-black/50 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-xl items-center space-x-4 shadow-2xl">
                            {['B', 'O', 'N', 'U', 'S'].map((char, i) => (
                                <span key={i} className={`text-xl font-black font-cyber transition-all duration-500 ${collectedLetters.includes(i) ? 'text-white scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]' : 'text-white/10'}`} style={{ color: collectedLetters.includes(i) ? GEMINI_COLORS[i] : '' }}>{char}</span>
                            ))}
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                            <div ref={energyRef} className={`bg-black/50 border ${isPremium ? 'border-yellow-400/50' : 'border-white/10'} backdrop-blur-xl px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-2xl`}>
                                {isPremium ? <Crown className="w-3.5 h-3.5 text-yellow-400" /> : <ZapIcon className="w-3.5 h-3.5 text-cyan-400" />}
                                <span className={`text-base font-black font-cyber ${isPremium ? 'text-yellow-400' : 'text-white'}`}>{isPremium ? '∞' : energy}</span>
                            </div>
                            <div className="flex space-x-1.5">{Array.from({ length: maxLives }).map((_, i) => <Heart key={i} className={`w-6 h-6 transition-all duration-500 ${i < lives ? 'text-red-500 fill-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]' : 'text-gray-900'}`} />)}</div>
                            <div className="text-[9px] font-cyber text-cyan-400 font-black tracking-widest uppercase bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-500/30 shadow-lg">{Math.floor(speed)} KM/H</div>
                        </div>
                    </div>
                    <div className="sm:hidden flex justify-center mt-4">
                        <div className="flex bg-black/50 border border-white/10 backdrop-blur-xl px-4 py-1.5 rounded-xl items-center space-x-3 shadow-2xl">
                            {['B', 'O', 'N', 'U', 'S'].map((char, i) => (
                                <span key={i} className={`text-lg font-black font-cyber transition-all duration-500 ${collectedLetters.includes(i) ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-white/10'}`} style={{ color: collectedLetters.includes(i) ? GEMINI_COLORS[i] : '' }}>{char}</span>
                            ))}
                        </div>
                    </div>
                    {/* 모바일 컨트롤 오버레이 */}
                    <div className="md:hidden absolute inset-0 pointer-events-none flex">
                        <div className="w-1/3 h-full pointer-events-auto active:bg-white/5 transition-colors" onPointerDown={() => window.dispatchEvent(new CustomEvent('game-control', { detail: { action: 'left' } }))} />
                        <div className="w-1/3 h-full flex flex-col">
                            <div className="h-2/3 pointer-events-auto active:bg-white/5 transition-colors" onPointerDown={() => window.dispatchEvent(new CustomEvent('game-control', { detail: { action: 'jump' } }))} />
                            {hasImmortality && <div className="h-1/3 pointer-events-auto transition-colors flex items-center justify-center active:bg-cyan-400/20 border-t border-white/5" onPointerDown={() => window.dispatchEvent(new CustomEvent('game-control', { detail: { action: 'ability' } }))}><ZapIcon className="w-10 h-10 text-cyan-400 animate-pulse drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]" /></div>}
                        </div>
                        <div className="w-1/3 h-full pointer-events-auto active:bg-white/5 transition-colors" onPointerDown={() => window.dispatchEvent(new CustomEvent('game-control', { detail: { action: 'right' } }))} />
                    </div>
                </>
            )}
        </div>
    );
};