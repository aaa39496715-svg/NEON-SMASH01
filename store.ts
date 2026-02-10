

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GameStatus, RUN_SPEED_BASE, Locale } from './types';

const SAVE_KEY = 'gemini_runner_save_v4'; 

interface GameState {
  status: GameStatus;
  locale: Locale;
  score: number;
  highScore: number;
  lives: number;
  maxLives: number;
  speed: number;
  collectedLetters: number[]; 
  level: number;
  laneCount: number;
  gemsCollected: number;
  distance: number;
  
  // Energy System
  energy: number;
  isPremium: boolean; // 유료 결제 여부
  
  // Transition / UI
  isLevelTransition: boolean;
  transitionTimer: number;

  // Inventory / Abilities
  hasDoubleJump: boolean;
  hasImmortality: boolean;
  isImmortalityActive: boolean;

  // Car Collection
  ownedCars: string[];
  equippedCarId: string;
  previewCarId: string | null;

  // Attendance
  showAttendanceToast: boolean;
  
  // Tutorial
  hasCompletedTutorial: boolean;

  // Actions
  startGame: () => boolean; 
  restartGame: () => boolean;
  takeDamage: () => void;
  addScore: (amount: number) => void;
  collectGem: (value: number) => void;
  collectLetter: (index: number) => void;
  setStatus: (status: GameStatus) => void;
  setDistance: (dist: number) => void;
  setLocale: (locale: Locale) => void;
  completeTutorial: () => void;
  
  // Shop / Abilities / Energy / Payments
  buyItem: (type: string, cost: number) => boolean;
  buyPremium: () => void; // 결제 실행 액션
  watchAd: () => void; 
  equipCar: (carId: string) => void;
  setPreviewCarId: (carId: string | null) => void;
  advanceLevel: () => void;
  openShop: () => void;
  closeShop: () => void;
  activateImmortality: () => void;
  checkAttendance: () => void;
  hideAttendanceToast: () => void;
}

const TARGET_WORD = ['B', 'O', 'N', 'U', 'S'];
const MAX_LEVEL = 10;
const ATTENDANCE_REWARD_CREDITS = 1000;
const ATTENDANCE_REWARD_ENERGY = 10;
const AD_REWARD_ENERGY = 10;
const INITIAL_ENERGY = 30;
const TRANSITION_DURATION = 1500;

const getLevelBaseSpeed = (level: number) => {
  return RUN_SPEED_BASE + (level - 1) * (RUN_SPEED_BASE * 0.15); // 난이도 상향: 속도 증가폭 0.12 -> 0.15
};

// 난이도 상향: 레벨별 차선 수 규칙 재정의
const getLaneCountForLevel = (level: number) => {
    if (level <= 2) return 3;
    if (level <= 4) return 5;
    if (level <= 6) return 7;
    return 9;
};

export const useStore = create<GameState>()(
  persist(
    (set, get) => ({
      status: GameStatus.MENU,
      locale: 'ko',
      score: 3000, 
      highScore: 0,
      lives: 3,
      maxLives: 3,
      speed: 0,
      collectedLetters: [],
      level: 1,
      laneCount: 3,
      gemsCollected: 0,
      distance: 0,
      energy: INITIAL_ENERGY,
      isPremium: false,
      isLevelTransition: false,
      transitionTimer: 0,
      hasDoubleJump: false,
      hasImmortality: false,
      isImmortalityActive: false,
      ownedCars: ['CAR_NEON'],
      equippedCarId: 'CAR_NEON',
      previewCarId: null,
      showAttendanceToast: false,
      hasCompletedTutorial: false,

      setLocale: (locale) => set({ locale }),
      
      completeTutorial: () => set({ hasCompletedTutorial: true }),

      startGame: () => {
        const { energy, maxLives, isPremium } = get();
        // 프리미엄 유저는 에너지를 소모하지 않음
        if (!isPremium && energy <= 0) return false;

        set({ 
          status: GameStatus.PLAYING, 
          energy: isPremium ? energy : energy - 1,
          lives: maxLives, 
          speed: RUN_SPEED_BASE,
          collectedLetters: [],
          level: 1,
          laneCount: 3,
          gemsCollected: 0,
          distance: 0,
          isImmortalityActive: false,
          isLevelTransition: false,
          previewCarId: null
        });
        return true;
      },

      restartGame: () => {
        const { level, maxLives, energy, isPremium } = get();
        if (!isPremium && energy <= 0) return false;

        set({ 
          status: GameStatus.PLAYING, 
          energy: isPremium ? energy : energy - 1,
          lives: maxLives, 
          speed: getLevelBaseSpeed(level),
          collectedLetters: [],
          level: level,
          laneCount: getLaneCountForLevel(level),
          gemsCollected: 0,
          distance: 0,
          isImmortalityActive: false,
          isLevelTransition: false,
          previewCarId: null
        });
        return true;
      },

      buyPremium: () => {
        // 실제 인앱 결제 API 호출 대신 성공 상태 시뮬레이션
        set({ 
          isPremium: true, 
          score: get().score + 50000,
          energy: 999, // 시각적 만족을 위한 높은 수치
          ownedCars: ['CAR_NEON', 'CAR_SHADOW', 'CAR_BIKE', 'CAR_RETRO', 'CAR_TRUCK', 'CAR_MUSCLE', 'CAR_BLADE', 'CAR_AERO', 'CAR_VOID']
        });
        window.dispatchEvent(new CustomEvent('hud-pulse', { detail: { target: 'score' } }));
      },

      watchAd: () => {
        const { isPremium } = get();
        // 프리미엄 유저는 광고 없이 즉시 충전
        set(state => ({ energy: state.energy + AD_REWARD_ENERGY }));
        window.dispatchEvent(new CustomEvent('hud-pulse', { detail: { target: 'energy' } }));
      },

      takeDamage: () => {
        const { lives, isImmortalityActive, status, score, highScore } = get();
        if (isImmortalityActive || status !== GameStatus.PLAYING) return;

        if (lives > 1) {
          set({ lives: lives - 1 });
          window.dispatchEvent(new CustomEvent('screen-shake', { detail: { intensity: 0.5 } }));
        } else {
          const newHighScore = Math.max(highScore, score);
          set({ lives: 0, status: GameStatus.GAME_OVER, speed: 0, highScore: newHighScore });
        }
      },

      addScore: (amount) => {
        set((state) => ({ score: state.score + amount }));
      },
      
      collectGem: (value) => {
        set((state) => ({ 
          score: state.score + value, 
          gemsCollected: state.gemsCollected + 1 
        }));
        window.dispatchEvent(new CustomEvent('hud-pulse', { detail: { target: 'score' } }));
      },

      setDistance: (dist) => set({ distance: dist }),

      collectLetter: (index) => {
        const { collectedLetters, level, speed } = get();
        if (!collectedLetters.includes(index)) {
          const newLetters = [...collectedLetters, index];
          const speedIncrease = RUN_SPEED_BASE * 0.025;
          const nextSpeed = speed + speedIncrease;
          set({ collectedLetters: newLetters, speed: nextSpeed });
          window.dispatchEvent(new CustomEvent('hud-pulse', { detail: { target: 'bonus' } }));

          if (newLetters.length === TARGET_WORD.length) {
            if (level < MAX_LEVEL) {
                get().advanceLevel();
            } else {
                const newHighScore = Math.max(get().highScore, get().score + 20000);
                set({ status: GameStatus.VICTORY, score: get().score + 20000, highScore: newHighScore });
            }
          }
        }
      },

      advanceLevel: () => {
          const { level, speed } = get();
          const nextLevel = level + 1;
          const speedIncrease = RUN_SPEED_BASE * 0.12; // 난이도 상향: 레벨업 속도 보너스 0.08 -> 0.12
          const newSpeed = speed + speedIncrease;

          set({ 
              isLevelTransition: true, 
              speed: 0, 
              level: nextLevel,
              laneCount: getLaneCountForLevel(nextLevel),
              collectedLetters: []
          });

          setTimeout(() => {
              set({ 
                isLevelTransition: false,
                speed: newSpeed 
              });
          }, TRANSITION_DURATION);
      },

      openShop: () => set({ status: GameStatus.SHOP, previewCarId: get().equippedCarId }),
      
      closeShop: () => {
        set((state) => ({ 
          status: state.speed > 0 || state.isLevelTransition ? GameStatus.PLAYING : GameStatus.MENU,
          previewCarId: null
        }));
      },

      buyItem: (type, cost) => {
          const { score, maxLives, lives, ownedCars } = get();
          if (score >= cost) {
              if (type.startsWith('CAR_')) {
                  set({ score: score - cost, ownedCars: [...ownedCars, type], equippedCarId: type, previewCarId: type });
                  return true;
              }
              set({ score: score - cost });
              switch (type) {
                  case 'DOUBLE_JUMP': set({ hasDoubleJump: true }); break;
                  case 'MAX_LIFE': set({ maxLives: maxLives + 1, lives: lives + 1 }); break;
                  case 'HEAL': set({ lives: Math.min(lives + 1, maxLives) }); break;
                  case 'IMMORTAL': set({ hasImmortality: true }); break;
              }
              return true;
          }
          return false;
      },

      equipCar: (carId) => {
        set({ equippedCarId: carId, previewCarId: carId });
      },

      setPreviewCarId: (carId) => set({ previewCarId: carId }),

      activateImmortality: () => {
          const { hasImmortality, isImmortalityActive } = get();
          if (hasImmortality && !isImmortalityActive) {
              set({ isImmortalityActive: true });
              setTimeout(() => {
                  set({ isImmortalityActive: false });
              }, 5000);
          }
      },

      checkAttendance: () => {
        const today = new Date().toDateString();
        const lastCheck = localStorage.getItem('last_attendance_date');
        if (lastCheck !== today) {
          localStorage.setItem('last_attendance_date', today);
          set({ 
            score: get().score + ATTENDANCE_REWARD_CREDITS, 
            energy: get().energy + ATTENDANCE_REWARD_ENERGY,
            showAttendanceToast: true 
          });
        }
      },

      hideAttendanceToast: () => set({ showAttendanceToast: false }),
      setStatus: (status) => set({ status }),
    }),
    {
      name: SAVE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        score: state.score,
        highScore: state.highScore,
        maxLives: state.maxLives,
        hasDoubleJump: state.hasDoubleJump,
        hasImmortality: state.hasImmortality,
        ownedCars: state.ownedCars,
        equippedCarId: state.equippedCarId,
        energy: state.energy,
        locale: state.locale,
        isPremium: state.isPremium,
        hasCompletedTutorial: state.hasCompletedTutorial
      }),
    }
  )
);