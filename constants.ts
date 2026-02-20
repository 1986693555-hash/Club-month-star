import { PosterTemplate } from './types';

export const APP_NAME = "李原宇篮球俱乐部";
export const APP_SUBTITLE = "月度之星智能生成系统";

export const LOGO_LYBC_TEXT = "李原宇篮球";
export const LOGO_NS_TEXT = "南山文体";

export const TEMPLATES: PosterTemplate[] = [
  {
    id: 'temp_cba_blue',
    name: '职业蓝 (Pro Blue)',
    bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', // Deep Navy to Royal Blue
    accentColor: '#FFFFFF', 
    swooshColor1: '#3b82f6', 
    swooshColor2: '#172554',
    textColor: '#ffffff'
  },
  {
    id: 'temp_ice_storm',
    name: '冰风暴 (Ice Storm)',
    bgGradient: 'linear-gradient(180deg, #ffffff 0%, #dbeafe 40%, #2563eb 100%)', // White top to Blue bottom
    accentColor: '#1e40af', 
    swooshColor1: '#60a5fa', 
    swooshColor2: '#eff6ff',
    textColor: '#1e3a8a'
  },
  {
    id: 'temp_urban_concrete',
    name: '街头灰 (Urban)',
    bgGradient: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)', // Slate to Dark
    accentColor: '#38bdf8', // Light Blue Accent
    swooshColor1: '#94a3b8', 
    swooshColor2: '#1e293b',
    textColor: '#f8fafc'
  },
  {
    id: 'temp_neon_flux',
    name: '极光流 (Neon Flux)',
    bgGradient: 'linear-gradient(45deg, #000000 0%, #111827 50%, #1e3a8a 100%)', // Black to Blue
    accentColor: '#22d3ee', // Cyan
    swooshColor1: '#0ea5e9', 
    swooshColor2: '#000000',
    textColor: '#ffffff'
  }
];

export const MOCK_QUOTES = [
  "汗水不会撒谎，每一次运球都是通往冠军的台阶。",
  "天赋决定上限，但努力决定下限。保持热爱！",
  "不要在此刻放弃，因为这一刻就是你突破的开始。",
  "球场上没有捷径，只有重复一万次的枯燥练习。",
  "比你强的人都在努力，你有什么理由停下？"
];