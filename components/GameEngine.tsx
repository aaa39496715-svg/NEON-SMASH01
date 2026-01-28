
import React, { useRef, useEffect, useState } from 'react';
import { Ball, Paddle, MatchResult, Item, Obstacle, GameMode, ItemType, SKINS, PlayerStats } from '../types';
import { sound } from './SoundManager';

interface GameEngineProps {
  mode: GameMode;
  onGameOver: (result: MatchResult) => void;
  onHome: () => void;
  playerStats: PlayerStats;
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; color: string; size: number;
}

interface Star {
  x: number; y: number; speed: number; size: number; opacity: number; layer: number;
}

interface FloatingText {
  x: number; y: number; text: string; life: number; color: string; size?: number;
}

interface DynamicObstacle extends Obstacle {
  color: string;
}

interface DataCore {
  x: number; y: number; radius: number; health: number; color: string; active: boolean; isShielded?: boolean;
}

interface Drone {
  centerX: number; centerY: number; angle: number; orbitRadius: number; speed: number; radius: number; color: string;
}

const OBSTACLE_COLORS = ['#22d3ee', '#f472b6', '#a3e635', '#fbbf24', '#818cf8'];

const ITEM_COLORS: Record<ItemType, string> = {
  'GROW': '#fbbf24',
  'SLOW': '#60a5fa',
  'SHIELD': '#a855f7',
  'NARROW': '#f43f5e',
  'HURRY': '#fb923c'
};

const GameEngine: React.FC<GameEngineProps> = ({ mode, onGameOver, onHome, playerStats }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [exp, setExp] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [redFlash, setRedFlash] = useState(0);
  const [collectionFlash, setCollectionFlash] = useState<{ active: number, color: string }>({ active: 0, color: '#fff' });
  
  // Gameplay refs
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const rallyRef = useRef(0);
  const levelRef = useRef(1);
  const waveRef = useRef(0);
  const expRef = useRef(0);
  const comboRef = useRef(0);
  const shakeRef = useRef(0);
  const timeScale = useRef(1.0);
  const lastItemSpawnTime = useRef(0);
  const isPausedForDeath = useRef(false);

  // Tutorial State
  const [tutorialStep, setTutorialStep] = useState(0);
  const moveDistance = useRef(0);
  const hasHitBall = useRef(false);

  const particles = useRef<Particle[]>([]);
  const ballTrail = useRef<{x: number, y: number}[]>([]);
  const stars = useRef<Star[]>([]);
  const activeItems = useRef<Item[]>([]);
  const floatingTexts = useRef<FloatingText[]>([]);
  const dataCores = useRef<DataCore[]>([]);
  const drones = useRef<Drone[]>([]);
  
  const activeSkinData = SKINS.find(s => s.id === playerStats.activeSkin) || SKINS[0];
  
  const playerPaddle = useRef<Paddle>({ x: 135, y: 540, width: 80, height: 12 });
  const ball = useRef<Ball>({ 
    x: 175, y: 520, vx: 0, vy: -6, radius: 7, 
    width: 14, height: 14, baseSpeed: 3 
  });
  
  const paddleVelocity = useRef(0);
  const aiPaddle = useRef<Paddle>({ x: 135, y: 30, width: 80, height: 12 });
  const obstacles = useRef<DynamicObstacle[]>([]);
  const targetX = useRef<number>(135);
  const paddleFlash = useRef(0);
  const paddleItemPulse = useRef(0);
  
  const paddleWideTimer = useRef<number>(0);
  const paddleNarrowTimer = useRef<number>(0);
  const ballSlowTimer = useRef<number>(0);
  const ballFastTimer = useRef<number>(0);
  const trailEffectTimer = useRef<number>(0);
  const shieldTimer = useRef<number>(0);

  const RALLY_TO_LEVEL = 10;

  const triggerShake = (amount: number) => {
    shakeRef.current = Math.max(shakeRef.current, amount);
    if (navigator.vibrate) navigator.vibrate(amount * 8);
  };

  const addFloatingText = (x: number, y: number, text: string, color: string = '#fff', size: number = 16) => {
    floatingTexts.current.push({ x, y, text, life: 1.0, color, size });
  };

  const createImpactParticles = (x: number, y: number, color: string, count: number = 10, size: number = 1.5, speedMult: number = 1) => {
    for (let i = 0; i < count; i++) {
      particles.current.push({
        x, y, 
        vx: (Math.random() - 0.5) * (count > 20 ? 25 : 10) * speedMult, 
        vy: (Math.random() - 0.5) * (count > 20 ? 25 : 10) * speedMult, 
        life: 1.0, color, size: size * (0.5 + Math.random())
      });
    }
  };

  const resetBallPosition = () => {
    ball.current.x = playerPaddle.current.x + playerPaddle.current.width / 2;
    ball.current.y = playerPaddle.current.y - ball.current.radius - 10;
    ball.current.vy = mode === 'SINGLE' ? -7 : -5;
    ball.current.vx = (Math.random() - 0.5) * 8;
    comboRef.current = 0;
    if (mode === 'TUTORIAL') {
        ball.current.vx = 0;
        ball.current.vy = -3;
    }
    createImpactParticles(ball.current.x, ball.current.y, activeSkinData.color, 15, 2);
    addFloatingText(ball.current.x, ball.current.y - 20, "SYSTEM REBOOT", activeSkinData.color, 12);
  };

  const spawnDataCores = () => {
    if (mode !== 'SINGLE') return;
    const newCores: DataCore[] = [];
    const lvl = levelRef.current;
    const waveNum = waveRef.current % 7;
    
    // Advanced Pattern Selection
    switch(waveNum) {
      case 0: // Diamond Ring
        const centerX = 175; const centerY = 180;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI * 2) / 8;
          newCores.push({ x: centerX + Math.cos(angle) * 85, y: centerY + Math.sin(angle) * 65, radius: 16, health: 1, color: OBSTACLE_COLORS[i % 5], active: true });
        }
        newCores.push({ x: centerX, y: centerY, radius: 22, health: 1, color: '#fff', active: true, isShielded: true });
        break;
      case 1: // V-STRIKE
        for (let i = 0; i < 7; i++) {
          newCores.push({ x: 50 + i * 42, y: 70 + Math.abs(3 - i) * 60, radius: 18, health: 1, color: OBSTACLE_COLORS[i % 5], active: true });
        }
        break;
      case 2: // Dual Waves
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 5; c++) {
            newCores.push({ x: 45 + c * 65, y: 80 + r * 110, radius: 18, health: 1, color: OBSTACLE_COLORS[(c+r) % 5], active: true });
          }
        }
        break;
      case 3: // X-Cross
        for (let i = 0; i < 7; i++) {
          newCores.push({ x: 50 + i * 42, y: 60 + i * 40, radius: 18, health: 1, color: '#22d3ee', active: true });
          if (i !== 3) newCores.push({ x: 50 + i * 42, y: 300 - i * 40, radius: 18, health: 1, color: '#f472b6', active: true });
        }
        break;
      case 4: // Fortress
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            if (r === 1 && c === 1) {
              newCores.push({ x: 175, y: 180, radius: 25, health: 1, color: '#fff', active: true, isShielded: true });
            } else {
              newCores.push({ x: 95 + c * 80, y: 100 + r * 80, radius: 15, health: 1, color: '#a3e635', active: true });
            }
          }
        }
        break;
      case 5: // ZigZag Matrix
        for (let i = 0; i < 10; i++) {
          newCores.push({ x: 50 + (i % 5) * 62, y: 80 + (i < 5 ? 0 : 160) + (i % 2 === 0 ? 40 : 0), radius: 18, health: 1, color: '#fbbf24', active: true });
        }
        break;
      case 6: // Concentric Chaos
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5;
            newCores.push({ x: 175 + Math.cos(angle) * 50, y: 180 + Math.sin(angle) * 50, radius: 14, health: 1, color: '#818cf8', active: true });
            newCores.push({ x: 175 + Math.cos(angle + 0.5) * 110, y: 180 + Math.sin(angle + 0.5) * 110, radius: 14, health: 1, color: '#22d3ee', active: true });
        }
        break;
    }

    dataCores.current = newCores;

    // Enhanced Drone Spawning
    const droneCount = Math.min(4, Math.floor(lvl / 2) + Math.floor(waveRef.current / 3));
    const newDrones: Drone[] = [];
    for (let i = 0; i < droneCount; i++) {
      newDrones.push({
        centerX: 175, centerY: 180,
        angle: (Math.PI * 2 * i) / droneCount,
        orbitRadius: 110 + i * 25,
        speed: 0.015 + (i * 0.01) + (waveRef.current * 0.002),
        radius: 12,
        color: '#f43f5e'
      });
    }
    drones.current = newDrones;
    
    if (waveRef.current > 0) {
        addFloatingText(175, 250, `WAVE ${waveRef.current + 1} ENGAGED`, "#10b981", 20);
        sound.playLevelUp();
    }
  };

  const createObstacles = (count: number, lvl: number) => {
    if (mode !== 'DOUBLE') return;
    const newObstacles: DynamicObstacle[] = [];
    const color = OBSTACLE_COLORS[lvl % OBSTACLE_COLORS.length];
    for (let i = 0; i < count; i++) {
      newObstacles.push({
        x: count === 1 ? 50 : (i === 0 ? 30 : 200),
        y: count === 1 ? 280 : (i === 0 ? 250 : 310),
        width: 85, height: 18, vx: 2.2 * (i === 0 ? 1 : -1), color: color
      });
    }
    obstacles.current = newObstacles;
  };

  const skipTutorial = () => {
    onGameOver({ 
        mode: 'TUTORIAL', playerScore: 0, winner: 'Player', level: 1, 
        maxRally: 0, opponentScore: 0, timestamp: '', totalHits: 0, earnedCurrency: 500 
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (mode === 'DOUBLE') createObstacles(1, levelRef.current);
    if (mode === 'SINGLE') spawnDataCores();
    resetBallPosition();

    sound.resume();
    sound.startBGM('GAME', 1.0);

    stars.current = Array.from({ length: 120 }, () => {
      const layer = Math.floor(Math.random() * 3);
      return {
        x: Math.random() * 350, y: Math.random() * 600,
        speed: 0.1 + layer * 0.2, size: 0.2 + layer * 0.5,
        opacity: 0.2 + Math.random() * 0.4, layer
      };
    });

    let animationFrameId: number;

    const runPhysicsStep = (dt: number) => {
      if (mode === 'TUTORIAL' && tutorialStep === 0) return;
      if (mode === 'TUTORIAL' && tutorialStep === 2) return;

      const baseLevelScale = mode === 'SINGLE' ? 0.12 : 0.08;
      const levelMultiplier = 1 + (levelRef.current - 1) * baseLevelScale;
      const waveMultiplier = 1 + (waveRef.current * 0.03);
      const rallyMultiplier = 1 + ((rallyRef.current % 20) * 0.02);
      
      let speedMod = 1.0;
      if (ballSlowTimer.current > Date.now()) speedMod = 0.6;
      else if (ballFastTimer.current > Date.now()) speedMod = 1.5;
      if (mode === 'TUTORIAL') speedMod = 0.7;
      
      const currentSpeed = (mode === 'SINGLE' ? 1.35 : 1.15) * levelMultiplier * waveMultiplier * rallyMultiplier * speedMod * timeScale.current * dt;

      ball.current.x += ball.current.vx * currentSpeed;
      ball.current.y += ball.current.vy * currentSpeed;

      // Wall Collision
      if (ball.current.x - ball.current.radius < 0) {
        ball.current.x = ball.current.radius;
        ball.current.vx = Math.abs(ball.current.vx);
        sound.playHit(330, 'sine');
      } else if (ball.current.x + ball.current.radius > canvas.width) {
        ball.current.x = canvas.width - ball.current.radius;
        ball.current.vx = -Math.abs(ball.current.vx);
        sound.playHit(330, 'sine');
      }

      // Drone Collision (Single Mode Only)
      if (mode === 'SINGLE') {
        drones.current.forEach(drone => {
          const dx = ball.current.x - (drone.centerX + Math.cos(drone.angle) * drone.orbitRadius);
          const dy = ball.current.y - (drone.centerY + Math.sin(drone.angle) * drone.orbitRadius);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < ball.current.radius + drone.radius) {
            const normalX = dx / dist;
            const normalY = dy / dist;
            const dot = ball.current.vx * normalX + ball.current.vy * normalY;
            ball.current.vx -= 2 * dot * normalX;
            ball.current.vy -= 2 * dot * normalY;
            
            // Deflection boost
            ball.current.vx *= 1.12;
            ball.current.vy *= 1.12;

            sound.playHit(150, 'sawtooth');
            createImpactParticles(ball.current.x, ball.current.y, drone.color, 12, 1.8);
            triggerShake(6);
            addFloatingText(ball.current.x, ball.current.y - 20, "INTERCEPTED", drone.color, 10);
          }
        });
      }

      // Single Mode Data Core Collision
      if (mode === 'SINGLE') {
        dataCores.current.forEach(core => {
          if (!core.active) return;
          const dx = ball.current.x - core.x;
          const dy = ball.current.y - core.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < ball.current.radius + core.radius) {
            
            // Check Shield Logic
            const hasShield = core.isShielded && dataCores.current.some(c => c.active && !c.isShielded);
            if (hasShield) {
               ball.current.vy = -ball.current.vy;
               ball.current.vx += (Math.random() - 0.5) * 4;
               sound.playHit(110, 'sine');
               addFloatingText(core.x, core.y, "LOCKED", "#60a5fa", 10);
               return;
            }

            core.active = false;
            const normalX = dx / dist;
            const normalY = dy / dist;
            const dot = ball.current.vx * normalX + ball.current.vy * normalY;
            ball.current.vx -= 2 * dot * normalX;
            ball.current.vy -= 2 * dot * normalY;
            
            const comboBonus = Math.floor(comboRef.current / 5) * 250;
            const baseGain = 500 * levelRef.current + (waveRef.current * 100) + comboBonus;
            scoreRef.current += baseGain;
            setScore(scoreRef.current);
            
            sound.playHit(770, 'square');
            createImpactParticles(core.x, core.y, core.color, 25, 2);
            triggerShake(10);
            addFloatingText(core.x, core.y, `CORE BREAK +${baseGain}`, core.color, 12);

            if (dataCores.current.filter(c => c.active).length === 0) {
              setCollectionFlash({ active: 0.5, color: '#10b981' });
              addFloatingText(175, 150, "WAVE SYNC COMPLETE", "#fff", 24);
              waveRef.current++;
              setTimeout(spawnDataCores, 800);
            }
          }
        });
      }

      // Top Collision
      if ((mode === 'SINGLE' || mode === 'TUTORIAL') && ball.current.y - ball.current.radius < 0) {
        ball.current.y = ball.current.radius;
        ball.current.vy = Math.abs(ball.current.vy);
        scoreRef.current += (50 * levelRef.current);
        setScore(scoreRef.current);
        sound.playHit(880, 'square');
        createImpactParticles(ball.current.x, ball.current.y, '#fde047', 12);
        rallyRef.current++; expRef.current++; setExp(expRef.current);
      } else if (mode === 'DOUBLE' && ball.current.vy < 0 &&
          ball.current.y - ball.current.radius < aiPaddle.current.y + aiPaddle.current.height &&
          ball.current.y + ball.current.radius > aiPaddle.current.y &&
          ball.current.x > aiPaddle.current.x &&
          ball.current.x < aiPaddle.current.x + aiPaddle.current.width) {
        ball.current.y = aiPaddle.current.y + aiPaddle.current.height + ball.current.radius;
        ball.current.vy = Math.abs(ball.current.vy);
        const hitPos = (ball.current.x - (aiPaddle.current.x + aiPaddle.current.width/2)) / (aiPaddle.current.width/2);
        ball.current.vx = (hitPos * 6.5) + (Math.random() - 0.5) * 3;
        sound.playHit(550, 'triangle');
        rallyRef.current++;
      }

      // Player Paddle Collision
      if (ball.current.vy > 0 &&
          ball.current.y + ball.current.radius > playerPaddle.current.y &&
          ball.current.y - ball.current.radius < playerPaddle.current.y + playerPaddle.current.height &&
          ball.current.x > playerPaddle.current.x &&
          ball.current.x < playerPaddle.current.x + playerPaddle.current.width) {
        
        ball.current.y = playerPaddle.current.y - ball.current.radius;
        ball.current.vy = -Math.abs(ball.current.vy);
        const powerMult = 1 + (playerStats.upgrades.powerLevel * 0.05);
        ball.current.vy *= powerMult;

        const paddleCenter = playerPaddle.current.x + playerPaddle.current.width / 2;
        const relativeHitPos = (ball.current.x - paddleCenter) / (playerPaddle.current.width / 2);
        const swipeInfluence = paddleVelocity.current * 0.45;
        const targetVx = (relativeHitPos * 8.5) + swipeInfluence + (ball.current.vx * 0.2);
        ball.current.vx = targetVx;
        
        const maxVx = Math.abs(ball.current.vy) * 1.6;
        if (Math.abs(ball.current.vx) > maxVx) ball.current.vx = Math.sign(ball.current.vx) * maxVx;

        paddleFlash.current = 1.0;
        comboRef.current++;
        
        if (Math.abs(relativeHitPos) < 0.12) {
          addFloatingText(ball.current.x, ball.current.y - 30, "MAX VOLTAGE!", "#10b981", 18);
          scoreRef.current += 500; sound.playHit(770, 'square'); triggerShake(15);
          createImpactParticles(ball.current.x, ball.current.y, "#fff", 20, 3, 1.3);
          ball.current.vy *= 1.15; 
        } else {
          sound.playHit(440, 'square'); triggerShake(7);
        }

        if (comboRef.current > 0 && comboRef.current % 10 === 0) {
          addFloatingText(canvas.width/2, canvas.height/2, `SPEED OVERDRIVE`, "#fbbf24", 28);
          sound.playLevelUp();
          triggerShake(20);
        }

        if (mode === 'TUTORIAL' && !hasHitBall.current) {
            hasHitBall.current = true;
            setTimeout(() => setTutorialStep(2), 500);
        }

        rallyRef.current++; expRef.current++; setExp(expRef.current);
        createImpactParticles(ball.current.x, ball.current.y, activeSkinData.color, 15);
        trailEffectTimer.current = Date.now() + 1500; 
      }

      // Obstacle Collision (Double Mode Only)
      obstacles.current.forEach(obs => {
        if (ball.current.y + ball.current.radius > obs.y &&
            ball.current.y - ball.current.radius < obs.y + obs.height &&
            ball.current.x > obs.x &&
            ball.current.x < obs.x + obs.width) {
          const fromAbove = ball.current.vy > 0 && ball.current.y < obs.y;
          if (fromAbove) {
             ball.current.y = obs.y - ball.current.radius; ball.current.vy = -Math.abs(ball.current.vy);
          } else {
             ball.current.y = obs.y + obs.height + ball.current.radius; ball.current.vy = Math.abs(ball.current.vy);
          }
          ball.current.vx += (Math.random() - 0.5) * 5;
          sound.playHit(220, 'sine'); createImpactParticles(ball.current.x, ball.current.y, obs.color, 25); triggerShake(5);
        }
      });
    };

    const update = () => {
      if (isPausedForDeath.current) { animationFrameId = requestAnimationFrame(update); return; }

      const statsSpeedMult = 0.55 + (playerStats.upgrades.speedLevel * 0.04);
      paddleVelocity.current = (targetX.current - playerPaddle.current.x); 
      
      const oldX = playerPaddle.current.x;
      playerPaddle.current.x += (targetX.current - playerPaddle.current.x) * Math.min(1.0, statsSpeedMult);
      
      if (mode === 'TUTORIAL' && tutorialStep === 0) {
          moveDistance.current += Math.abs(playerPaddle.current.x - oldX);
          if (moveDistance.current > 600) setTutorialStep(1);
      }

      let targetWidth = 80;
      if (paddleWideTimer.current > Date.now()) targetWidth = 110;
      else if (paddleNarrowTimer.current > Date.now()) targetWidth = 50;
      playerPaddle.current.width = targetWidth;

      const subSteps = 4;
      for (let i = 0; i < subSteps; i++) runPhysicsStep(1 / subSteps);

      if (shakeRef.current > 0) shakeRef.current -= 0.6;
      if (timeScale.current < 1.0) timeScale.current += 0.02;
      if (paddleFlash.current > 0) paddleFlash.current -= 0.05;
      if (paddleItemPulse.current > 0) paddleItemPulse.current -= 0.04;

      stars.current.forEach(s => {
        const speedBoost = 1 + (levelRef.current * 0.15);
        s.y += s.speed * speedBoost * 0.7;
        if (s.y > canvas.height) { s.y = -s.size; s.x = Math.random() * canvas.width; }
      });

      // Update Drones
      drones.current.forEach(d => {
        d.angle += d.speed;
      });

      if (trailEffectTimer.current > Date.now()) {
        ballTrail.current.push({ x: ball.current.x, y: ball.current.y });
        const maxTrail = mode === 'SINGLE' ? 30 : 20;
        if (ballTrail.current.length > maxTrail) ballTrail.current.shift();
      } else if (ballTrail.current.length > 0) ballTrail.current.shift();

      if (mode !== 'TUTORIAL' && expRef.current >= RALLY_TO_LEVEL) {
        expRef.current = 0; setExp(0); levelRef.current++; setLevel(levelRef.current);
        setShowLevelUp(true); scoreRef.current += 2000; setScore(scoreRef.current);
        sound.playLevelUp(); triggerShake(15);
        if (mode === 'DOUBLE') createObstacles(levelRef.current % 2 === 0 ? 2 : 1, levelRef.current);
        setTimeout(() => setShowLevelUp(false), 1000);
      }

      const now = Date.now();
      if (mode !== 'TUTORIAL' && now - lastItemSpawnTime.current > 6000 && activeItems.current.length < 3) {
        if (Math.random() < 0.06) {
          const types: ItemType[] = ['GROW', 'SLOW', 'SHIELD', 'NARROW', 'HURRY'];
          const type = types[Math.floor(Math.random() * types.length)];
          activeItems.current.push({
            x: Math.random() * (canvas.width - 25) + 12, y: -50, width: 25, height: 25,
            type, active: true, spawnTime: now, vy: 3.0
          });
          lastItemSpawnTime.current = now;
        }
      }

      activeItems.current.forEach(it => {
        it.y += it.vy;
        if (it.y + it.height > playerPaddle.current.y && 
            it.y < playerPaddle.current.y + playerPaddle.current.height &&
            it.x < playerPaddle.current.x + playerPaddle.current.width && 
            it.x + it.width > playerPaddle.current.x) {
          const color = ITEM_COLORS[it.type];
          setCollectionFlash({ active: 0.6, color });
          paddleItemPulse.current = 1.0;
          createImpactParticles(it.x + it.width/2, it.y + it.height/2, color, 30, 3, 1.2);
          triggerShake(8);
          if (it.type === 'GROW') { paddleWideTimer.current = now + 10000; paddleNarrowTimer.current = 0; addFloatingText(it.x, it.y, "PADDLE GROW", color, 14); sound.playCollect(); }
          if (it.type === 'SLOW') { ballSlowTimer.current = now + 8000; addFloatingText(it.x, it.y, "SLOW MOTION", color, 14); sound.playCollect(); }
          if (it.type === 'SHIELD') { shieldTimer.current = now + 15000; addFloatingText(it.x, it.y, "SHIELD UP", color, 14); sound.playCollect(); }
          if (it.type === 'NARROW') { paddleNarrowTimer.current = now + 8000; paddleWideTimer.current = 0; addFloatingText(it.x, it.y, "PADDLE SHRINK", color, 14); sound.playHit(110, 'sawtooth'); }
          if (it.type === 'HURRY') { ballFastTimer.current = now + 6000; addFloatingText(it.x, it.y, "HURRY UP", color, 14); sound.playHit(220, 'sawtooth'); }
          it.active = false;
        }
        if (it.y > canvas.height) it.active = false;
      });
      activeItems.current = activeItems.current.filter(it => it.active);

      if (mode === 'DOUBLE') {
        const aiSpeed = 0.12 + (levelRef.current * 0.04);
        const targetXPos = ball.current.x - aiPaddle.current.width/2;
        aiPaddle.current.x += (targetXPos - aiPaddle.current.x) * Math.min(aiSpeed, 0.7);
        aiPaddle.current.x = Math.max(0, Math.min(canvas.width - aiPaddle.current.width, aiPaddle.current.x));

        obstacles.current.forEach(obs => {
          obs.x += obs.vx * (1 + (levelRef.current * 0.1));
          if (obs.x <= 10 || obs.x + obs.width >= canvas.width - 10) obs.vx *= -1;
        });
      }

      if (ball.current.y > canvas.height) {
        if (shieldTimer.current > Date.now()) {
          ball.current.vy = -Math.abs(ball.current.vy); ball.current.y = canvas.height - ball.current.radius - 8;
          shieldTimer.current = 0; sound.playHit(330, 'sine'); triggerShake(15);
          addFloatingText(ball.current.x, ball.current.y - 40, "SHIELD BROKEN", "#a855f7", 14);
        } else {
          isPausedForDeath.current = true; setRedFlash(1.0); sound.playHit(110, 'sawtooth'); triggerShake(25);
          setTimeout(() => {
            isPausedForDeath.current = false; livesRef.current--; setLives(livesRef.current);
            if (livesRef.current <= 0) {
              onGameOver({ 
                playerScore: scoreRef.current, opponentScore: 0, totalHits: rallyRef.current, 
                winner: 'Opponent', maxRally: rallyRef.current, mode, level: levelRef.current,
                timestamp: new Date().toISOString(), earnedCurrency: 0
              });
            } else resetBallPosition();
          }, 150);
        }
      } else if (mode === 'DOUBLE' && ball.current.y < 0) {
        scoreRef.current += (1500 * levelRef.current); setScore(scoreRef.current);
        sound.playCollect(); addFloatingText(canvas.width/2, 120, "SCORE BURST", "#10b981", 32);
        createImpactParticles(ball.current.x, 0, '#10b981', 40, 4);
        resetBallPosition();
      }

      particles.current = particles.current.filter(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.03; return p.life > 0; });
      floatingTexts.current = floatingTexts.current.filter(ft => { ft.y -= 1.5; ft.life -= 0.015; return ft.life > 0; });
      if (redFlash > 0) setRedFlash(prev => Math.max(0, prev - 0.025));
      if (collectionFlash.active > 0) setCollectionFlash(prev => ({ ...prev, active: Math.max(0, prev.active - 0.05) }));

      draw();
      animationFrameId = requestAnimationFrame(update);
    };

    const draw = () => {
      ctx.save();
      if (shakeRef.current > 0) ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
      ctx.fillStyle = '#010411'; ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (redFlash > 0) { ctx.fillStyle = `rgba(244, 63, 94, ${redFlash * 0.8})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      if (collectionFlash.active > 0) {
        ctx.fillStyle = collectionFlash.color; ctx.globalAlpha = collectionFlash.active * 0.3;
        ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1.0;
      }

      stars.current.forEach(s => {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
      });

      // Render Drones
      if (mode === 'SINGLE') {
        drones.current.forEach(drone => {
          const dx = drone.centerX + Math.cos(drone.angle) * drone.orbitRadius;
          const dy = drone.centerY + Math.sin(drone.angle) * drone.orbitRadius;
          
          // Orbit line
          ctx.strokeStyle = `${drone.color}20`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(drone.centerX, drone.centerY, drone.orbitRadius, 0, Math.PI*2); ctx.stroke();
          
          ctx.shadowBlur = 15; ctx.shadowColor = drone.color; ctx.fillStyle = drone.color;
          ctx.beginPath(); ctx.arc(dx, dy, drone.radius, 0, Math.PI * 2); ctx.fill();
          
          // Laser eye
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(dx, dy, drone.radius * 0.4, 0, Math.PI*2); ctx.fill();
        });
      }

      // Render Data Cores (Single Mode Only)
      if (mode === 'SINGLE') {
        const anyActiveNormal = dataCores.current.some(c => c.active && !c.isShielded);
        dataCores.current.forEach(core => {
          if (!core.active) return;
          const isShielded = core.isShielded && anyActiveNormal;
          
          ctx.shadowBlur = isShielded ? 20 : 15; 
          ctx.shadowColor = isShielded ? '#60a5fa' : core.color; 
          ctx.fillStyle = isShielded ? '#1e293b' : core.color;
          
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const x = core.x + core.radius * Math.cos(angle);
            const y = core.y + core.radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath(); ctx.fill();
          
          if (isShielded) {
             ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.stroke();
             ctx.fillStyle = '#60a5fa'; ctx.font = 'bold 8px Orbitron'; ctx.textAlign = 'center';
             ctx.fillText("LOCKED", core.x, core.y + 3);
          } else {
             ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(core.x, core.y, core.radius * 0.5, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1.0;
          }
        });
      }

      obstacles.current.forEach(obs => {
        ctx.fillStyle = obs.color; ctx.shadowBlur = 15; ctx.shadowColor = obs.color;
        ctx.beginPath(); ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 4); ctx.fill();
      });

      ballTrail.current.forEach((pos, i) => {
        const alpha = (i / ballTrail.current.length) * 0.5;
        ctx.fillStyle = `${activeSkinData.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, ball.current.radius * (0.6 + i / ballTrail.current.length * 0.4), 0, Math.PI*2); ctx.fill();
      });

      ctx.shadowBlur = 15; ctx.shadowColor = activeSkinData.color; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ball.current.x, ball.current.y, ball.current.radius, 0, Math.PI*2); ctx.fill();

      activeItems.current.forEach(it => {
        const color = ITEM_COLORS[it.type];
        ctx.fillStyle = color; ctx.shadowBlur = 15; ctx.shadowColor = color;
        ctx.beginPath(); ctx.arc(it.x + it.width/2, it.y + it.height/2, it.width/2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 0; ctx.font = 'bold 12px Orbitron'; ctx.textAlign = 'center'; 
        ctx.fillText(it.type[0], it.x + it.width/2, it.y + it.height/2 + 4);
      });

      ctx.shadowBlur = 20 + paddleFlash.current * 20 + paddleItemPulse.current * 30;
      ctx.shadowColor = activeSkinData.color; ctx.fillStyle = activeSkinData.color;
      ctx.beginPath(); ctx.roundRect(playerPaddle.current.x, playerPaddle.current.y, playerPaddle.current.width, playerPaddle.current.height, 6); ctx.fill();
      
      if (paddleFlash.current > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${paddleFlash.current})`;
        ctx.beginPath(); ctx.roundRect(playerPaddle.current.x, playerPaddle.current.y, playerPaddle.current.width, playerPaddle.current.height, 6); ctx.fill();
      }

      if (shieldTimer.current > Date.now()) {
        ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 3; ctx.shadowBlur = 10; ctx.shadowColor = '#a855f7';
        ctx.beginPath(); ctx.roundRect(playerPaddle.current.x - 5, playerPaddle.current.y - 5, playerPaddle.current.width + 10, playerPaddle.current.height + 10, 8); ctx.stroke();
      }

      if (mode === 'DOUBLE') {
        ctx.shadowBlur = 20; ctx.shadowColor = '#f43f5e'; ctx.fillStyle = '#f43f5e';
        ctx.beginPath(); ctx.roundRect(aiPaddle.current.x, aiPaddle.current.y, aiPaddle.current.width, aiPaddle.current.height, 6); ctx.fill();
      }

      floatingTexts.current.forEach(ft => {
        ctx.fillStyle = ft.color; ctx.globalAlpha = ft.life; ctx.font = `bold ${ft.size || 16}px Pretendard, Orbitron`; ctx.textAlign = 'center'; ctx.fillText(ft.text, ft.x, ft.y);
      });

      particles.current.forEach(p => { 
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
      });

      if (comboRef.current > 0) {
        ctx.globalAlpha = Math.min(1.0, comboRef.current * 0.1);
        ctx.fillStyle = '#fff'; ctx.font = 'black 14px Orbitron'; ctx.textAlign = 'left';
        ctx.fillText(`COMBO ${comboRef.current}`, 20, canvas.height - 20);
        ctx.globalAlpha = 1.0;
      }
      ctx.restore();
    };

    const handleInput = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const x = (clientX - rect.left) * scaleX;
      targetX.current = Math.max(0, Math.min(canvas.width - playerPaddle.current.width, x - playerPaddle.current.width / 2));
    };

    const onTouch = (e: TouchEvent) => { 
      if (e.touches.length > 0) {
        handleInput(e.touches[0].clientX);
      }
      if (e.cancelable) e.preventDefault(); 
    };
    
    window.addEventListener('mousemove', (e) => handleInput(e.clientX));
    window.addEventListener('touchstart', onTouch, { passive: false });
    window.addEventListener('touchmove', onTouch, { passive: false });
    animationFrameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', (e) => handleInput(e.clientX));
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('touchmove', onTouch);
      sound.stopBGM();
    };
  }, [mode, playerStats, activeSkinData, tutorialStep]);

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4 bg-[#010409]">
      <div className="game-container rounded-[32px] overflow-hidden border border-white/5 bg-[#010411]">
        {mode !== 'TUTORIAL' && (
          <div className="absolute top-[calc(env(safe-area-inset-top)+2.5rem)] left-0 right-0 flex justify-between px-6 z-30 pointer-events-none">
            <button onClick={onHome} className="w-12 h-12 glass-card rounded-2xl flex items-center justify-center border border-white/10 pointer-events-auto active:scale-90 transition-all shadow-lg">🏠</button>
            <div className="flex flex-col items-center">
              <div className="flex gap-1.5">
                {[...Array(3)].map((_, i) => (
                  <span key={i} className={`text-xl transition-all duration-500 ${i < lives ? 'opacity-100 scale-110 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]' : 'opacity-10 grayscale scale-75'}`}>❤️</span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-orbitron text-slate-500 tracking-[0.2em] uppercase mb-0.5">SCORE</div>
              <div className="text-2xl font-orbitron font-black text-white">{score.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Tutorial Overlay */}
        {mode === 'TUTORIAL' && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-8 bg-black/40 backdrop-blur-[2px] pointer-events-none">
            <button 
                onClick={skipTutorial}
                className="absolute top-[calc(env(safe-area-inset-top)+1.5rem)] right-6 glass-card px-4 py-2 rounded-xl border-emerald-500/20 text-[10px] font-orbitron font-black text-emerald-400 pointer-events-auto active:scale-95"
            >
                {"건너뛰기 >>"}
            </button>
            
            <div className="glass-card p-8 rounded-[40px] border-emerald-500/30 text-center max-w-[280px] pointer-events-auto">
                <div className="text-emerald-400 font-orbitron text-[10px] tracking-widest font-black mb-4">NEURAL_LINK :: ESTABLISHING</div>
                
                {tutorialStep === 0 && (
                    <div className="animate-in fade-in zoom-in duration-500">
                        <p className="text-white font-bold text-lg leading-tight mb-6">Master, connection established. Move the paddle to sync with the neural link.</p>
                        <div className="flex justify-center gap-4">
                            <div className="w-12 h-1 bg-emerald-500/20 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 animate-[progress_2s_linear_infinite]" style={{ width: `${Math.min(100, (moveDistance.current / 600) * 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                )}

                {tutorialStep === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom duration-500">
                        <p className="text-white font-bold text-lg leading-tight mb-4">Sync complete. Now hit the ball. Aim for the center of the paddle for critical impact.</p>
                        <div className="w-16 h-16 border-2 border-emerald-500 rounded-full mx-auto animate-ping opacity-30"></div>
                    </div>
                )}

                {tutorialStep === 2 && (
                    <div className="animate-in fade-in slide-in-from-bottom duration-500">
                        <div className="text-cyan-400 font-orbitron text-[10px] tracking-widest font-black mb-2">SYSTEM_UPDATE :: DATA_LINK</div>
                        <p className="text-white font-bold text-base leading-snug mb-6">Collect field items to trigger special abilities like paddle growth and time slow.</p>
                        <div className="grid grid-cols-2 gap-2 mb-6">
                            <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                                <span className="text-xl">🟡</span>
                                <p className="text-[8px] mt-1 text-slate-400">GROW</p>
                            </div>
                            <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                                <span className="text-xl">🔵</span>
                                <p className="text-[8px] mt-1 text-slate-400">SLOW</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setTutorialStep(3)}
                            className="w-full py-3 bg-emerald-500 text-black font-orbitron font-black rounded-2xl active:scale-95 transition-all"
                        >
                            UNDERSTOOD
                        </button>
                    </div>
                )}

                {tutorialStep === 3 && (
                    <div className="animate-in fade-in zoom-in duration-500">
                        <p className="text-white font-bold text-lg leading-tight mb-6">Systems ready. Enter the arena and prove your neural superiority.</p>
                        <button 
                            onClick={() => onGameOver({ mode: 'TUTORIAL', playerScore: 0, winner: 'Player', level: 1, maxRally: 0, opponentScore: 0, timestamp: '', totalHits: 0, earnedCurrency: 500 })}
                            className="w-full py-4 bg-emerald-500 text-black font-orbitron font-black rounded-2xl active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                        >
                            ENTER ARENA
                        </button>
                    </div>
                )}
            </div>
          </div>
        )}
        <canvas ref={canvasRef} width={350} height={600} className="w-full h-full block" />
      </div>
    </div>
  );
};

export default GameEngine;
