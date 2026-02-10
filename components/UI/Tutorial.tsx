

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useCallback } from 'react';
import { Gem, Shield, ChevronsRight, MoveHorizontal, ArrowUp, Space, MousePointer, AppWindow, Rocket } from 'lucide-react';
import { useStore } from '../../store';
import { translations } from '../../locales';

interface TutorialProps {
  onClose: () => void;
}

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export const Tutorial: React.FC<TutorialProps> = ({ onClose }) => {
  const { locale } = useStore();
  const t = useCallback((key: string) => translations[locale][key as keyof typeof translations['en']] || key, [locale]);

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-500 pointer-events-auto">
      <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-cyan-400/40 p-8 md:p-10 rounded-[40px] flex flex-col items-center text-center shadow-[0_0_100px_rgba(6,182,212,0.2)] max-w-lg mx-4 animate-in zoom-in duration-500">
        <h2 className="text-4xl md:text-5xl font-black font-cyber text-white uppercase tracking-tighter mb-4 italic" dangerouslySetInnerHTML={{ __html: t('tutorial_title') }} />
        <p className="text-gray-400 text-sm mb-8 md:mb-12 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: t('tutorial_subtitle') }} />
        
        <div className="flex flex-col md:flex-row w-full space-y-4 md:space-y-0 md:space-x-4 mb-8 md:mb-12">
          {/* Controls */}
          <div className="flex-1 bg-cyan-400/5 border border-cyan-400/20 p-5 rounded-2xl flex flex-col items-center">
            <MoveHorizontal className="w-8 h-8 text-cyan-400 mb-3" />
            <h3 className="text-lg font-bold font-cyber text-cyan-400 mb-2 uppercase" dangerouslySetInnerHTML={{ __html: t('tutorial_controls_title') }} />
            {isMobile ? (
              <div className="text-xs text-gray-300 space-y-2">
                <div className="flex items-center space-x-2 justify-center">
                    <AppWindow className="w-4 h-4 flex-shrink-0" />
                    <p dangerouslySetInnerHTML={{ __html: t('tutorial_controls_mobile_move') }} />
                </div>
                <div className="flex items-center space-x-2 justify-center">
                    <AppWindow className="w-4 h-4 flex-shrink-0" />
                    <p dangerouslySetInnerHTML={{ __html: t('tutorial_controls_mobile_jump') }} />
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-300 space-y-2">
                <div className="flex items-center space-x-2 justify-center">
                    <ChevronsRight className="w-4 h-4 flex-shrink-0" />
                    <p dangerouslySetInnerHTML={{ __html: t('tutorial_controls_desktop_move') }} />
                </div>
                <div className="flex items-center space-x-2 justify-center">
                    <ArrowUp className="w-4 h-4 flex-shrink-0" />
                    <p dangerouslySetInnerHTML={{ __html: t('tutorial_controls_desktop_jump') }} />
                </div>
              </div>
            )}
          </div>
          
          {/* Goal */}
          <div className="flex-1 bg-yellow-400/5 border border-yellow-400/20 p-5 rounded-2xl flex flex-col items-center">
            <Gem className="w-8 h-8 text-yellow-400 mb-3" />
            <h3 className="text-lg font-bold font-cyber text-yellow-400 mb-2 uppercase" dangerouslySetInnerHTML={{ __html: t('tutorial_goal_title') }} />
             <div className="text-xs text-gray-300 space-y-2">
                <div className="flex items-start space-x-2">
                    <Shield className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-left" dangerouslySetInnerHTML={{ __html: t('tutorial_goal_obstacles') }} />
                </div>
                <div className="flex items-start space-x-2">
                    <Gem className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <p className="text-left" dangerouslySetInnerHTML={{ __html: t('tutorial_goal_gems') }} />
                </div>
                <div className="flex items-start space-x-2">
                    <Rocket className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="text-left" dangerouslySetInnerHTML={{ __html: t('tutorial_goal_missiles') }} />
                </div>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="w-full bg-white text-black py-5 rounded-2xl font-black font-cyber uppercase tracking-[0.4em] text-sm hover:bg-cyan-400 hover:shadow-2xl transition-all active:scale-95" dangerouslySetInnerHTML={{ __html: t('tutorial_button_start') }} />
      </div>
    </div>
  );
};
