
import { GoogleGenAI } from "@google/genai";
import { MatchResult, PlayerStats, GameMode } from "../types";

// 재시도 로직을 포함한 공통 호출 함수
const safeGenerateContent = async (prompt: string, fallback: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 100,
      }
    });
    
    if (!response || !response.text) return fallback;
    return response.text.trim().replace(/^"(.*)"$/, '$1'); // 따옴표 제거
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return fallback;
  }
};

export const getCoachIntro = async (player: PlayerStats, mode: GameMode) => {
  const modeName = mode === 'SINGLE' ? 'STARFALL (Survival)' : 'STADIUM (AI Match)';
  const prompt = `
    당신은 사이버펑크 테니스 리그의 전설적인 전술 코치 '에이스(ACE)'입니다. 
    말투: 짧고, 강렬하며, 전산 용어와 테니스 용어를 섞은 냉철한 스타일. 
    상황: 경기 직전 전술 브리핑.
    모드: ${modeName}. 
    플레이어 능력치: 파워 ${player.power}, 스피드 ${player.speed}. 
    
    코치로서 플레이어의 신경망(Neural Link)을 자극할 한 문장의 짧은 브리핑을 한국어로 해주세요. 
    예: "뉴럴 동기화 완료. 네온 궤적으로 상대의 연산 회로를 과부하시켜라."
  `;
  const fallback = "시스템 동기화 완료. 코트에 당신의 궤적을 각인시키십시오.";
  
  return await safeGenerateContent(prompt, fallback);
};

export const getMatchAnalysis = async (result: MatchResult, player: PlayerStats) => {
  const modeName = result.mode === 'SINGLE' ? 'STARFALL' : 'STADIUM';
  const prompt = `
    당신은 사이버펑크 테니스 전술가 '에이스(ACE)'입니다. 
    상황: 경기 종료 후 데이터 로그 분석 및 피드백.
    결과: 점수 ${result.playerScore}, 레벨 ${result.level}, 최대 랠리 ${result.maxRally}. 
    
    냉철하게 경기를 평가하세요. 칭찬보다는 더 높은 성능(Performance)을 요구하는 스타일로 한국어 1~2줄 이내로 작성하세요. 
    전문적인 '로그 리포트' 느낌을 주어야 합니다.
  `;
  const fallback = "데이터 분석 완료. 기술적 특이점이 관찰되었습니다. 다음 세션에서 한계를 증명하십시오.";
  
  return await safeGenerateContent(prompt, fallback);
};
