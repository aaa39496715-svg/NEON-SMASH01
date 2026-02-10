

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text3D, Center } from '@react-three/drei';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../../store';
import { GameObject, ObjectType, LANE_WIDTH, SPAWN_DISTANCE, REMOVE_DISTANCE, GameStatus, GEMINI_COLORS } from '../../types';
import { audio } from '../System/Audio';

// Geometry Constants
const CAR_CHASSIS_GEO = new THREE.BoxGeometry(1.5, 0.4, 2.2);
const CAR_CABIN_GEO = new THREE.BoxGeometry(1.1, 0.5, 1.0);
const CAR_ROOF_GEO = new THREE.BoxGeometry(1.1, 0.05, 1.05);
const CAR_WINDOW_GEO = new THREE.BoxGeometry(1.05, 0.4, 0.85);
const CAR_BUMPER_GEO = new THREE.BoxGeometry(1.55, 0.15, 0.2);
const CAR_GRILLE_GEO = new THREE.BoxGeometry(0.8, 0.25, 0.1);
const CAR_WHEEL_GEO = new THREE.BoxGeometry(0.35, 0.4, 0.4);
const CAR_LIGHT_GEO = new THREE.BoxGeometry(0.25, 0.2, 0.1);

const GEM_GEOMETRY = new THREE.IcosahedronGeometry(0.3, 0);
const ALIEN_BODY_GEO = new THREE.CylinderGeometry(0.6, 0.3, 0.3, 8);
const ALIEN_DOME_GEO = new THREE.SphereGeometry(0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
const MISSILE_CORE_GEO = new THREE.CylinderGeometry(0.08, 0.08, 3.0, 8);

const SHADOW_LETTER_GEO = new THREE.PlaneGeometry(2, 0.6);
const SHADOW_GEM_GEO = new THREE.CircleGeometry(0.6, 32);
const SHADOW_ALIEN_GEO = new THREE.CircleGeometry(0.8, 32);
const SHADOW_MISSILE_GEO = new THREE.PlaneGeometry(0.15, 3);
const SHADOW_CAR_GEO = new THREE.PlaneGeometry(1.7, 2.4);
const SHADOW_DEFAULT_GEO = new THREE.CircleGeometry(0.8, 6);

const SHOP_FRAME_GEO = new THREE.BoxGeometry(1, 7, 1);
const SHOP_BACK_GEO = new THREE.BoxGeometry(1, 5, 1.2);
const SHOP_FLOOR_GEO = new THREE.PlaneGeometry(1, 4);

const PARTICLE_COUNT = 600;
const BASE_LETTER_INTERVAL = 350; // 난이도 상향: 380 -> 350

const getLetterInterval = (level: number) => {
    return BASE_LETTER_INTERVAL * Math.pow(1.3, Math.max(0, level - 1));
};

const MISSILE_SPEED = 45; 
const FONT_URL = "https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_bold.typeface.json";

const ParticleSystem: React.FC = () => {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    const particles = useMemo(() => new Array(PARTICLE_COUNT).fill(0).map(() => ({
        life: 0,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        color: new THREE.Color()
    })), []);

    useEffect(() => {
        const handleExplosion = (e: CustomEvent) => {
            const { position, color } = e.detail;
            let spawned = 0;
            const burstAmount = 40; 

            for(let i = 0; i < PARTICLE_COUNT; i++) {
                const p = particles[i];
                if (p.life <= 0) {
                    p.life = 1.0 + Math.random() * 0.5; 
                    p.pos.set(position[0], position[1], position[2]);
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    const speed = 2 + Math.random() * 10;
                    p.vel.set(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi)).multiplyScalar(speed);
                    p.rot.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                    p.rotVel.set(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).multiplyScalar(5);
                    p.color.set(color);
                    spawned++;
                    if (spawned >= burstAmount) break;
                }
            }
        };
        window.addEventListener('particle-burst', handleExplosion as any);
        return () => window.removeEventListener('particle-burst', handleExplosion as any);
    }, [particles]);

    useFrame((state, delta) => {
        if (!mesh.current) return;
        const safeDelta = Math.min(delta, 0.1);
        particles.forEach((p, i) => {
            if (p.life > 0) {
                p.life -= safeDelta * 1.5;
                p.pos.addScaledVector(p.vel, safeDelta);
                p.vel.y -= safeDelta * 5; 
                p.vel.multiplyScalar(0.98);
                p.rot.x += p.rotVel.x * safeDelta;
                p.rot.y += p.rotVel.y * safeDelta;
                dummy.position.copy(p.pos);
                const scale = Math.max(0, p.life * 0.25);
                dummy.scale.set(scale, scale, scale);
                dummy.rotation.set(p.rot.x, p.rot.y, p.rot.z);
                dummy.updateMatrix();
                mesh.current!.setMatrixAt(i, dummy.matrix);
                mesh.current!.setColorAt(i, p.color);
            } else {
                dummy.scale.set(0,0,0);
                dummy.updateMatrix();
                mesh.current!.setMatrixAt(i, dummy.matrix);
            }
        });
        mesh.current.instanceMatrix.needsUpdate = true;
        if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, PARTICLE_COUNT]}>
            <octahedronGeometry args={[0.5, 0]} />
            <meshBasicMaterial toneMapped={false} transparent opacity={0.9} />
        </instancedMesh>
    );
};

const getRandomLane = (laneCount: number) => {
    const half = Math.floor(laneCount / 2);
    return Math.floor(Math.random() * (half * 2 + 1)) - half;
};

interface SpawnPattern {
    type: ObjectType;
    lane: number;
    delay: number;
}

export const LevelManager: React.FC = () => {
  const { status, speed, collectGem, collectLetter, collectedLetters, laneCount, setDistance, openShop, level, takeDamage, isLevelTransition } = useStore();
  
  const objectsRef = useRef<GameObject[]>([]);
  const patternQueue = useRef<SpawnPattern[]>([]);
  const [, setRenderTrigger] = useState(0);
  const prevStatus = useRef(status);
  const prevLevel = useRef(level);

  const playerObjRef = useRef<THREE.Object3D | null>(null);
  const distanceTraveled = useRef(0);
  const nextLetterDistance = useRef(BASE_LETTER_INTERVAL);

  useEffect(() => {
    const isRestart = status === GameStatus.PLAYING && prevStatus.current === GameStatus.GAME_OVER;
    const isMenuReset = status === GameStatus.MENU;
    const isLevelUp = level !== prevLevel.current && status === GameStatus.PLAYING;
    const isVictoryReset = status === GameStatus.PLAYING && prevStatus.current === GameStatus.VICTORY;

    if (isMenuReset || isRestart || isVictoryReset) {
        objectsRef.current = [];
        patternQueue.current = [];
        setRenderTrigger(t => t + 1);
        distanceTraveled.current = 0;
        nextLetterDistance.current = getLetterInterval(1);
    } else if (isLevelUp && level > 1) {
        objectsRef.current = objectsRef.current.filter(obj => obj.position[2] > -80);
        objectsRef.current.push({
            id: uuidv4(),
            type: ObjectType.SHOP_PORTAL,
            position: [0, 0, -120], 
            active: true,
        });
        nextLetterDistance.current = distanceTraveled.current - SPAWN_DISTANCE + getLetterInterval(level);
        setRenderTrigger(t => t + 1);
    }
    prevStatus.current = status;
    prevLevel.current = level;
  }, [status, level, setDistance]);

  useFrame((state) => {
      if (!playerObjRef.current) {
          const group = state.scene.getObjectByName('PlayerGroup');
          if (group && group.children.length > 0) playerObjRef.current = group.children[0];
      }
  });

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING) return;
    const safeDelta = Math.min(delta, 0.05); 
    const dist = speed * safeDelta;
    distanceTraveled.current += dist;

    let hasChanges = false;
    let playerPos = new THREE.Vector3(0, 0, 0);
    if (playerObjRef.current) playerObjRef.current.getWorldPosition(playerPos);

    const keptObjects: GameObject[] = [];
    const newSpawns: GameObject[] = [];

    for (const obj of objectsRef.current) {
        let moveAmount = dist;
        if (obj.type === ObjectType.MISSILE) moveAmount += MISSILE_SPEED * safeDelta;
        obj.position[2] += moveAmount;
        
        if (obj.type === ObjectType.ALIEN && obj.active && !obj.hasFired) {
             if (obj.position[2] > -100) {
                 obj.hasFired = true;
                 newSpawns.push({ id: uuidv4(), type: ObjectType.MISSILE, position: [obj.position[0], 1.0, obj.position[2] + 2], active: true, color: '#ff0000' });
                 hasChanges = true;
                 window.dispatchEvent(new CustomEvent('particle-burst', { detail: { position: obj.position, color: '#ff00ff' } }));
             }
        }

        let keep = true;
        if (obj.active) {
            const inZZone = (obj.position[2] > playerPos.z - 1.4) && (obj.position[2] < playerPos.z + 1.4);
            if (obj.type === ObjectType.SHOP_PORTAL) {
                if (Math.abs(obj.position[2] - playerPos.z) < 2.5) { 
                     openShop();
                     obj.active = false;
                     hasChanges = true;
                     keep = false; 
                }
            } else if (inZZone) {
                if (Math.abs(obj.position[0] - playerPos.x) < 1.0) { 
                     const isDamage = obj.type === ObjectType.OBSTACLE || obj.type === ObjectType.ALIEN || obj.type === ObjectType.MISSILE;
                     if (isDamage) {
                         const objTop = obj.type === ObjectType.OBSTACLE ? 1.1 : (obj.type === ObjectType.MISSILE ? 1.5 : 2.1);
                         const isHit = (playerPos.y < objTop) && (playerPos.y + 1.4 > (obj.type === ObjectType.MISSILE ? 0.5 : 0));
                         if (isHit) { 
                             takeDamage();
                             audio.playDamage();
                             obj.active = false; 
                             hasChanges = true;
                             window.dispatchEvent(new CustomEvent('particle-burst', { detail: { position: obj.position, color: '#ff4400' } }));
                         }
                     } else {
                         if (Math.abs(obj.position[1] - (playerPos.y + 0.8)) < 1.9) { 
                            if (obj.type === ObjectType.GEM) { collectGem(obj.points || 50); audio.playGemCollect(); }
                            else if (obj.type === ObjectType.LETTER && obj.targetIndex !== undefined) { collectLetter(obj.targetIndex); audio.playLetterCollect(); }
                            window.dispatchEvent(new CustomEvent('particle-burst', { detail: { position: obj.position, color: obj.color || '#ffffff' } }));
                            obj.active = false;
                            hasChanges = true;
                         }
                     }
                }
            }
        }
        if (obj.position[2] > REMOVE_DISTANCE) { keep = false; hasChanges = true; }
        if (keep) keptObjects.push(obj);
    }

    if (newSpawns.length > 0) keptObjects.push(...newSpawns);

    let furthestZ = 0;
    const staticObjects = keptObjects.filter(o => o.type !== ObjectType.MISSILE);
    furthestZ = staticObjects.length > 0 ? Math.min(...staticObjects.map(o => o.position[2])) : -20;

    if (furthestZ > -SPAWN_DISTANCE && !isLevelTransition) {
         const baseGap = Math.max(10, 18 - level); // 난이도 상향: 레벨에 따라 간격 감소
         
         if (distanceTraveled.current >= nextLetterDistance.current) {
             const lane = getRandomLane(laneCount);
             const target = ['B','O','N','U','S'];
             const availableIndices = target.map((_, i) => i).filter(i => !collectedLetters.includes(i));
             if (availableIndices.length > 0) {
                 const chosenIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
                 keptObjects.push({ id: uuidv4(), type: ObjectType.LETTER, position: [lane * LANE_WIDTH, 1.0, furthestZ - baseGap], active: true, color: GEMINI_COLORS[chosenIndex], value: target[chosenIndex], targetIndex: chosenIndex });
                 nextLetterDistance.current += getLetterInterval(level);
                 hasChanges = true;
             }
         } else if (patternQueue.current.length > 0) {
             const pattern = patternQueue.current.shift()!;
             keptObjects.push({
                 id: uuidv4(),
                 type: pattern.type,
                 position: [pattern.lane * LANE_WIDTH, pattern.type === ObjectType.OBSTACLE ? 0.4 : 1.2, furthestZ - (baseGap * pattern.delay)],
                 active: true,
                 color: pattern.type === ObjectType.OBSTACLE ? ['#ff1744','#2979ff','#00e676','#ffea00','#d500f9'][Math.floor(Math.random()*5)] : '#00ffff',
                 points: 50
             });
             hasChanges = true;
         } else { 
            const rand = Math.random();
            const spawnZ = furthestZ - baseGap;
            const half = Math.floor(laneCount / 2);

            if (level === 1) {
                // 레벨 1 전용 배치 패턴 강화
                if (rand < 0.2) {
                    // 터널형 배치 (좌우 차량, 중앙 젬)
                    keptObjects.push({ id: uuidv4(), type: ObjectType.OBSTACLE, position: [-half * LANE_WIDTH, 0.4, spawnZ], active: true, color: '#ffea00' });
                    keptObjects.push({ id: uuidv4(), type: ObjectType.OBSTACLE, position: [half * LANE_WIDTH, 0.4, spawnZ], active: true, color: '#ffea00' });
                    patternQueue.current.push({ type: ObjectType.GEM, lane: 0, delay: 0.5 });
                } else if (rand < 0.45) {
                    // 슬라롬 패턴 (지그재그 차량)
                    patternQueue.current.push(
                        { type: ObjectType.OBSTACLE, lane: -1, delay: 1 },
                        { type: ObjectType.GEM, lane: 1, delay: 1.5 },
                        { type: ObjectType.OBSTACLE, lane: 1, delay: 2.5 },
                        { type: ObjectType.GEM, lane: -1, delay: 3 }
                    );
                } else if (rand < 0.7) {
                    // 젬 유도선 (S자 경로)
                    patternQueue.current.push(
                        { type: ObjectType.GEM, lane: -1, delay: 0.8 },
                        { type: ObjectType.GEM, lane: 0, delay: 1.3 },
                        { type: ObjectType.GEM, lane: 1, delay: 1.8 },
                        { type: ObjectType.OBSTACLE, lane: -1, delay: 2.5 }
                    );
                } else {
                    // 기본 랜덤 배치
                    const l = getRandomLane(laneCount);
                    keptObjects.push({ id: uuidv4(), type: ObjectType.OBSTACLE, position: [l * LANE_WIDTH, 0.4, spawnZ], active: true, color: '#00e676' });
                }
            } else {
                // 고레벨 기존 로직 (확률 조정으로 난이도 상향)
                if (rand < 0.2) { 
                    patternQueue.current.push(
                        { type: ObjectType.OBSTACLE, lane: -half, delay: 1 },
                        { type: ObjectType.OBSTACLE, lane: half, delay: 1 },
                        { type: ObjectType.OBSTACLE, lane: -half + 1, delay: 1.5 },
                        { type: ObjectType.OBSTACLE, lane: half - 1, delay: 1.5 }
                    );
                } else if (rand < 0.35) { 
                    patternQueue.current.push(
                        { type: ObjectType.GEM, lane: half, delay: 1 },
                        { type: ObjectType.GEM, lane: -half, delay: 1.2 },
                        { type: ObjectType.GEM, lane: 0, delay: 1.6 }
                    );
                } else if (rand < 0.75) { // 난이도 상향: 벽 패턴 확률 증가 (0.7 -> 0.75)
                    const skipLanes: number[] = [];
                    const requiredSkips = laneCount <= 3 ? 1 : 2;
                    while(skipLanes.length < requiredSkips) {
                        let l = getRandomLane(laneCount);
                        if (!skipLanes.includes(l)) skipLanes.push(l);
                    }
                    for(let l = -half; l <= half; l++) {
                        if (!skipLanes.includes(l)) keptObjects.push({ id: uuidv4(), type: ObjectType.OBSTACLE, position: [l * LANE_WIDTH, 0.4, spawnZ], active: true, color: '#ffea00' });
                    }
                    patternQueue.current.push({ type: ObjectType.GEM, lane: skipLanes[0], delay: 2.8 }); 
                } else { 
                    const lane = getRandomLane(laneCount);
                    const spawnAlien = level >= 2 && Math.random() < 0.35; // 난이도 상향: 외계인 등장 확률 증가 (0.2 -> 0.35)
                    keptObjects.push({
                        id: uuidv4(),
                        type: spawnAlien ? ObjectType.ALIEN : (Math.random() > 0.3 ? ObjectType.OBSTACLE : ObjectType.GEM),
                        position: [lane * LANE_WIDTH, spawnAlien ? 1.5 : (Math.random() > 0.3 ? 0.4 : 1.2), spawnZ],
                        active: true,
                        color: spawnAlien ? '#00ff00' : (Math.random() > 0.3 ? ['#ff1744','#2979ff','#00e676','#ffea00','#d500f9'][Math.floor(Math.random()*5)] : '#00ffff'),
                        hasFired: false
                    });
                }
            }
            hasChanges = true;
         }
    }

    if (hasChanges) {
        objectsRef.current = keptObjects;
        setRenderTrigger(t => t + 1);
    }
  });

  return (
    <group>
      <ParticleSystem />
      {objectsRef.current.map(obj => obj.active && <GameEntity key={obj.id} data={obj} />)}
    </group>
  );
};

const GameEntity: React.FC<{ data: GameObject }> = React.memo(({ data }) => {
    const groupRef = useRef<THREE.Group>(null);
    const visualRef = useRef<THREE.Group>(null);
    const wheelsRef = useRef<THREE.Group[]>([]);
    const shadowRef = useRef<THREE.Mesh>(null);
    
    useFrame((state, delta) => {
        if (groupRef.current) groupRef.current.position.set(data.position[0], 0, data.position[2]);
        if (visualRef.current) {
            const baseHeight = data.position[1];
            if (data.type === ObjectType.SHOP_PORTAL) {
                 visualRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.02);
            } else if (data.type === ObjectType.MISSILE) {
                 visualRef.current.rotation.z += delta * 20; 
                 visualRef.current.position.y = baseHeight;
            } else if (data.type === ObjectType.ALIEN) {
                 visualRef.current.position.y = baseHeight + Math.sin(state.clock.elapsedTime * 3) * 0.2;
                 visualRef.current.rotation.y += delta;
            } else if (data.type === ObjectType.OBSTACLE) {
                visualRef.current.position.y = baseHeight + Math.sin(state.clock.elapsedTime * 18) * 0.015;
                wheelsRef.current.forEach(w => w && (w.rotation.x += delta * 18));
            } else {
                visualRef.current.rotation.y += delta * 3;
                const bob = Math.sin(state.clock.elapsedTime * 4 + data.position[0]) * 0.1;
                visualRef.current.position.y = baseHeight + bob;
                if (shadowRef.current) shadowRef.current.scale.setScalar(1 - bob);
            }
        }
    });

    const shadowGeo = useMemo(() => {
        if (data.type === ObjectType.LETTER) return SHADOW_LETTER_GEO;
        if (data.type === ObjectType.GEM) return SHADOW_GEM_GEO;
        if (data.type === ObjectType.OBSTACLE) return SHADOW_CAR_GEO;
        if (data.type === ObjectType.ALIEN) return SHADOW_ALIEN_GEO;
        if (data.type === ObjectType.MISSILE) return SHADOW_MISSILE_GEO;
        return SHADOW_DEFAULT_GEO; 
    }, [data.type]);

    return (
        <group ref={groupRef}>
            {data.type !== ObjectType.SHOP_PORTAL && (
                <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} geometry={shadowGeo}>
                    <meshBasicMaterial color="#000000" opacity={0.3} transparent />
                </mesh>
            )}

            <group ref={visualRef} position={[0, data.position[1], 0]}>
                {data.type === ObjectType.OBSTACLE && (
                    <group>
                        <mesh geometry={CAR_CHASSIS_GEO} castShadow receiveShadow>
                            <meshStandardMaterial color={data.color} roughness={1} metalness={0} />
                        </mesh>
                        <mesh position={[0, 0.45, -0.1]} geometry={CAR_CABIN_GEO} castShadow>
                             <meshStandardMaterial color={data.color} roughness={1} />
                        </mesh>
                        <mesh position={[0, 0.45, -0.1]} geometry={CAR_WINDOW_GEO}>
                             <meshStandardMaterial color="#88ccff" transparent opacity={0.6} metalness={0.5} roughness={0.1} />
                        </mesh>
                        <mesh position={[0, 0.7, -0.1]} geometry={CAR_ROOF_GEO}>
                             <meshStandardMaterial color={data.color} roughness={1} />
                        </mesh>
                        <mesh position={[0, -0.1, 1.1]} geometry={CAR_BUMPER_GEO}>
                             <meshStandardMaterial color="#444444" roughness={0.8} />
                        </mesh>
                        <mesh position={[0, -0.1, -1.1]} geometry={CAR_BUMPER_GEO}>
                             <meshStandardMaterial color="#444444" roughness={0.8} />
                        </mesh>
                        <mesh position={[0, 0, 1.11]} geometry={CAR_GRILLE_GEO}>
                             <meshStandardMaterial color="#222222" roughness={0.9} />
                        </mesh>
                        {[[-0.65,-0.2,0.75],[0.65,-0.2,0.75],[-0.65,-0.2,-0.75],[0.65,-0.2,-0.75]].map((pos, i) => (
                             <group key={i} position={pos as [number, number, number]} ref={el => wheelsRef.current[i] = el!}>
                                 <mesh geometry={CAR_WHEEL_GEO}><meshBasicMaterial color="#1a1a1a" /></mesh>
                             </group>
                        ))}
                        <mesh position={[0.5, 0, 1.11]} geometry={CAR_LIGHT_GEO}>
                             <meshStandardMaterial color="#ffffff" emissive="#ffffaa" emissiveIntensity={5} toneMapped={false} />
                        </mesh>
                        <mesh position={[-0.5, 0, 1.11]} geometry={CAR_LIGHT_GEO}>
                             <meshStandardMaterial color="#ffffff" emissive="#ffffaa" emissiveIntensity={5} toneMapped={false} />
                        </mesh>
                        <mesh position={[0.5, 0, -1.11]} geometry={CAR_LIGHT_GEO}>
                             <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={3} toneMapped={false} />
                        </mesh>
                        <mesh position={[-0.5, 0, -1.11]} geometry={CAR_LIGHT_GEO}>
                             <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={3} toneMapped={false} />
                        </mesh>
                    </group>
                )}

                {data.type === ObjectType.SHOP_PORTAL && (
                    <group>
                         <mesh position={[0, 3, 0]} geometry={SHOP_FRAME_GEO} scale={[50, 1, 1]}>
                             <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.2} />
                         </mesh>
                         <mesh position={[0, 2, 0]} geometry={SHOP_BACK_GEO} scale={[48, 1, 1]}>
                              <meshBasicMaterial color="#000000" />
                         </mesh>
                         <Center position={[0, 5, 0.6]}>
                             <Text3D font={FONT_URL} size={1.2} height={0.2}>
                                 SHOP
                                 <meshBasicMaterial color="#ffff00" />
                             </Text3D>
                         </Center>
                         <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]} geometry={SHOP_FLOOR_GEO} scale={[48, 1, 1]}>
                             <meshBasicMaterial color="#00ffff" transparent opacity={0.3} />
                         </mesh>
                    </group>
                )}

                {data.type === ObjectType.ALIEN && (
                    <group>
                        <mesh castShadow geometry={ALIEN_BODY_GEO}><meshStandardMaterial color="#4400cc" /></mesh>
                        <mesh position={[0, 0.2, 0]} geometry={ALIEN_DOME_GEO}><meshStandardMaterial color="#00ff00" transparent opacity={0.8} /></mesh>
                    </group>
                )}

                {data.type === ObjectType.MISSILE && (
                    <group rotation={[Math.PI / 2, 0, 0]}>
                        <mesh geometry={MISSILE_CORE_GEO}><meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={4} /></mesh>
                    </group>
                )}

                {data.type === ObjectType.GEM && (
                    <mesh castShadow geometry={GEM_GEOMETRY}><meshStandardMaterial color={data.color} roughness={0} metalness={1} emissive={data.color} emissiveIntensity={2} /></mesh>
                )}

                {data.type === ObjectType.LETTER && (
                    <group scale={[1.5, 1.5, 1.5]}>
                         <Center>
                             <Text3D font={FONT_URL} size={0.8} height={0.5} bevelEnabled bevelThickness={0.02} bevelSize={0.02} bevelSegments={5}>
                                {data.value}
                                <meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={1.5} />
                             </Text3D>
                         </Center>
                    </group>
                )}
            </group>
        </group>
    );
});