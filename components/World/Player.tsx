

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { LANE_WIDTH, GameStatus, JUMP_HEIGHT, JUMP_DURATION } from '../../types';
import { audio } from '../System/Audio';

const GRAVITY = (8 * JUMP_HEIGHT) / Math.pow(JUMP_DURATION, 2);
const JUMP_FORCE = (4 * JUMP_HEIGHT) / JUMP_DURATION;

const WHEEL_GEO = new THREE.BoxGeometry(0.35, 0.4, 0.4);
const HUBCAP_GEO = new THREE.BoxGeometry(0.08, 0.25, 0.25);
const LIGHT_GEO = new THREE.BoxGeometry(0.25, 0.12, 0.1);
const TAIL_LIGHT_GEO = new THREE.BoxGeometry(0.35, 0.08, 0.1);
const UNDERGLOW_GEO = new THREE.PlaneGeometry(1.4, 2.5);
const SHADOW_GEO = new THREE.PlaneGeometry(1.6, 2.8);

const MUSCLE_BODY = new THREE.BoxGeometry(1.3, 0.5, 2.8);
const MUSCLE_HOOD = new THREE.BoxGeometry(0.8, 0.15, 1.2);
const MUSCLE_ROOF = new THREE.BoxGeometry(1.1, 0.4, 1.0);
const MUSCLE_SPOILER = new THREE.BoxGeometry(1.4, 0.05, 0.4);
const AERO_BODY = new THREE.BoxGeometry(0.6, 0.15, 3.2);
const AERO_WING_FRONT = new THREE.BoxGeometry(1.8, 0.05, 0.4);
const AERO_WING_REAR = new THREE.BoxGeometry(1.9, 0.05, 0.6);
const AERO_COCKPIT = new THREE.SphereGeometry(0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
const STREAK_BODY = new THREE.BoxGeometry(1.2, 0.4, 2.4);
const STREAK_CABIN = new THREE.BoxGeometry(0.9, 0.4, 0.9);
const STREAK_WINDOW = new THREE.BoxGeometry(0.95, 0.3, 0.75);
const TRUNK_BODY = new THREE.BoxGeometry(1.4, 0.8, 2.6);
const TRUNK_ROOF = new THREE.BoxGeometry(1.3, 0.1, 2.5);
const TRUNK_GRILLE = new THREE.BoxGeometry(1.2, 0.4, 0.1);
const BLADE_BODY = new THREE.BoxGeometry(1.7, 0.2, 3.0); 
const BLADE_CABIN = new THREE.BoxGeometry(1.0, 0.25, 1.4);
const BLADE_WING = new THREE.BoxGeometry(2.0, 0.05, 0.6);
const BLADE_STRIPE_GEO = new THREE.PlaneGeometry(0.15, 3.0);
const VOID_BODY = new THREE.BoxGeometry(1.0, 0.3, 2.0);
const VOID_FIN = new THREE.BoxGeometry(0.1, 0.6, 0.8);

const SHADOW_BODY_MAIN = new THREE.BoxGeometry(1.6, 0.3, 2.5);
const SHADOW_CANOPY = new THREE.BoxGeometry(0.6, 0.3, 1.2);
const SHADOW_INLET = new THREE.BoxGeometry(0.4, 0.1, 0.6);
const RETRO_BODY_MAIN = new THREE.CylinderGeometry(0.7, 0.7, 2.8, 16);
const RETRO_FIN = new THREE.BoxGeometry(0.05, 0.8, 1.2);
const BIKE_CHASSIS = new THREE.BoxGeometry(0.4, 0.5, 3.0);
const BIKE_FAIRING = new THREE.BoxGeometry(0.5, 0.4, 1.2);

export const Player: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const wheelsRef = useRef<THREE.Group[]>([]);
  const shadowRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();

  const { status, laneCount, hasDoubleJump, activateImmortality, isImmortalityActive, equippedCarId, previewCarId } = useStore();
  const activeCarId = (status === GameStatus.SHOP) ? (previewCarId || equippedCarId) : equippedCarId;

  const [lane, setLane] = React.useState(0);
  const targetX = useRef(0);
  const currentX = useRef(0);
  const isJumping = useRef(false);
  const velocityY = useRef(0);
  const jumpsPerformed = useRef(0); 

  const aspect = size.width / size.height;
  const isMobile = aspect < 1.2;

  const materials = useMemo(() => {
      const isActive = isImmortalityActive;
      const configs: Record<string, { body: string; neon: string; stripe?: string; metal: number }> = {
          'CAR_NEON': { body: '#0044bb', neon: '#00f2ff', metal: 0.8 },
          'CAR_TRUCK': { body: '#d4af37', neon: '#ffffff', metal: 0.3 },
          'CAR_MUSCLE': { body: '#aa3300', neon: '#ffcc00', metal: 0.7 },
          'CAR_BLADE': { body: '#bb0033', neon: '#ffffff', stripe: '#00f2ff', metal: 0.8 },
          'CAR_AERO': { body: '#aa00aa', neon: '#ffffff', metal: 0.9 },
          'CAR_VOID': { body: '#eeeeee', neon: '#00ffff', metal: 0.2 },
          'CAR_SHADOW': { body: '#004d00', neon: '#00ff00', metal: 1.0 },
          'CAR_RETRO': { body: '#0088aa', neon: '#ffffff', metal: 0.9 },
          'CAR_BIKE': { body: '#00aa88', neon: '#00ffaa', metal: 0.8 }
      };
      const cfg = configs[activeCarId] || configs['CAR_NEON'];
      const bodyColor = isActive ? '#ffcc00' : cfg.body;
      const neonColor = isActive ? '#ff9900' : cfg.neon;
      const stripeColor = cfg.stripe || neonColor;

      return {
          body: new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.4, metalness: cfg.metal }),
          detail: new THREE.MeshStandardMaterial({ color: '#888888', roughness: 0.5, metalness: 0.8 }),
          window: new THREE.MeshStandardMaterial({ color: '#112233', transparent: true, opacity: 0.85, metalness: 1.0, roughness: 0.1 }),
          wheel: new THREE.MeshBasicMaterial({ color: '#050505' }),
          // 발광 효과를 대폭 줄여 '네온' 느낌을 억제하고 물리적인 램프 느낌으로 수정
          hubcap: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: neonColor, emissiveIntensity: 1.5, toneMapped: false }),
          stripe: new THREE.MeshStandardMaterial({ color: stripeColor, emissive: stripeColor, emissiveIntensity: 1.0, toneMapped: false }),
          headlight: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.5, toneMapped: false }),
          tailLight: new THREE.MeshStandardMaterial({ color: '#880000', emissive: '#ff0000', emissiveIntensity: 0.8, toneMapped: false }),
          underglow: new THREE.MeshBasicMaterial({ color: neonColor, transparent: true, opacity: 0.05, side: THREE.DoubleSide }),
          shadow: new THREE.MeshBasicMaterial({ color: '#000000', opacity: 0.5, transparent: true })
      };
  }, [isImmortalityActive, activeCarId]);

  const triggerJump = () => {
    if (!isJumping.current) {
        audio.playJump(false); isJumping.current = true; jumpsPerformed.current = 1; velocityY.current = JUMP_FORCE;
    } else if (hasDoubleJump && jumpsPerformed.current < 2) {
        audio.playJump(true); jumpsPerformed.current = 2; velocityY.current = JUMP_FORCE * 0.85;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== GameStatus.PLAYING) return;
      const maxLane = Math.floor(laneCount / 2);
      if (e.key === 'ArrowLeft' || e.key === 'a') setLane(l => Math.max(l - 1, -maxLane));
      else if (e.key === 'ArrowRight' || e.key === 'd') setLane(l => Math.min(l + 1, maxLane));
      else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') triggerJump();
      else if (e.key === 'f' || e.key === 'Enter') activateImmortality();
    };
    const handleExternalControl = (e: any) => {
        if (status !== GameStatus.PLAYING) return;
        const maxLane = Math.floor(laneCount / 2);
        const action = e.detail?.action;
        if (action === 'left') setLane(l => Math.max(l - 1, -maxLane));
        else if (action === 'right') setLane(l => Math.min(l + 1, maxLane));
        else if (action === 'jump') triggerJump();
        else if (action === 'ability') activateImmortality();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('game-control', handleExternalControl);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('game-control', handleExternalControl);
    };
  }, [status, laneCount, hasDoubleJump, activateImmortality]);

  useFrame((state, delta) => {
    const { status, speed } = useStore.getState(); // Get fresh state every frame

    if (!groupRef.current || !bodyRef.current) return;
    const time = state.clock.elapsedTime;
    const safeDelta = Math.min(delta, 0.1);

    if (status === GameStatus.MENU || status === GameStatus.SHOP) {
        const isShop = status === GameStatus.SHOP;
        
        groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, 0, safeDelta * 5);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, safeDelta * 5);
        
        const targetScale = isShop ? 0.5 : 1.0;
        groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), safeDelta * 6);
        
        if (isShop) {
            groupRef.current.rotation.y += safeDelta * 1.5; 
        } else {
            const targetRotY = Math.PI + Math.sin(time * 0.4) * 0.15;
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, safeDelta * 4);
        }
        
        const targetBodyY = isShop ? (5.0 + Math.sin(time * 2.2) * 0.1) : (0.8 + Math.sin(time * 1.5) * 0.15);
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, targetBodyY, safeDelta * 5);
        bodyRef.current.rotation.z = THREE.MathUtils.lerp(bodyRef.current.rotation.z, 0, safeDelta * 5);

        if (shadowRef.current) {
            shadowRef.current.material.opacity = THREE.MathUtils.lerp(shadowRef.current.material.opacity, isShop ? 0.05 : 0.4, safeDelta * 5);
        }
        return;
    }

    groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), safeDelta * 6);
    targetX.current = lane * LANE_WIDTH;
    
    const dx = targetX.current - currentX.current;
    currentX.current = THREE.MathUtils.lerp(currentX.current, targetX.current, safeDelta * 15);
    groupRef.current.position.x = currentX.current;
    
    const targetBank = -dx * 0.35;
    bodyRef.current.rotation.z = THREE.MathUtils.lerp(bodyRef.current.rotation.z, targetBank, safeDelta * 10);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, Math.PI, safeDelta * 8);
    
    if (isJumping.current) {
        groupRef.current.position.y += velocityY.current * safeDelta;
        velocityY.current -= GRAVITY * safeDelta;
        if (groupRef.current.position.y <= 0) {
            groupRef.current.position.y = 0; isJumping.current = false; jumpsPerformed.current = 0;
            window.dispatchEvent(new CustomEvent('screen-shake', { detail: { intensity: 0.15 } }));
        }
    } else {
        const targetWalkY = 0.2 + Math.sin(time * 25) * 0.012;
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, targetWalkY, safeDelta * 10);
    }

    const wheelRotSpeed = speed * safeDelta * 2.8;
    wheelsRef.current.forEach(w => { if (w) w.rotation.x += wheelRotSpeed; });
  });

  return (
    <group ref={groupRef}>
      <group ref={bodyRef} position={[0, 0.2, 0]}>
        {activeCarId === 'CAR_NEON' && (
            <group>
                <mesh geometry={STREAK_BODY} material={materials.body} castShadow />
                <group position={[0, 0.4, -0.1]}>
                    <mesh geometry={STREAK_CABIN} material={materials.body} castShadow />
                    <mesh geometry={STREAK_WINDOW} material={materials.window} />
                </group>
                <mesh position={[0.42, 0.05, 1.21]} geometry={LIGHT_GEO} material={materials.headlight} />
                <mesh position={[-0.42, 0.05, 1.21]} geometry={LIGHT_GEO} material={materials.headlight} />
            </group>
        )}
        {activeCarId === 'CAR_TRUCK' && (
            <group>
                <mesh geometry={TRUNK_BODY} material={materials.body} castShadow />
                <mesh position={[0, 0.4, 0]} geometry={TRUNK_ROOF} material={materials.body} />
                <mesh position={[0, 0, 1.31]} geometry={TRUNK_GRILLE} material={materials.detail} />
                <mesh position={[0.5, 0.1, 1.31]} geometry={LIGHT_GEO} material={materials.headlight} />
                <mesh position={[-0.5, 0.1, 1.31]} geometry={LIGHT_GEO} material={materials.headlight} />
            </group>
        )}
        {activeCarId === 'CAR_MUSCLE' && (
            <group>
                <mesh geometry={MUSCLE_BODY} material={materials.body} castShadow />
                <mesh position={[0, 0.32, 0.6]} geometry={MUSCLE_HOOD} material={materials.detail} castShadow />
                <mesh position={[0, 0.45, -0.4]} geometry={MUSCLE_ROOF} material={materials.body} castShadow />
                <mesh position={[0, 0.45, -0.4]} geometry={STREAK_WINDOW} material={materials.window} />
                <mesh position={[0, 0.4, -1.3]} geometry={MUSCLE_SPOILER} material={materials.body} castShadow />
                <mesh position={[0.45, 0.1, 1.41]} geometry={LIGHT_GEO} material={materials.headlight} />
                <mesh position={[-0.45, 0.1, 1.41]} geometry={LIGHT_GEO} material={materials.headlight} />
            </group>
        )}
        {activeCarId === 'CAR_BLADE' && (
            <group>
                <mesh geometry={BLADE_BODY} material={materials.body} castShadow />
                <mesh position={[0.3, 0.105, 0]} rotation={[-Math.PI/2, 0, 0]} geometry={BLADE_STRIPE_GEO} material={materials.stripe} />
                <mesh position={[-0.3, 0.105, 0]} rotation={[-Math.PI/2, 0, 0]} geometry={BLADE_STRIPE_GEO} material={materials.stripe} />
                <mesh position={[0, 0.2, -0.2]} geometry={BLADE_CABIN} material={materials.window} />
                <mesh position={[0, 0.35, -1.2]} geometry={BLADE_WING} material={materials.body} castShadow />
                <mesh position={[0.65, 0, 1.51]} geometry={LIGHT_GEO} material={materials.headlight} />
                <mesh position={[-0.65, 0, 1.51]} geometry={LIGHT_GEO} material={materials.headlight} />
            </group>
        )}
        {activeCarId === 'CAR_AERO' && (
            <group>
                <mesh geometry={AERO_BODY} material={materials.body} castShadow />
                <mesh position={[0, 0, 1.0]} geometry={AERO_WING_FRONT} material={materials.body} />
                <mesh position={[0, 0.3, -1.4]} geometry={AERO_WING_REAR} material={materials.body} />
                <mesh position={[0, 0.08, 0]} geometry={AERO_COCKPIT} material={materials.window} />
                <mesh position={[0.7, 0, 1.61]} geometry={HUBCAP_GEO} material={materials.headlight} />
                <mesh position={[-0.7, 0, 1.61]} geometry={HUBCAP_GEO} material={materials.headlight} />
            </group>
        )}
        {activeCarId === 'CAR_VOID' && (
            <group>
                <mesh geometry={VOID_BODY} material={materials.body} castShadow />
                <mesh position={[0, 0.4, -0.5]} geometry={VOID_FIN} material={materials.body} />
                <mesh position={[0, 0.2, 0.4]} geometry={STREAK_WINDOW} material={materials.window} />
                <mesh position={[0.3, -0.1, 1.01]} geometry={LIGHT_GEO} material={materials.headlight} />
                <mesh position={[-0.3, -0.1, 1.01]} geometry={LIGHT_GEO} material={materials.headlight} />
                <mesh position={[0, -0.1, -1.05]} geometry={HUBCAP_GEO} material={materials.hubcap} />
            </group>
        )}
        {activeCarId === 'CAR_SHADOW' && (
            <group>
                <mesh geometry={SHADOW_BODY_MAIN} material={materials.body} castShadow />
                <mesh position={[0, 0.2, -0.1]} geometry={SHADOW_CANOPY} material={materials.window} />
                <mesh position={[0.6, -0.1, 0.5]} geometry={SHADOW_INLET} material={materials.stripe} />
                <mesh position={[-0.6, -0.1, 0.5]} geometry={SHADOW_INLET} material={materials.stripe} />
                <mesh position={[0.5, -0.1, 1.26]} geometry={LIGHT_GEO} material={materials.headlight} />
                <mesh position={[-0.5, -0.1, 1.26]} geometry={LIGHT_GEO} material={materials.headlight} />
            </group>
        )}
        {activeCarId === 'CAR_RETRO' && (
            <group rotation={[Math.PI/2, 0, 0]}>
                <mesh geometry={RETRO_BODY_MAIN} material={materials.body} castShadow />
                <mesh position={[0.6, -0.8, -0.3]} rotation={[-Math.PI/2, 0, 0]} geometry={RETRO_FIN} material={materials.body} castShadow />
                <mesh position={[-0.6, -0.8, -0.3]} rotation={[-Math.PI/2, 0, 0]} geometry={RETRO_FIN} material={materials.body} castShadow />
                <mesh position={[0, 1.4, -0.3]} rotation={[-Math.PI/2, 0, 0]} geometry={STREAK_WINDOW} material={materials.window} />
            </group>
        )}
        {activeCarId === 'CAR_BIKE' && (
            <group>
                <mesh geometry={BIKE_CHASSIS} material={materials.body} castShadow />
                <mesh position={[0, 0.3, 0.5]} geometry={BIKE_FAIRING} material={materials.body} />
                <mesh position={[0, 0.3, 0.6]} geometry={HUBCAP_GEO} material={materials.headlight} />
            </group>
        )}
        <mesh position={[0.4, 0.1, -1.21]} geometry={TAIL_LIGHT_GEO} material={materials.tailLight} />
        <mesh position={[-0.4, 0.1, -1.21]} geometry={TAIL_LIGHT_GEO} material={materials.tailLight} />
        <mesh position={[0, -0.19, 0]} rotation={[-Math.PI/2, 0, 0]} geometry={UNDERGLOW_GEO} material={materials.underglow} />
        
        {activeCarId === 'CAR_BIKE' ? (
            [ [0, -0.05, 1.2], [0, -0.05, -1.2] ].map((pos, i) => (
                <group key={i} position={pos as [number, number, number]} ref={el => wheelsRef.current[i] = el!}>
                    <mesh geometry={WHEEL_GEO} material={materials.wheel} />
                    <mesh position={[0.18, 0, 0]} geometry={HUBCAP_GEO} material={materials.hubcap} />
                    <mesh position={[-0.18, 0, 0]} geometry={HUBCAP_GEO} material={materials.hubcap} />
                </group>
            ))
        ) : activeCarId !== 'CAR_VOID' && (
            [[-0.65, -0.05, 1.0], [0.65, -0.05, 1.0], [-0.65, -0.05, -0.75], [0.65, -0.05, -0.75]].map((pos, i) => (
                <group key={i} position={pos as [number, number, number]} ref={el => wheelsRef.current[i] = el!}>
                    <mesh geometry={WHEEL_GEO} material={materials.wheel} />
                    <mesh position={[pos[0] > 0 ? 0.18 : -0.18, 0, 0]} geometry={HUBCAP_GEO} material={materials.hubcap} />
                </group>
            ))
        )}
      </group>
      <mesh ref={shadowRef} position={[0, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]} geometry={SHADOW_GEO} material={materials.shadow} />
    </group>
  );
};
