import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, X, RefreshCw, Layers, Zap, Trash2, AlertCircle, LayoutGrid } from 'lucide-react';
import { GridType, GRID_LAYOUTS, SplitResult } from '../types';
import { splitImage, createZipAndDownload } from '../utils/imageUtils';
import { upscaleImage } from '../services/geminiService';

const ImageSplitting: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [gridType, setGridType] = useState<GridType>(GridType.G9);
  const [layoutIndex, setLayoutIndex] = useState(0);
  const [results, setResults] = useState<SplitResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
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
    setShowClearConfirm(false);
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProcess = async () => {
    if (!sourceImage) return;
    setIsProcessing(true);
    try {
      const layout = GRID_LAYOUTS[gridType][layoutIndex];
      const tiles = await splitImage(sourceImage, layout.cols, layout.rows);
      setResults(tiles.map((dataUrl, idx) => ({
        id: `tile-${idx}`,
        dataUrl,
        isUpscaling: false
      })));
    } catch (err) {
      console.error(err);
      alert('处理图片时发生错误');
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
      alert('高清增强失败');
    }
  };

  const handleDownloadAll = async () => {
    const urls = results.map(r => r.upscaledUrl || r.dataUrl);
    await createZipAndDownload(urls);
  };

  return (
    <div className="space-y-10">
      {/* 顶部控制栏 - 与高清增强等页面保持一致 */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="space-y-1.5 min-w-[220px]">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <LayoutGrid size={20} className="text-blue-600" />
            智能宫格拆解
          </h2>
          <p className="text-slate-500 text-sm font-medium">支持最高 20 宫格切割与本地 4K 高清像素重构</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* 宫格类型选择 - 增加 15, 16, 18, 20 */}
          <div className="bg-white p-1.5 rounded-2xl border border-slate-100 flex gap-1 shadow-sm overflow-x-auto no-scrollbar max-w-full lg:max-w-[550px]">
            {Object.values(GridType).map((type) => (
              <button
                key={type}
                onClick={() => { setGridType(type); setLayoutIndex(0); setResults([]); }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  gridType === type ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {type} 宫格
              </button>
            ))}
          </div>

          <div className="flex gap-2 ml-auto">
            {sourceImage && (
              <button
                onClick={handleClear}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold border transition-all text-sm ${
                  showClearConfirm ? 'bg-red-600 text-white animate-pulse border-red-600' : 'bg-white text-red-500 border-red-100 hover:bg-red-50 shadow-sm'
                }`}
              >
                {showClearConfirm ? <AlertCircle size={16} /> : <Trash2 size={16} />}
                <span>{showClearConfirm ? '确认？' : '清空'}</span>
              </button>
            )}
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-3 bg-white text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-all border border-slate-200 flex items-center gap-2 text-sm shadow-sm"
            >
              <Upload size={16} />
              上传图片
            </button>

            <button
              disabled={!sourceImage || isProcessing}
              onClick={handleProcess}
              className={`px-6 py-3 rounded-xl font-black transition-all shadow-lg flex items-center gap-2 text-sm ${
                !sourceImage || isProcessing ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-50'
              }`}
            >
              {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Layers size={16} />}
              立即拆解
            </button>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

      {/* 主展示区域 */}
      {!sourceImage && results.length === 0 ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="group flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-100 rounded-[2.5rem] cursor-pointer hover:bg-slate-50/50 hover:border-blue-200 transition-all shadow-sm"
        >
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-inner">
            <Upload size={32} />
          </div>
          <p className="text-slate-800 font-bold">点击或拖入待分割的宫格图</p>
          <p className="text-slate-400 text-xs mt-2 italic">支持 4/6/8/9/12/15/16/18/20 宫格处理</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* 排列方式微调 - 当有多种布局可选时显示 */}
          {GRID_LAYOUTS[gridType].length > 1 && (
            <div className="flex items-center gap-4 bg-slate-50/30 p-4 rounded-2xl border border-slate-100/50 shadow-sm animate-in fade-in slide-in-from-top-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">选择方向:</span>
              <div className="flex gap-2">
                {GRID_LAYOUTS[gridType].map((layout, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setLayoutIndex(idx); if(results.length > 0) handleProcess(); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      layoutIndex === idx ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${layout.cols}, 1fr)` }}>
                      {Array.from({ length: Math.min(layout.cols * layout.rows, 12) }).map((_, i) => (
                        <div key={i} className={`w-1 h-1 rounded-[1px] ${layoutIndex === idx ? 'bg-white/50' : 'bg-slate-300'}`} />
                      ))}
                    </div>
                    {layout.cols} 列 x {layout.rows} 行
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 结果网格 */}
          {results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 animate-in fade-in zoom-in-95 duration-500">
              {results.map((res, idx) => (
                <div key={res.id} className="group bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 transition-all hover:shadow-xl hover:shadow-slate-100 hover:-translate-y-1">
                  <div className="aspect-square relative overflow-hidden bg-slate-50">
                    <img src={res.upscaledUrl || res.dataUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                    {res.upscaledUrl && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 bg-blue-600 text-white text-[8px] font-black rounded-full flex items-center gap-1 shadow-lg border border-white/20">
                        <Zap size={10} className="fill-current" />
                        4K READY
                      </div>
                    )}
                    {res.isUpscaling && (
                      <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center px-6 text-center">
                        <RefreshCw className="animate-spin text-blue-600 w-8 h-8 mb-3" />
                        <span className="text-blue-900 text-[9px] font-black uppercase tracking-widest">高清增强中</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex items-center justify-between bg-white">
                    <span className="text-[9px] font-black text-slate-300 tracking-[0.2em] uppercase tracking-tighter">PART {idx + 1}</span>
                    <div className="flex gap-1.5">
                      {!res.upscaledUrl && !res.isUpscaling && (
                        <button 
                          type="button"
                          onClick={() => handleUpscale(res.id)} 
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                          title="4K 增强"
                        >
                          <Zap size={13} className="fill-current" />
                        </button>
                      )}
                      <button 
                        type="button"
                        onClick={() => setPreviewImage(res.upscaledUrl || res.dataUrl)} 
                        className="p-2 text-slate-500 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-lg transition-all"
                      >
                        <Layers size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             sourceImage && (
               <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-500">
                 <div className="aspect-video bg-slate-50 rounded-[2.5rem] border border-slate-100 overflow-hidden relative group shadow-sm">
                    <img src={sourceImage} className="w-full h-full object-contain" alt="Source" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                       <p className="text-white font-black text-lg tracking-widest uppercase">等待拆解</p>
                    </div>
                 </div>
                 <p className="text-center text-slate-400 text-sm mt-8 font-medium italic">调整上方宫格配置后，点击「立即拆解」按钮</p>
               </div>
             )
          )}

          {/* 底部操作 */}
          {results.length > 0 && (
            <div className="flex justify-center pt-12 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDownloadAll}
                className="group flex items-center gap-4 px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-2xl shadow-slate-200 active:scale-[0.98]"
              >
                <Download size={22} className="group-hover:translate-y-0.5 transition-transform" />
                下载所有 {results.length} 个切片
              </button>
            </div>
          )}
        </div>
      )}

      {/* 全屏预览 Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/98 backdrop-blur-2xl animate-in fade-in duration-300" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-8 right-8 text-white/50 hover:text-white bg-white/10 p-4 rounded-full transition-colors border border-white/5 shadow-2xl"><X size={28} /></button>
          <div className="max-w-4xl w-full flex flex-col items-center gap-6" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white/5 p-2 rounded-[2rem] shadow-2xl overflow-hidden border border-white/10">
              <img src={previewImage} className="max-h-[75vh] rounded-xl object-contain" alt="Preview" />
            </div>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em]">SmartGrid High-Res Preview</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageSplitting;