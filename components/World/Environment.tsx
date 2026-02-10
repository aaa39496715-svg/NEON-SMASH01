
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment as DreiEnvironment } from '@react-three/drei';
import { useStore } from '../../store';
import { LANE_WIDTH, GameStatus } from '../../types';

const THEMES = [
    { bg: '#050011', fog: '#050011', lane: '#00ffff' }, // LV 1-3
    { bg: '#110011', fog: '#110011', lane: '#ff00ff' }, // LV 4-6
    { bg: '#1a0500', fog: '#1a0500', lane: '#ff4d00' }, // LV 7-9
    { bg: '#000000', fog: '#1a1a00', lane: '#ffd700' }, // LV 10
];

const StarField: React.FC = () => {
  const { speed, level } = useStore();
  const count = 3000; 
  const meshRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      let x = (Math.random() - 0.5) * 600;
      let y = (Math.random() - 0.5) * 300 + 50; 
      let z = -600 + Math.random() * 800;
      if (Math.abs(x) < 30 && y < 30) {
          if (x < 0) x -= 30;
          else x += 30;
      }
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; 
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    const activeSpeed = speed > 0 ? speed : 2; 

    for (let i = 0; i < count; i++) {
        let z = positions[i * 3 + 2];
        z += activeSpeed * delta * 1.5; 
        if (z > 150) {
            z = -600 - Math.random() * 50; 
            let x = (Math.random() - 0.5) * 600;
            let y = (Math.random() - 0.5) * 300 + 50;
            if (Math.abs(x) < 30 && y < 30) {
                if (x < 0) x -= 30;
                else x += 30;
            }
            positions[i * 3] = x; positions[i * 3 + 1] = y;
        }
        positions[i * 3 + 2] = z;
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
    
    const themeIdx = Math.min(Math.floor((level - 1) / 3), THEMES.length - 1);
    const color = new THREE.Color(THEMES[themeIdx].lane);
    (meshRef.current.material as THREE.PointsMaterial).color.lerp(color, delta);
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.6} color="#ffffff" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
};

const LaneGuides: React.FC = () => {
    const { laneCount, level } = useStore();
    const separators = useMemo(() => {
        const lines: number[] = [];
        const startX = -(laneCount * LANE_WIDTH) / 2;
        for (let i = 0; i <= laneCount; i++) lines.push(startX + (i * LANE_WIDTH));
        return lines;
    }, [laneCount]);

    const themeIdx = Math.min(Math.floor((level - 1) / 3), THEMES.length - 1);
    const laneColor = THEMES[themeIdx].lane;

    return (
        <group position={[0, 0.02, 0]}>
            <mesh position={[0, -0.02, -100]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[laneCount * LANE_WIDTH, 500]} />
                <meshBasicMaterial color="#020008" transparent opacity={0.9} />
            </mesh>
            {separators.map((x, i) => (
                <mesh key={`sep-${i}`} position={[x, 0, -100]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.08, 500]} /> 
                    <meshBasicMaterial color={laneColor} transparent opacity={0.3} />
                </mesh>
            ))}
        </group>
    );
};

export const Environment: React.FC = () => {
  const { status, level } = useStore();
  const isShop = status === GameStatus.SHOP;
  const themeIdx = Math.min(Math.floor((level - 1) / 3), THEMES.length - 1);
  const theme = THEMES[themeIdx];

  return (
    <>
      <color attach="background" args={[theme.bg]} />
      <fog attach="fog" args={[theme.fog, 40, 250]} />
      
      <DreiEnvironment preset="night" />

      {/* 상점 모드 조명 강도를 더욱 조절하여 차분한 분위기 조성 */}
      <ambientLight intensity={isShop ? 1.0 : 0.6} color="#ffffff" />
      <directionalLight position={[5, 10, 5]} intensity={isShop ? 2.0 : 1.2} color="#ffffff" castShadow />
      
      {/* 캐릭터 자체에서 뿜어 나오는 포인트 라이트 제거 (네온 느낌 억제) */}
      <pointLight position={[0, 1.2, 0]} intensity={isShop ? 10 : 0} color="#ffffff" distance={10} />

      {isShop && (
          <group>
            {/* 스포트라이트를 백색광에 가깝게 조정하여 색상 왜곡 방지 */}
            <spotLight 
                position={[4, 6, 4]} 
                intensity={80} 
                angle={0.4} 
                penumbra={1} 
                color="#e0faff" 
                target-position={[0, 1.2, 0]} 
                castShadow
            />
            <spotLight 
                position={[-4, 6, 4]} 
                intensity={80} 
                angle={0.4} 
                penumbra={1} 
                color="#ffe0ff" 
                target-position={[0, 1.2, 0]} 
                castShadow
            />
          </group>
      )}

      <StarField />
      <LaneGuides />
    </>
  );
};
