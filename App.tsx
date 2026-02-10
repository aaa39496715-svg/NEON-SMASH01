

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment } from './components/World/Environment';
import { Player } from './components/World/Player';
import { LevelManager } from './components/World/LevelManager';
import { Effects } from './components/World/Effects';
import { HUD } from './components/UI/HUD';
import { useStore } from './store';
import { GameStatus, RUN_SPEED_BASE } from './types';

// Dynamic Camera Controller
const CameraController = () => {
  const { camera, size } = useThree();
  const shakeOffset = useRef(new THREE.Vector3());
  const shakeIntensity = useRef(0);
  
  const aspect = size.width / size.height;
  const isMobile = aspect < 1.2;

  useEffect(() => {
      const handleShake = (e: any) => {
          shakeIntensity.current = e.detail.intensity || 0.5;
      };
      window.addEventListener('screen-shake', handleShake);
      return () => window.removeEventListener('screen-shake', handleShake);
  }, []);

  useFrame((state, delta) => {
    const { status, laneCount, speed } = useStore.getState(); // Get fresh state every frame
    const safeDelta = Math.min(delta, 0.1);
    
    // Showroom camera for Menu & Shop
    if (status === GameStatus.MENU || status === GameStatus.SHOP) {
        const isShop = status === GameStatus.SHOP;
        let targetX = 0;
        let targetY = 2.0;
        let targetZ = 6.0;
        let lookAtY = 0.5;
        let lookAtX = 0;
        let targetFOV = 65;

        if (isShop) {
            // The car's local Y is 5.0, but its group is scaled by 0.5.
            // The final world Y is 5.0 * 0.5 = 2.5. Camera must look at this height.
            const carWorldY = 2.5;
            if (isMobile) {
                targetX = 0; 
                targetY = carWorldY; // match lookAtY for a straight look
                targetZ = 4.2; 
                lookAtY = carWorldY; // car height
                lookAtX = 0;
                targetFOV = 48; 
            } else {
                targetX = 1.8; 
                targetY = carWorldY; // match lookAtY
                targetZ = 3.8; 
                lookAtY = carWorldY; // car height
                lookAtX = -0.4;
                targetFOV = 35;
            }
        } else {
            // 메인 메뉴
            targetX = 0; targetY = 2.2; targetZ = 6.0; lookAtY = 0.5; lookAtX = 0;
            targetFOV = 65;
        }
        
        const targetPos = new THREE.Vector3(targetX, targetY, targetZ);
        camera.position.lerp(targetPos, safeDelta * 5.0);
        (camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.lerp((camera as THREE.PerspectiveCamera).fov, targetFOV, safeDelta * 4);
        camera.updateProjectionMatrix();
        
        const dummyLook = new THREE.Vector3(lookAtX, lookAtY, 0);
        camera.lookAt(dummyLook); 
        return;
    }

    // 인게임 플레이 모드 쉐이크
    if (shakeIntensity.current > 0) {
        shakeOffset.current.set(
            (Math.random() - 0.5) * shakeIntensity.current,
            (Math.random() - 0.5) * shakeIntensity.current,
            0
        );
        shakeIntensity.current *= 0.92;
        if (shakeIntensity.current < 0.01) shakeIntensity.current = 0;
    } else {
        shakeOffset.current.set(0, 0, 0);
    }

    // 속도에 따른 가변 FOV
    const speedRatio = Math.max(0, (speed - RUN_SPEED_BASE) / RUN_SPEED_BASE);
    const targetInGameFOV = 65 + (speedRatio * 20);
    (camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.lerp((camera as THREE.PerspectiveCamera).fov, targetInGameFOV, safeDelta * 3);
    camera.updateProjectionMatrix();

    const heightFactor = isMobile ? 1.8 : 0.5;
    const distFactor = isMobile ? 4.0 : 1.0;
    const extraLanes = Math.max(0, laneCount - 3);

    const targetY = 5.0 + (extraLanes * heightFactor);
    const targetZ = 7.5 + (extraLanes * distFactor);
    const targetPos = new THREE.Vector3(0, targetY, targetZ).add(shakeOffset.current);
    
    camera.position.lerp(targetPos, safeDelta * 3.0);
    camera.lookAt(0, 0, -30); 
  });
  
  return null;
};

function Scene() {
  return (
    <>
        <Environment />
        <group>
            <group userData={{ isPlayer: true }} name="PlayerGroup">
                 <Player />
            </group>
            <LevelManager />
        </group>
        <Effects />
    </>
  );
}

function App() {
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      <HUD />
      <Canvas
        shadows
        dpr={[1, 2]} 
        gl={{ antialias: true, stencil: false, depth: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 5, 8], fov: 65 }}
      >
        <CameraController />
        <Suspense fallback={null}>
            <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
