
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, X, RefreshCw, Trash2, CheckCircle, Scissors, ImageIcon, AlertCircle } from 'lucide-react';
import { removeBackground } from '@imgly/background-removal';
import { createZipAndDownload, downloadDataUrl } from '../utils/imageUtils';

interface SegItem {
  id: string;
  name: string;
  originalUrl: string;
  segmentedUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

const BackgroundRemoval: React.FC = () => {
  const [items, setItems] = useState<SegItem[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processVersionRef = useRef(0);
  const confirmTimerRef = useRef<number | null>(null);

  // 自动重置确认状态
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

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const remainingSlots = 20 - items.length;
    if (remainingSlots <= 0) {
      alert('已达到单次处理上限（20张）');
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    
    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newItem: SegItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          originalUrl: ev.target?.result as string,
          status: 'pending'
        };
        setItems(prev => [...prev, newItem]);
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!items.length) return;
    
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }

    // 执行清空
    processVersionRef.current += 1;
    setItems([]);
    setIsProcessingAll(false);
    setShowClearConfirm(false);
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processAll = async () => {
    if (items.length === 0 || isProcessingAll) return;
    
    setIsProcessingAll(true);
    setLoadingModel(true);
    const currentVersion = processVersionRef.current;
    const snapshot = [...items];

    for (let i = 0; i < snapshot.length; i++) {
      if (currentVersion !== processVersionRef.current) break;

      const item = snapshot[i];
      if (item.status === 'completed') continue;

      setItems(prev => {
        if (currentVersion !== processVersionRef.current) return prev;
        return prev.map(it => it.id === item.id ? { ...it, status: 'processing' } : it);
      });

      try {
        const blob = await removeBackground(item.originalUrl, {
          progress: (p) => {
            if (p > 0.1) setLoadingModel(false);
          }
        });
        
        const segmentedUrl = URL.createObjectURL(blob);
        
        if (currentVersion !== processVersionRef.current) break;
        
        setItems(prev => {
          if (currentVersion !== processVersionRef.current) return prev;
          return prev.map(it => it.id === item.id ? { ...it, status: 'completed', segmentedUrl } : it);
        });
      } catch (err) {
        console.error("Background removal error:", err);
        if (currentVersion !== processVersionRef.current) break;
        setItems(prev => {
          if (currentVersion !== processVersionRef.current) return prev;
          return prev.map(it => it.id === item.id ? { ...it, status: 'error' } : it);
        });
      } finally {
        setLoadingModel(false);
      }
    }
    
    if (currentVersion === processVersionRef.current) {
      setIsProcessingAll(false);
    }
  };

  const downloadSingle = (item: SegItem) => {
    if (item.segmentedUrl) {
      const fileName = `no_bg_${item.name.replace(/\.[^/.]+$/, "")}.png`;
      downloadDataUrl(item.segmentedUrl, fileName);
    }
  };

  const downloadAll = async () => {
    const completedItems = items.filter(i => i.status === 'completed' && i.segmentedUrl);
    if (completedItems.length === 0) return;
    
    const fetchPromises = completedItems.map(async (item) => {
      const response = await fetch(item.segmentedUrl!);
      const blob = await response.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    });

    const base64s = await Promise.all(fetchPromises);
    await createZipAndDownload(base64s);
  };

  const completedCount = items.filter(i => i.status === 'completed').length;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Scissors size={20} className="text-blue-600" />
            智能一键抠图
          </h2>
          <p className="text-slate-500 text-sm font-medium">采用本地端 AI 抠图引擎，自动识别主体，导出透明 PNG</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold transition-all border shadow-sm active:scale-95 ${
                showClearConfirm 
                ? 'bg-red-600 text-white border-red-600 animate-pulse' 
                : 'bg-white text-red-500 border-red-100 hover:bg-red-50'
              }`}
            >
              {showClearConfirm ? <AlertCircle size={18} /> : <Trash2 size={18} />}
              <span>{showClearConfirm ? '确认清空？' : '清空列表'}</span>
            </button>
          )}
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-all border border-slate-200"
          >
            <ImageIcon size={18} />
            添加图片
          </button>
          
          <button
            type="button"
            disabled={items.length === 0 || isProcessingAll}
            onClick={processAll}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-black transition-all shadow-lg ${
              items.length === 0 || isProcessingAll 
                ? 'bg-slate-100 text-slate-400' 
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-blue-50'
            }`}
          >
            {isProcessingAll ? <RefreshCw size={18} className="animate-spin" /> : <Scissors size={18} />}
            {isProcessingAll ? (loadingModel ? '加载 AI 模型中...' : '正在抠图...') : '开始全部抠图'}
          </button>
        </div>
      </div>

      <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFiles} />

      {items.length === 0 ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="group flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-100 rounded-[2.5rem] cursor-pointer hover:bg-slate-50/50 hover:border-blue-200 transition-all"
        >
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
            <Upload size={32} />
          </div>
          <p className="text-slate-800 font-bold">点击或拖入需要抠图的图片</p>
          <p className="text-slate-400 text-xs mt-1 italic">本地 WASM 引擎，首次使用需下载约 10MB AI 模型</p>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {items.map((item) => (
              <div key={item.id} className="relative group aspect-square rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md">
                <div className={`w-full h-full ${item.status === 'completed' ? 'checkerboard' : ''}`}>
                  <img 
                    src={item.status === 'completed' && item.segmentedUrl ? item.segmentedUrl : item.originalUrl} 
                    className="w-full h-full object-contain" 
                    alt="" 
                  />
                </div>
                
                {item.status === 'processing' && (
                  <div className="absolute inset-0 bg-blue-600/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                    <RefreshCw className="animate-spin mb-2" size={24} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">智能分析中...</span>
                  </div>
                )}
                
                {item.status === 'completed' && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white p-1 rounded-full shadow-lg">
                    <CheckCircle size={16} />
                  </div>
                )}

                {item.status === 'error' && (
                  <div className="absolute inset-0 bg-red-500/80 backdrop-blur-sm flex flex-col items-center justify-center text-white text-center px-4">
                    <X size={24} className="mb-2" />
                    <span className="text-[10px] font-black uppercase">分析失败</span>
                  </div>
                )}

                {/* 悬浮控制按钮组 */}
                <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(item.id); }}
                    className="p-2 bg-white/90 backdrop-blur text-red-500 rounded-xl hover:bg-red-500 hover:text-white shadow-sm transition-colors"
                    title="删除图片"
                  >
                    <Trash2 size={14} />
                  </button>
                  {item.status === 'completed' && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); downloadSingle(item); }}
                      className="p-2 bg-white/90 backdrop-blur text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white shadow-sm transition-colors"
                      title="下载单图"
                    >
                      <Download size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {completedCount > 0 && (
            <div className="flex justify-center pt-8">
              <button
                type="button"
                onClick={downloadAll}
                className="flex items-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-2xl shadow-slate-200 active:scale-[0.98]"
              >
                <Download size={20} />
                打包下载 {completedCount} 张透明图
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BackgroundRemoval;
