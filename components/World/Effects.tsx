
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React from 'react';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export const Effects: React.FC = () => {
  return (
    <EffectComposer disableNormalPass multisampling={0}>
      {/* Bloom 효과 최소화: 강도 대폭 감소 (0.4 -> 0.15), 임계값 상향 (0.9 -> 0.98) */}
      <Bloom 
        luminanceThreshold={0.98} 
        mipmapBlur 
        intensity={0.15} 
        radius={0.4}
        levels={7}
      />
      <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
      <Vignette eskil={false} offset={0.1} darkness={0.5} />
    </EffectComposer>
  );
};
