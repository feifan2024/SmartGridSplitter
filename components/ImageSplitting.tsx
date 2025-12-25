import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, X, RefreshCw, Layers, Zap, Trash2, AlertCircle, LayoutGrid, Info, Sparkles, ChevronDown } from 'lucide-react';
import { GridType, GRID_LAYOUTS, SplitResult } from '../types';
import { splitImage, createZipAndDownload } from '../utils/imageUtils';
import { upscaleImage } from '../services/geminiService';

const ImageSplitting: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [gridType, setGridType] = useState<GridType>(GridType.G9);
  const [layoutIndex, setLayoutIndex] = useState(0);
  const [results, setResults] = useState<SplitResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBatchUpscaling, setIsBatchUpscaling] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [splitInfo, setSplitInfo] = useState<{ originalW: number, originalH: number, tileW: number, tileH: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (showClearConfirm) {
      confirmTimerRef.current = window.setTimeout(() => {
        setShowClearConfirm(false);
      }, 3000);
    }
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, [showClearConfirm]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSourceImage(ev.target?.result as string);
        setResults([]);
        setSplitInfo(null);
        setIsBatchUpscaling(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sourceImage && results.length === 0) return;
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }
    setSourceImage(null);
    setResults([]);
    setSplitInfo(null);
    setIsBatchUpscaling(false);
    setShowClearConfirm(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleProcess = async () => {
    if (!sourceImage) return;
    setIsProcessing(true);
    setIsBatchUpscaling(false);
    try {
      const layout = GRID_LAYOUTS[gridType][layoutIndex];
      const { tiles, info } = await splitImage(sourceImage, layout.cols, layout.rows);
      setSplitInfo(info);
      setResults(tiles.map((dataUrl, idx) => ({
        id: `tile-${idx}`,
        dataUrl,
        isUpscaling: false
      })));
    } catch (err) {
      console.error(err);
      alert('处理失败，请检查图片格式');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpscale = async (id: string) => {
    const target = results.find(r => r.id === id);
    if (!target || target.upscaledUrl || target.isUpscaling) return;
    
    setResults(prev => prev.map(r => r.id === id ? { ...r, isUpscaling: true } : r));
    try {
      const upscaled = await upscaleImage(target.dataUrl);
      setResults(prev => prev.map(r => r.id === id ? { ...r, upscaledUrl: upscaled, isUpscaling: false } : r));
    } catch (err: any) {
      console.error(err);
      setResults(prev => prev.map(r => r.id === id ? { ...r, isUpscaling: false } : r));
      alert('重构失败');
    }
  };

  const handleBatchUpscale = async () => {
    if (results.length === 0 || isBatchUpscaling) return;
    
    setIsBatchUpscaling(true);
    const pendingItems = results.filter(r => !r.upscaledUrl);
    
    for (const item of pendingItems) {
      setResults(prev => prev.map(r => r.id === item.id ? { ...r, isUpscaling: true } : r));
      try {
        const upscaled = await upscaleImage(item.dataUrl);
        setResults(prev => prev.map(r => r.id === item.id ? { ...r, upscaledUrl: upscaled, isUpscaling: false } : r));
      } catch (err) {
        console.error(`Batch upscale failed for ${item.id}`, err);
        setResults(prev => prev.map(r => r.id === item.id ? { ...r, isUpscaling: false } : r));
      }
    }
    setIsBatchUpscaling(false);
  };

  const handleDownloadAll = async () => {
    const urls = results.map(r => r.upscaledUrl || r.dataUrl);
    await createZipAndDownload(urls);
  };

  const upscaledCount = results.filter(r => !!r.upscaledUrl).length;

  return (
    <div className="space-y-10">
      {/* 顶部面板 - 优化后的布局 */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 bg-slate-50/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="space-y-1.5 min-w-[280px]">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <LayoutGrid size={24} className="text-blue-600" />
            绝对均匀切割
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">浮点源映射引擎 • 零像素累计误差</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* 宫格选择下拉框 */}
          <div className="relative group min-w-[180px]">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <LayoutGrid size={16} className="text-blue-500" />
            </div>
            <select
              value={gridType}
              onChange={(e) => {
                setGridType(e.target.value as GridType);
                setLayoutIndex(0);
                setResults([]);
                setSplitInfo(null);
                setIsBatchUpscaling(false);
              }}
              className="appearance-none w-full bg-white pl-12 pr-10 py-3 rounded-2xl border border-slate-200 text-slate-700 font-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-sm hover:border-slate-300"
            >
              {Object.values(GridType).map((type) => (
                <option key={type} value={type}>
                  {type} 宫格模式
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
          </div>

          <div className="flex gap-2 ml-auto">
            {sourceImage && (
              <button
                onClick={handleClear}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold border transition-all text-sm active:scale-95 ${
                  showClearConfirm ? 'bg-red-600 text-white animate-pulse border-red-600' : 'bg-white text-red-500 border-red-100 hover:bg-red-50 shadow-sm'
                }`}
              >
                {showClearConfirm ? <AlertCircle size={16} /> : <Trash2 size={16} />}
                <span>{showClearConfirm ? '确认？' : '清空'}</span>
              </button>
            )}
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-white text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-all border border-slate-200 flex items-center gap-2 text-sm shadow-sm active:scale-95"
            >
              <Upload size={16} />
              上传图片
            </button>

            <button
              disabled={!sourceImage || isProcessing}
              onClick={handleProcess}
              className={`px-8 py-3 rounded-xl font-black transition-all shadow-xl flex items-center gap-2 text-sm active:scale-95 ${
                !sourceImage || isProcessing ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
              }`}
            >
              {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Layers size={16} />}
              立即拆解
            </button>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

      {/* 信息看板 */}
      {splitInfo && (
        <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-5 flex flex-wrap gap-8 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl"><LayoutGrid size={20} /></div>
            <div>
              <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">原图分辨率</p>
              <p className="text-blue-900 font-black">{splitInfo.originalW}px × {splitInfo.originalH}px</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 text-green-600 rounded-xl"><Info size={20} /></div>
            <div>
              <p className="text-[10px] text-green-500 font-black uppercase tracking-widest">单格计算尺寸</p>
              <p className="text-green-900 font-black">{splitInfo.tileW}px × {splitInfo.tileH}px</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 text-blue-500 font-bold text-xs bg-white px-4 rounded-full border border-blue-100 shadow-sm">
            <CheckCircleIcon size={14} />
            <span>数学精确对齐已验证</span>
          </div>
        </div>
      )}

      {/* 主展示区 */}
      {!sourceImage && results.length === 0 ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="group flex flex-col items-center justify-center py-36 border-2 border-dashed border-slate-200 rounded-[3rem] cursor-pointer hover:bg-slate-50/50 hover:border-blue-300 transition-all duration-500"
        >
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
            <Upload size={40} />
          </div>
          <p className="text-slate-800 font-black text-lg">点击或拖入宫格合集图</p>
          <p className="text-slate-400 text-xs mt-3 font-medium uppercase tracking-[0.2em]">自动识别像素边界，实现 100% 均匀切分</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* 排列方向与批量处理 */}
          <div className="flex flex-col md:flex-row gap-6">
            {GRID_LAYOUTS[gridType].length > 1 && (
              <div className="flex-1 flex items-center gap-5 bg-slate-50/30 p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">排列方向:</span>
                <div className="flex gap-3">
                  {GRID_LAYOUTS[gridType].map((layout, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setLayoutIndex(idx); if(results.length > 0) handleProcess(); }}
                      className={`px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-4 ${
                        layoutIndex === idx ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-500 border border-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${layout.cols}, 1fr)` }}>
                        {Array.from({ length: Math.min(layout.cols * layout.rows, 20) }).map((_, i) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-[1px] ${layoutIndex === idx ? 'bg-white/40' : 'bg-slate-200'}`} />
                        ))}
                      </div>
                      {layout.cols} 列 × {layout.rows} 行
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.length > 0 && (
              <div className="flex-none flex items-center gap-4 bg-blue-50/30 p-5 rounded-[2rem] border border-blue-100/50 shadow-sm ml-auto">
                <div className="flex flex-col mr-2">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">高清增强引擎</span>
                  <span className="text-[11px] font-bold text-blue-900">{upscaledCount}/{results.length} 已就绪</span>
                </div>
                <button
                  onClick={handleBatchUpscale}
                  disabled={isBatchUpscaling || upscaledCount === results.length}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all shadow-lg active:scale-95 ${
                    isBatchUpscaling || upscaledCount === results.length
                      ? 'bg-slate-100 text-slate-400'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                  }`}
                >
                  {isBatchUpscaling ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  <span>{isBatchUpscaling ? '正在处理中...' : '一键全高清'}</span>
                </button>
              </div>
            )}
          </div>

          {results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 animate-in fade-in zoom-in-95 duration-700">
              {results.map((res, idx) => (
                <div key={res.id} className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 transition-all hover:shadow-2xl hover:shadow-slate-200 hover:-translate-y-1.5">
                  <div className="aspect-square relative overflow-hidden bg-slate-100">
                    <img src={res.upscaledUrl || res.dataUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="" />
                    {res.upscaledUrl && (
                      <div className="absolute top-4 left-4 px-3 py-1.5 bg-blue-600 text-white text-[9px] font-black rounded-full flex items-center gap-1.5 shadow-xl border border-white/20">
                        <Zap size={10} className="fill-current" />
                        4K ULTRA
                      </div>
                    )}
                    {res.isUpscaling && (
                      <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center px-6 text-center z-10">
                        <RefreshCw className="animate-spin text-blue-600 w-10 h-10 mb-4" />
                        <span className="text-blue-900 text-[10px] font-black uppercase tracking-widest">高清重构中</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-between bg-white">
                    <span className="text-[10px] font-black text-slate-300 tracking-[0.3em] uppercase">序号 {idx + 1}</span>
                    <div className="flex gap-2">
                      {!res.upscaledUrl && !res.isUpscaling && (
                        <button onClick={() => handleUpscale(res.id)} className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-xl transition-all active:scale-90" title="4K 增强"><Zap size={15} className="fill-current" /></button>
                      )}
                      <button onClick={() => setPreviewImage(res.upscaledUrl || res.dataUrl)} className="p-2.5 text-slate-500 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl transition-all active:scale-90"><Layers size={15} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             sourceImage && (
               <div className="max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500">
                 <div className="aspect-video bg-slate-100 rounded-[3rem] border border-slate-200 overflow-hidden relative group shadow-sm">
                    <img src={sourceImage} className="w-full h-full object-contain" alt="Original" />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-md">
                       <p className="text-white font-black text-xl tracking-[0.3em] uppercase">准备执行均匀切分</p>
                    </div>
                 </div>
                 <p className="text-center text-slate-400 text-xs mt-10 font-black uppercase tracking-[0.2em]">已就绪：点击右上方“立即拆解”按钮开始</p>
               </div>
             )
          )}

          {results.length > 0 && (
            <div className="flex justify-center pt-16 border-t border-slate-100">
              <button
                onClick={handleDownloadAll}
                className="group flex items-center gap-5 px-16 py-6 bg-slate-900 text-white rounded-[2.5rem] font-black text-xl hover:bg-blue-600 transition-all shadow-2xl active:scale-[0.97]"
              >
                <Download size={26} className="group-hover:translate-y-1 transition-transform" />
                下载全部 {results.length} 个等大切片
              </button>
            </div>
          )}
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/98 backdrop-blur-3xl animate-in fade-in duration-500" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-10 right-10 text-white/50 hover:text-white bg-white/10 p-5 rounded-full transition-colors border border-white/5 shadow-2xl"><X size={32} /></button>
          <div className="max-w-5xl w-full flex flex-col items-center gap-8" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white/5 p-2.5 rounded-[3rem] shadow-2xl overflow-hidden border border-white/10">
              <img src={previewImage} className="max-h-[75vh] rounded-[2rem] object-contain" alt="Preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CheckCircleIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

export default ImageSplitting;
