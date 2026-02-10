

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  SHOP = 'SHOP',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export type Locale = 'en' | 'ko';

export enum ObjectType {
  OBSTACLE = 'OBSTACLE',
  GEM = 'GEM',
  LETTER = 'LETTER',
  SHOP_PORTAL = 'SHOP_PORTAL',
  ALIEN = 'ALIEN',
  MISSILE = 'MISSILE'
}

export interface GameObject {
  id: string;
  type: ObjectType;
  position: [number, number, number]; // x, y, z
  active: boolean;
  value?: string; // For letters (G, E, M...)
  color?: string;
  targetIndex?: number; // Index in the target word
  points?: number; // Score value for gems
  hasFired?: boolean; // For Aliens
}

export const LANE_WIDTH = 2.2;
export const JUMP_HEIGHT = 2.5;
export const JUMP_DURATION = 0.6; // seconds
export const RUN_SPEED_BASE = 52.0; // 48.0 -> 52.0 난이도 상향
export const SPAWN_DISTANCE = 220; 
export const REMOVE_DISTANCE = 25; // Behind player

// Neon Colors for "BONUS": Blue, Red, Yellow, Green, Pink
export const GEMINI_COLORS = [
    '#2979ff', // B - Blue
    '#ff1744', // O - Red
    '#ffea00', // N - Yellow
    '#00e676', // U - Green
    '#f472b6', // S - Pink
];

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    icon: any; 
    oneTime?: boolean;
    category: 'UPGRADE' | 'CAR';
}