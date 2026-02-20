import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Trophy,
  Upload,
  Users,
  Image as ImageIcon,
  Download,
  ChevronRight,
  X,
  Plus,
  Wand2,
  FileSpreadsheet,
  Layout,
  Trash2,
  Calendar,
  Palette,
  Sparkles,
  Play,
  CheckCircle
} from 'lucide-react';

import { AppState, StudentData, Winner, AwardType, PosterTemplate } from './types';
import { TEMPLATES } from './constants';
import Button from './components/Button';
import PosterCanvas from './components/PosterCanvas';
import { generateQuote, processImageBackground, editImageWithGemini, fileToBase64 } from './services/geminiService';

export default function App() {
  const [state, setState] = useState<AppState>({
    step: 'IMPORT',
    currentMonthData: [],
    lastMonthData: new Map(),
    selectedWinners: [],
    selectedTemplateId: TEMPLATES[0].id,
    isAddModalOpen: false,
    periodLabel: `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`, // Default to current month
    customBackground: undefined
  });

  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Manual Add Form State
  const [manualForm, setManualForm] = useState({
    name: '',
    campus: '',
    awardType: AwardType.PRACTICE_STAR,
    statValue: 0
  });

  // --- LOGIC: Calculation Engine ---

  const calculateWinners = (currentData: StudentData[], lastMonthMap: Map<string, number>) => {
    // Group by Campus
    const campusMap = new Map<string, StudentData[]>();
    currentData.forEach(s => {
      const list = campusMap.get(s.campus) || [];
      list.push(s);
      campusMap.set(s.campus, list);
    });

    const newWinners: Winner[] = [];

    campusMap.forEach((students, campus) => {
      // 1. Practice Star (Max Attendance)
      const maxAttendance = Math.max(...students.map(s => s.attendance));
      if (maxAttendance > 0) {
        students.filter(s => s.attendance === maxAttendance).forEach(s => {
          newWinners.push({
            studentId: s.id,
            studentName: s.name,
            campus: s.campus,
            awardType: AwardType.PRACTICE_STAR,
            statValue: s.attendance
          });
        });
      }

      // 2. Progress Star (Diff with Last Month > 0)
      // Only calculate if we have last month data
      if (lastMonthMap.size > 0) {
        let maxProgress = -999;
        const progressCandidates: { s: StudentData, diff: number }[] = [];

        students.forEach(s => {
          // Key for map: Name + Campus (Simple unique key assumption)
          const key = `${s.name}_${s.campus}`;
          const lastMonth = lastMonthMap.get(key) || 0;
          const diff = s.attendance - lastMonth;

          if (diff > 0) {
            if (diff > maxProgress) maxProgress = diff;
            progressCandidates.push({ s, diff });
          }
        });

        if (maxProgress > 0) {
          progressCandidates.filter(c => c.diff === maxProgress).forEach(c => {
            newWinners.push({
              studentId: c.s.id,
              studentName: c.s.name,
              campus: c.s.campus,
              awardType: AwardType.PROGRESS_STAR,
              statValue: c.diff // Show improvement count
            });
          });
        }
      }
    });

    return newWinners;
  };

  // --- HANDLERS ---

  const parseExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        resolve(data);
      };
      reader.readAsBinaryString(file);
    });
  };

  const handleCurrentMonthUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await parseExcel(file);
    const formattedData: StudentData[] = data.map((row: any, index: number) => ({
      id: `student_${index}`,
      name: row['姓名'] || row['Name'] || 'Unknown',
      campus: row['校区'] || row['Campus'] || 'General',
      attendance: Number(row['出勤'] || row['Attendance'] || 0)
    }));

    setState(prev => ({
      ...prev,
      currentMonthData: formattedData
    }));
  };

  const handleLastMonthUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await parseExcel(file);
    const map = new Map<string, number>();

    data.forEach((row: any) => {
      const name = row['姓名'] || row['Name'];
      const campus = row['校区'] || row['Campus'];
      const attendance = Number(row['出勤'] || row['Attendance'] || 0);
      if (name && campus) {
        map.set(`${name}_${campus}`, attendance);
      }
    });

    setState(prev => ({
      ...prev,
      lastMonthData: map
    }));
  };

  const startReview = () => {
    if (state.currentMonthData.length === 0) {
      alert("请至少导入本月数据");
      return;
    }
    const winners = calculateWinners(state.currentMonthData, state.lastMonthData);
    setState(prev => ({
      ...prev,
      selectedWinners: winners,
      step: 'REVIEW'
    }));
  };

  // Quick Test Mode Handler
  const startDemoMode = () => {
    const demoWinner: Winner = {
      studentId: 'demo-001',
      studentName: '李大为',
      campus: '南山校区',
      awardType: AwardType.PRACTICE_STAR,
      statValue: 88,
      quote: "天赋决定上限，努力决定下限。"
    };

    setState(prev => ({
      ...prev,
      selectedWinners: [demoWinner],
      step: 'IMAGES'
    }));
  };

  const handleManualAdd = () => {
    if (!manualForm.name) return;

    const newWinner: Winner = {
      studentId: `manual_${Date.now()}`,
      studentName: manualForm.name,
      campus: manualForm.campus || '校区',
      awardType: manualForm.awardType,
      statValue: Number(manualForm.statValue)
    };

    setState(prev => ({
      ...prev,
      selectedWinners: [...prev.selectedWinners, newWinner],
      isAddModalOpen: false
    }));

    // Reset form
    setManualForm({
      name: '',
      campus: '',
      awardType: AwardType.PRACTICE_STAR,
      statValue: 0
    });
  };

  const handlePhotoUpload = async (winnerIndex: number, file: File) => {
    try {
      const base64Raw = await fileToBase64(file);
      const imageUrl = `data:image/jpeg;base64,${base64Raw}`;

      const updatedWinners = [...state.selectedWinners];
      updatedWinners[winnerIndex] = {
        ...updatedWinners[winnerIndex],
        imageUrl: imageUrl,
        processedImageUrl: undefined
      };

      setState(prev => ({ ...prev, selectedWinners: updatedWinners }));

      generateQuote(updatedWinners[winnerIndex].studentName, updatedWinners[winnerIndex].awardType)
        .then(quote => {
          setState(curr => {
            const w = [...curr.selectedWinners];
            if (w[winnerIndex]) w[winnerIndex].quote = quote;
            return { ...curr, selectedWinners: w };
          });
        });

    } catch (e) {
      console.error(e);
      alert("上传失败");
    }
  };

  const handleAIProcess = async (winnerIndex: number) => {
    const winner = state.selectedWinners[winnerIndex];
    if (!winner.imageUrl) return;

    setEditingIndex(winnerIndex);
    setIsAIProcessing(true);
    try {
      const base64Data = winner.imageUrl.split(',')[1];
      const processedImage = await processImageBackground(base64Data);

      setState(curr => {
        const w = [...curr.selectedWinners];
        w[winnerIndex].processedImageUrl = processedImage;
        return { ...curr, selectedWinners: w };
      });
    } catch (error) {
      alert("AI 处理失败，请检查 API Key");
    } finally {
      setIsAIProcessing(false);
      setEditingIndex(null);
    }
  };

  const handleAIEdit = async (winnerIndex: number) => {
    const winner = state.selectedWinners[winnerIndex];
    // Use processed image if available, otherwise original
    const sourceImage = winner.processedImageUrl || winner.imageUrl;
    const prompt = winner.editPrompt;

    if (!sourceImage || !prompt) {
      alert("请先上传图片并输入编辑指令");
      return;
    }

    setEditingIndex(winnerIndex);
    setIsAIProcessing(true);
    try {
      const base64Data = sourceImage.split(',')[1];
      const newImage = await editImageWithGemini(base64Data, prompt);

      setState(curr => {
        const w = [...curr.selectedWinners];
        w[winnerIndex].processedImageUrl = newImage; // Update the result
        return { ...curr, selectedWinners: w };
      });
    } catch (e) {
      alert("AI 编辑失败，请重试");
    } finally {
      setIsAIProcessing(false);
      setEditingIndex(null);
    }
  };

  const handleBackgroundUpload = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      setState(p => ({ ...p, customBackground: `data:image/jpeg;base64,${base64}` }));
    } catch (e) {
      alert("Reference upload failed");
    }
  };

  const handleRemoveBackground = () => {
    setState(p => ({ ...p, customBackground: undefined }));
  };

  const renderContent = () => {
    switch (state.step) {
      case 'IMPORT':
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-blue-900/20 p-8 rounded-full ring-4 ring-blue-900/10">
              <FileSpreadsheet size={64} className="text-blue-500" />
            </div>

            <div>
              <h2 className="text-4xl font-black font-teko tracking-wide text-white mb-2">数据导入中心</h2>
              <p className="text-slate-400 max-w-lg mx-auto">
                请上传 Excel 文件 (.xlsx)。系统需对比“本月”与“上月”数据以计算进步奖。
              </p>
            </div>

            {/* Period Selector */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 w-full max-w-xs flex flex-col items-center">
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                <Calendar size={14} /> 评选周期 (显示在海报上)
              </label>
              <input
                type="text"
                className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-center text-white font-bold w-full focus:border-blue-500 outline-none"
                value={state.periodLabel}
                onChange={(e) => setState(p => ({ ...p, periodLabel: e.target.value }))}
                placeholder="例如: 2025年1月"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl justify-center">
              {/* Current Month */}
              <div className="flex-1 bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-blue-500 transition-all group relative">
                <div className="absolute top-2 right-2 text-green-500">
                  <CheckCircle size={20} />
                </div>
                <h3 className="font-bold text-lg mb-2 text-white">1. 本月数据 (必须)</h3>
                <p className="text-xs text-slate-400 mb-4">包含: 姓名, 校区, 出勤次数</p>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleCurrentMonthUpload}
                    className="hidden"
                    id="current-upload"
                  />
                  <label
                    htmlFor="current-upload"
                    className="w-full block text-center bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold cursor-pointer transition-colors"
                  >
                    {state.currentMonthData.length > 0 ? `已导入 ${state.currentMonthData.length} 条` : '选择文件'}
                  </label>
                </div>
              </div>

              {/* Last Month */}
              <div className="flex-1 bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-blue-500 transition-all relative">
                {state.lastMonthData.size > 0 && (
                  <div className="absolute top-2 right-2 text-green-500">
                    <CheckCircle size={20} />
                  </div>
                )}
                <h3 className="font-bold text-lg mb-2 text-white">2. 上月数据 (可选)</h3>
                <p className="text-xs text-slate-400 mb-4">用于计算【进步之星】</p>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleLastMonthUpload}
                    className="hidden"
                    id="last-upload"
                  />
                  <label
                    htmlFor="last-upload"
                    className="w-full block text-center bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-bold cursor-pointer transition-colors"
                  >
                    {state.lastMonthData.size > 0 ? `已导入 ${state.lastMonthData.size} 条` : '选择文件'}
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={startReview}
                className="px-12 py-4 text-lg"
                disabled={state.currentMonthData.length === 0}
              >
                开始智能评选 <ChevronRight />
              </Button>

              {/* QUICK TEST MODE BUTTON */}
              <button
                onClick={startDemoMode}
                className="px-8 py-4 text-lg bg-slate-800 text-slate-300 font-bold rounded-lg hover:bg-slate-700 hover:text-white border border-slate-600 transition-all flex items-center gap-2"
                title="Load fake data to test posters immediately"
              >
                <Play size={20} className="text-green-500" />
                快速演示模式
              </button>
            </div>

            <p className="text-xs text-slate-500">* 快速演示模式将使用模拟数据直接跳转至海报生成页面</p>
          </div>
        );

      case 'REVIEW':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                <Users className="text-blue-500" />
                获奖名单审核 ({state.selectedWinners.length}人)
              </h2>
              <Button onClick={() => setState(p => ({ ...p, step: 'IMAGES' }))}>
                确认并下一步 <ChevronRight size={16} />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.selectedWinners.map((w, idx) => (
                <div key={idx} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex justify-between items-start group hover:border-blue-500/50 transition-colors relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${w.awardType === AwardType.PRACTICE_STAR ? 'bg-amber-500/20 text-amber-500' : 'bg-cyan-500/20 text-cyan-500'}`}>
                        {w.awardType}
                      </span>
                      <span className="text-xs text-slate-500 font-bold">{w.campus}</span>
                    </div>
                    <h3 className="text-2xl font-black text-white italic font-teko tracking-wide">{w.studentName}</h3>
                    <p className="text-sm text-slate-400">
                      数据记录: <span className="text-white font-mono font-bold text-lg">{w.statValue}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const updated = [...state.selectedWinners];
                      updated.splice(idx, 1);
                      setState(prev => ({ ...prev, selectedWinners: updated }));
                    }}
                    className="text-slate-600 hover:text-red-500 p-2 z-20 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}

              {/* Manual Add Button */}
              <button
                onClick={() => setState(p => ({ ...p, isAddModalOpen: true }))}
                className="border-2 border-dashed border-slate-700 rounded-lg p-4 flex flex-col items-center justify-center text-slate-500 hover:text-blue-500 hover:border-blue-500 transition-all min-h-[140px] hover:bg-slate-800/50"
              >
                <div className="bg-slate-800 p-3 rounded-full mb-2 group-hover:bg-blue-500/20 transition-colors">
                  <Plus size={24} />
                </div>
                <span className="font-bold">手动添加获奖者</span>
              </button>
            </div>
          </div>
        );

      case 'IMAGES':
        return (
          <div className="space-y-6">
            {/* Visual Style Selection */}
            <div className="flex flex-col xl:flex-row gap-6">
              {/* Left: Template Selector */}
              <div className="flex-1 flex flex-col md:flex-row justify-between items-center bg-slate-800 p-6 rounded-xl border-l-4 border-blue-500 shadow-xl">
                <div className="mb-4 md:mb-0">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Layout size={20} className="text-blue-400" /> 风格模板 (4种)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">内置专业运动视觉方案</p>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setState(p => ({ ...p, selectedTemplateId: t.id, customBackground: undefined }))}
                      className={`group relative flex flex-col items-center gap-2 px-3 py-2 rounded-lg transition-all border-2 w-24 shrink-0 ${state.selectedTemplateId === t.id && !state.customBackground ? 'border-white bg-slate-700' : 'border-transparent bg-slate-900 hover:bg-slate-700'}`}
                    >
                      <span className="w-8 h-8 rounded shadow-sm border border-slate-600" style={{ background: t.bgGradient }} />
                      <span className={`text-[10px] font-bold text-center leading-tight ${state.selectedTemplateId === t.id && !state.customBackground ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                        {t.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Custom Reference Upload */}
              <div className={`flex-1 flex flex-col justify-center bg-slate-800 p-6 rounded-xl border-l-4 transition-colors shadow-xl ${state.customBackground ? 'border-purple-500 bg-purple-900/20' : 'border-slate-600'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Palette size={18} className={state.customBackground ? "text-purple-400" : "text-slate-400"} /> 风格参考图
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      上传一张参考图，系统将提取其纹理和布局风格，生成**非直抄**的专属海报底图。
                    </p>
                  </div>
                  {state.customBackground && (
                    <button
                      onClick={handleRemoveBackground}
                      className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                      title="清除参考"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="mt-2">
                  <input
                    type="file"
                    id="bg-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => e.target.files && handleBackgroundUpload(e.target.files[0])}
                  />
                  <label
                    htmlFor="bg-upload"
                    className={`w-full py-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 cursor-pointer font-bold text-sm transition-all ${state.customBackground ? 'border-purple-500 text-purple-300 bg-purple-500/10' : 'border-slate-600 text-slate-400 hover:border-purple-500 hover:text-white hover:bg-slate-700'}`}
                  >
                    {state.customBackground ? (
                      <>
                        <ImageIcon size={16} /> 已应用风格参考 (点击更换)
                      </>
                    ) : (
                      <>
                        <Upload size={16} /> 上传风格参考图
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-8">
              <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                <Wand2 className="text-blue-500" />
                素材工坊
              </h2>
              <Button onClick={() => setState(p => ({ ...p, step: 'GALLERY' }))}>
                全部生成并预览 <Trophy size={16} />
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-350px)]">
              {/* List Side */}
              <div className="lg:col-span-5 space-y-4 overflow-y-auto pr-2 custom-scrollbar pb-20">
                {state.selectedWinners.map((w, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border transition-all ${w.imageUrl ? 'bg-slate-800 border-slate-600' : 'bg-slate-800/30 border-blue-500/30 border-dashed'}`}>
                    <div className="flex justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-white text-lg">{w.studentName}</h4>
                        <p className="text-xs text-blue-400 font-bold uppercase">{w.awardType}</p>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <input
                          type="file"
                          id={`upload-${idx}`}
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => e.target.files && handlePhotoUpload(idx, e.target.files[0])}
                        />
                        <label
                          htmlFor={`upload-${idx}`}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-md text-xs cursor-pointer flex items-center gap-1 font-bold transition-colors"
                        >
                          <Upload size={14} /> {w.imageUrl ? '更换照片' : '上传照片'}
                        </label>
                        {w.imageUrl && (
                          <button
                            onClick={() => handleAIProcess(idx)}
                            disabled={isAIProcessing && editingIndex === idx}
                            className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-md text-xs flex items-center gap-1 font-bold shadow-lg transition-all"
                          >
                            <Wand2 size={14} /> AI 抠图
                          </button>
                        )}
                      </div>
                    </div>

                    {/* AI Edit Section */}
                    {w.imageUrl && (
                      <div className="mb-4 bg-indigo-900/20 p-2 rounded-lg border border-indigo-500/30">
                        <label className="text-[10px] uppercase text-indigo-300 font-bold block mb-1 flex items-center gap-1">
                          <Sparkles size={10} /> AI 创意修图 (Gemini)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="flex-1 bg-slate-900 border border-indigo-500/30 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
                            placeholder="例: 添加火焰特效 / 复古滤镜..."
                            value={w.editPrompt || ''}
                            onChange={(e) => {
                              const newW = [...state.selectedWinners];
                              newW[idx].editPrompt = e.target.value;
                              setState(p => ({ ...p, selectedWinners: newW }));
                            }}
                          />
                          <button
                            onClick={() => handleAIEdit(idx)}
                            disabled={isAIProcessing && editingIndex === idx}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded flex items-center"
                          >
                            {isAIProcessing && editingIndex === idx ? '...' : '生成'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Quote Editor */}
                    <div className="mb-2 bg-slate-900/50 p-2 rounded">
                      <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">励志语录 (可编辑)</label>
                      <textarea
                        className="w-full bg-transparent border-none p-0 text-sm text-slate-300 focus:ring-0 resize-none font-medium italic"
                        rows={2}
                        value={w.quote || ''}
                        onChange={(e) => {
                          const newW = [...state.selectedWinners];
                          newW[idx].quote = e.target.value;
                          setState(p => ({ ...p, selectedWinners: newW }));
                        }}
                        placeholder="等待 AI 生成..."
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview Side */}
              <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>

                {state.selectedWinners.length > 0 ? (
                  <div className="relative z-10 animate-in zoom-in duration-500">
                    <p className="text-center text-blue-400 mb-6 text-xs font-black tracking-[0.2em] uppercase">
                      REALTIME PREVIEW MODE
                    </p>
                    {(() => {
                      // Find first winner with image, or fallback to first
                      const activeWinner = state.selectedWinners.find(w => w.imageUrl) || state.selectedWinners[0];
                      const tpl = TEMPLATES.find(t => t.id === state.selectedTemplateId) || TEMPLATES[0];
                      return <PosterCanvas winner={activeWinner} template={tpl} customBackground={state.customBackground} periodLabel={state.periodLabel} />;
                    })()}

                    {!state.selectedWinners.some(w => w.imageUrl) && (
                      <p className="text-center text-yellow-500 mt-6 text-xs animate-pulse">
                        * 请在左侧上传照片以查看完整效果
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-slate-600">
                    <ImageIcon size={64} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">请先在左侧上传学员照片</p>
                    <p className="text-sm opacity-50">上传后即可预览海报效果</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'GALLERY':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
              <div>
                <h2 className="text-3xl font-black flex items-center gap-3 text-white">
                  <Trophy className="text-yellow-400 fill-yellow-400" size={32} />
                  荣誉画廊 (Honor Gallery)
                </h2>
                <p className="text-slate-400 mt-1 ml-11">本月共产生 {state.selectedWinners.length} 位获奖学员</p>
              </div>
              <Button variant="secondary" onClick={() => setState(p => ({ ...p, step: 'IMPORT', currentMonthData: [], lastMonthData: new Map(), selectedWinners: [] }))}>
                开启新月份评选
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">
              {state.selectedWinners.map((w, idx) => {
                const tpl = TEMPLATES.find(t => t.id === state.selectedTemplateId) || TEMPLATES[0];
                return (
                  <div key={idx} className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                    <PosterCanvas winner={w} template={tpl} customBackground={state.customBackground} periodLabel={state.periodLabel} id={`poster-${idx}`} />
                  </div>
                );
              })}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0b1121] text-slate-200 font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-[#0f172a] border-r border-slate-800 flex flex-col h-auto md:h-screen sticky top-0 z-50 shadow-2xl">
        <div className="p-8 border-b border-slate-800 bg-[#0f172a]">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Trophy size={16} className="text-white" />
            </div>
            <h1 className="text-2xl font-black font-teko text-white tracking-widest italic">LYBC ADMIN</h1>
          </div>
          <p className="text-xs text-slate-500 pl-11">月度之星智能生成系统</p>
        </div>

        <nav className="flex-1 p-6 space-y-3">
          {[
            { id: 'IMPORT', label: '1. 数据导入', icon: FileSpreadsheet },
            { id: 'REVIEW', label: '2. 名单审核', icon: Users },
            { id: 'IMAGES', label: '3. 视觉工坊', icon: Wand2 },
            { id: 'GALLERY', label: '4. 荣誉画廊', icon: Trophy },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                // Allow navigation to IMAGES if we have winners (e.g. from demo mode)
                if (state.selectedWinners.length === 0 && item.id !== 'IMPORT') {
                  alert("请先导入数据或开启演示模式");
                  return;
                }
                setState(p => ({ ...p, step: item.id as any }));
              }}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl text-sm font-bold transition-all ${state.step === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 translate-x-1' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <item.icon size={20} />
              {item.label}
              {state.step === item.id && <ChevronRight size={16} className="ml-auto opacity-50" />}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800 text-[10px] text-slate-600 flex justify-between">
          <span>Powered by Gemini</span>
          <span>v2.1 BlueSox</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* Manual Add Modal */}
      {state.isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">手动添加获奖者</h3>
              <button onClick={() => setState(p => ({ ...p, isAddModalOpen: false }))} className="text-slate-400 hover:text-white">
                <X />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">学员姓名</label>
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                  placeholder="请输入姓名"
                  value={manualForm.name}
                  onChange={e => setManualForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">所属校区</label>
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                  placeholder="例如: 南山校区"
                  value={manualForm.campus}
                  onChange={e => setManualForm(p => ({ ...p, campus: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">奖项类型</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                    value={manualForm.awardType}
                    onChange={e => setManualForm(p => ({ ...p, awardType: e.target.value as AwardType }))}
                  >
                    <option value={AwardType.PRACTICE_STAR}>苦练之星</option>
                    <option value={AwardType.PROGRESS_STAR}>进步之星</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">数据数值</label>
                  <input
                    type="number"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                    value={manualForm.statValue}
                    onChange={e => setManualForm(p => ({ ...p, statValue: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleManualAdd} className="w-full py-3 justify-center">
                  确认添加
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon helper
const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);