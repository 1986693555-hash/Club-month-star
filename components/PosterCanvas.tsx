import React, { useRef } from 'react';
import { Winner, PosterTemplate, AwardType } from '../types';
import * as htmlToImage from 'html-to-image';
import { Download } from 'lucide-react';

interface PosterCanvasProps {
  winner: Winner;
  template: PosterTemplate;
  id?: string;
  periodLabel?: string;
  customBackground?: string;
}

const PosterCanvas: React.FC<PosterCanvasProps> = ({ winner, template, id, periodLabel = "2025 SEASON", customBackground }) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!ref.current) return;
    try {
      // Small delay to ensure rendering
      await new Promise(resolve => setTimeout(resolve, 100));
      const dataUrl = await htmlToImage.toPng(ref.current, {
        quality: 1.0,
        pixelRatio: 3,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `LYBC_${winner.campus}_${winner.studentName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Poster generation failed", err);
      alert("下载失败，请重试。");
    }
  };

  const isPracticeStar = winner.awardType === AwardType.PRACTICE_STAR;
  const awardLabel = isPracticeStar ? '苦练之星' : '进步之星';
  const awardEnLabel = isPracticeStar ? 'PRACTICE STAR' : 'PROGRESS STAR';
  const statLabel = isPracticeStar ? '本月特训' : '本月加练';
  const statUnit = '次';

  // --- Dynamic Font Scaling Logic (Upscaled for Impact) ---
  const getNameStyles = (name: string) => {
    // Significantly larger text classes
    if (name.length <= 2) return "text-7xl tracking-[0.2em]";
    if (name.length === 3) return "text-7xl tracking-[0.05em]";
    if (name.length === 4) return "text-6xl tracking-wide";
    return "text-5xl tracking-tight"; // Long names
  };

  const nameStyles = getNameStyles(winner.studentName);

  // --- LOGO COMPONENTS ---
  const LogoLiYuanyu = () => (
    <div className="flex flex-col justify-center z-50">
      <span className="text-white font-black italic text-2xl leading-none tracking-tighter drop-shadow-md font-sans">
        李原宇篮球
      </span>
      <div className="flex items-center gap-1 mt-1 opacity-90">
        <span className="text-white text-[8px] font-bold tracking-[0.2em] leading-none uppercase drop-shadow">
          LIYUANYU BASKETBALL
        </span>
      </div>
    </div>
  );

  const LogoNanshan = () => (
    <div className="flex flex-col items-end justify-center z-50">
      <span className="text-white font-black text-2xl leading-none tracking-tight drop-shadow-md font-sans">
        南山文体
      </span>
      <span className="text-blue-200 text-[8px] font-bold tracking-widest leading-none mt-1 uppercase drop-shadow">
        NANSHAN SPORTS
      </span>
    </div>
  );

  return (
    <div className="relative group inline-block">
      <div
        ref={ref}
        id={id}
        className="relative w-[400px] h-[560px] overflow-hidden shadow-2xl flex flex-col font-sans bg-blue-950"
      >
        {/* ================= BACKGROUND LAYER ================= */}
        <div className="absolute inset-0 z-0">
          {customBackground ? (
            // --- CUSTOM STYLE MODE ---
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#111827] to-[#1e3a8a] z-0"></div>
              <img
                src={customBackground}
                className="w-full h-full object-cover absolute inset-0 z-1 mix-blend-overlay opacity-50 grayscale contrast-125"
                alt="bg-texture"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-black/90 via-black/40 to-transparent z-2"></div>
            </>
          ) : (
            // --- DEFAULT BLUE/WHITE THEME ---
            <div className="w-full h-full relative bg-gradient-to-br from-[#0b162e] via-[#0f2d6b] to-[#1e40af]">

              {/* 1. Technical Grid Pattern */}
              <div className="absolute inset-0 opacity-[0.1]"
                style={{
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)`,
                  backgroundSize: '40px 40px'
                }}
              />

              {/* 2. Dynamic Energy Beams */}
              <div className="absolute top-[-20%] left-[-20%] w-[150%] h-[50%] bg-blue-500/10 transform rotate-[25deg] blur-3xl mix-blend-overlay"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] bg-cyan-500/10 transform -rotate-[15deg] blur-2xl mix-blend-screen"></div>

              {/* 3. Large Typography Fill */}
              <div className="absolute top-[15%] right-[-20px] opacity-[0.08] pointer-events-none select-none">
                <span className="font-teko font-black text-[200px] text-white leading-none italic">
                  {isPracticeStar ? 'HUSTLE' : 'GLORY'}
                </span>
              </div>

              {/* 4. Right Side Info Panel Backdrop */}
              <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-black/60 via-blue-900/40 to-transparent z-0 border-l border-white/5 backdrop-blur-[1px]"></div>
            </div>
          )}
        </div>

        {/* ================= HEADER LAYER ================= */}
        <div className="absolute top-0 left-0 w-full px-6 py-6 z-40 flex justify-between items-start">
          <LogoLiYuanyu />
          <LogoNanshan />
        </div>

        {/* ================= PLAYER LAYER ================= */}
        {/* Shifted more to left (-28%) to allow wider text column (48%) */}
        <div className="absolute bottom-0 left-[-28%] w-[110%] h-[95%] z-20 flex items-end justify-start pointer-events-none">
          {winner.processedImageUrl ? (
            <img
              src={winner.processedImageUrl}
              alt={winner.studentName}
              crossOrigin="anonymous"
              className="h-[128%] w-auto max-w-none object-contain object-bottom filter drop-shadow-[15px_10px_50px_rgba(0,0,0,0.7)]"
            />
          ) : winner.imageUrl ? (
            <img
              src={winner.imageUrl}
              alt={winner.studentName}
              crossOrigin="anonymous"
              className="h-[105%] w-auto max-w-none object-contain object-bottom"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center ml-20">
              <span className="font-black text-6xl text-white/5 italic transform -rotate-90 whitespace-nowrap">PLAYER</span>
            </div>
          )}

          {/* Gradient Fog */}
          <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-[#0b162e] to-transparent opacity-90 z-20"></div>
        </div>

        {/* ================= CONTENT LAYER ================= */}
        {/* Expanded width to 48% */}
        <div className="absolute top-[85px] right-0 w-[48%] h-[calc(100%-85px)] z-30 flex flex-col items-end pr-5 text-right font-sans">

          {/* 1. Period Badge */}
          <div className="mb-3 transform hover:scale-105 transition-transform origin-right">
            <div className="inline-flex items-center gap-2 bg-white text-blue-900 text-xs font-black px-4 py-1.5 skew-x-[-10deg] shadow-[0_0_20px_rgba(255,255,255,0.4)]">
              <span className="skew-x-[10deg] uppercase tracking-widest">{periodLabel}</span>
            </div>
          </div>

          {/* 2. Name Block - UPSCALED */}
          <div className="relative mb-3">
            <h2 className={`${nameStyles} font-black text-white italic drop-shadow-2xl leading-[0.9] whitespace-nowrap`}
              style={{ textShadow: '0 5px 20px rgba(0,0,0,0.6)' }}>
              {winner.studentName}
            </h2>
            {/* Decorative underline */}
            <div className="w-full h-1.5 bg-gradient-to-r from-transparent to-blue-400 mt-1 rounded-full opacity-90"></div>
          </div>

          {/* 3. Award Title - UPSCALED & COMPACT */}
          <div className="mb-3 flex flex-col items-end group mt-1">
            <h3 className="text-4xl font-black text-blue-50 italic tracking-tighter uppercase drop-shadow-md font-teko leading-[0.85]">
              {awardEnLabel.split(' ').map((word, i) => (
                <span key={i} className="block">{word}</span>
              ))}
            </h3>
            <div className="flex items-center gap-2 mt-2 bg-blue-600 px-4 py-1.5 rounded shadow-lg transform -skew-x-12">
              <span className="text-xl font-black text-white tracking-[0.2em] transform skew-x-12">{awardLabel}</span>
            </div>
          </div>

          {/* 4. Campus Badge */}
          <div className="mb-4 flex items-center justify-end mt-1">
            <div className="flex items-center gap-2 px-3 py-1 bg-black/30 rounded backdrop-blur-sm border border-white/10">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_#4ade80]"></div>
              <span className="text-blue-200 text-xs font-bold uppercase tracking-widest">{winner.campus}</span>
            </div>
          </div>

          {/* 5. Stats Block - FIX OVERLAP & TIGHTER */}
          <div className="relative w-full flex flex-col items-end mt-8">
            {/* Stats Background Card Effect */}
            <div className="absolute inset-y-[-10px] inset-x-[-20px] bg-gradient-to-r from-blue-600/0 to-blue-900/60 transform skew-x-[-12deg] border-r-4 border-white/10 rounded-r-xl"></div>

            <div className="relative z-10 flex flex-col items-end">
              {/* Label - Properly spaced to avoid overlap */}
              <span className="text-blue-200 text-base font-bold uppercase tracking-[0.2em] mb-0 block text-right drop-shadow-md">
                {statLabel}
              </span>

              {/* Number Display - Rock solid alignment */}
              <div className="flex items-baseline justify-end gap-1 -mt-3">
                <span className="text-[7.5rem] font-teko font-black text-white leading-[0.7] tracking-tighter drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]">
                  {winner.statValue}
                </span>
                <span className="text-4xl font-black text-white px-1">
                  {statUnit}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* ================= FOOTER QUOTE (Compact) ================= */}
        <div className="absolute bottom-6 right-6 z-30 max-w-[180px]">
          <div className="text-[10px] text-white/80 italic font-bold leading-tight text-right border-r-4 border-blue-500 pr-3 py-1 drop-shadow-md">
            "{winner.quote || 'No Pain No Gain'}"
          </div>
        </div>

      </div>

      {/* Hover Download Button Overlay */}
      <div className="absolute inset-0 bg-blue-900/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-50 backdrop-blur-sm cursor-pointer rounded-sm">
        <button
          onClick={handleDownload}
          className="bg-white text-blue-900 px-8 py-3 font-black text-xl shadow-[0_0_30px_rgba(255,255,255,0.4)] transform -skew-x-12 hover:scale-110 hover:bg-blue-50 transition-all flex items-center gap-2 border-2 border-blue-200 group-active:scale-95"
        >
          <div className="transform skew-x-12 flex items-center gap-2">
            <Download size={22} />
            保存海报
          </div>
        </button>
      </div>
    </div>
  );
};

export default PosterCanvas;