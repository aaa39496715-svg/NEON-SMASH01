
export enum GameState {
  MENU = 'MENU',
  MODE_SELECT = 'MODE_SELECT',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  COACH_TALK = 'COACH_TALK',
  ARCHIVE = 'ARCHIVE',
  GUIDE = 'GUIDE',
  SHOP = 'SHOP',
  SETTINGS = 'SETTINGS',
  TUTORIAL = 'TUTORIAL'
}

export type GameMode = 'SINGLE' | 'DOUBLE' | 'TUTORIAL';

export interface PlayerStats {
  power: number;
  speed: number;
  accuracy: number;
  name: string;
  currency: number;
  upgrades: {
    powerLevel: number;
    speedLevel: number;
  };
  activeSkin: string;
  ownedSkins: string[];
}

export interface Skin {
  id: string;
  name: string;
  color: string;
  price: number;
  description: string;
}

export const SKINS: Skin[] = [
  { id: 'default', name: 'CORE_BLUE', color: '#60a5fa', price: 0, description: 'Standard issue neural interface.' },
  { id: 'emerald', name: 'BIO_GREEN', color: '#10b981', price: 1000, description: 'Organic-sync feedback paddle.' },
  { id: 'pink', name: 'NEON_PULSE', color: '#f472b6', price: 2500, description: 'High-frequency cosmetic output.' },
  { id: 'gold', name: 'CYBER_GOLD', color: '#fbbf24', price: 5000, description: 'Premium alloy for elite players.' },
  { id: 'red', name: 'CRITICAL_ERROR', color: '#f43f5e', price: 7500, description: 'Overclocked visual signature.' },
];

export interface MatchResult {
  playerScore: number;
  opponentScore: number;
  totalHits: number;
  winner: string;
  maxRally: number;
  mode: GameMode;
  level: number;
  timestamp: string;
  earnedCurrency: number;
}

export interface Ball extends Entity {
  vx: number;
  vy: number;
  radius: number;
  baseSpeed: number;
}

export interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Paddle extends Entity {}

export type ItemType = 'GROW' | 'SLOW' | 'SHIELD' | 'NARROW' | 'HURRY';

export interface Item extends Entity {
  type: ItemType;
  active: boolean;
  spawnTime: number;
  vy: number;
}

export interface Obstacle extends Entity {
  vx: number;
}
