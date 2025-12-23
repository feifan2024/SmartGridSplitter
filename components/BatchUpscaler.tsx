
import React, { useState, useRef } from 'react';
import { Upload, Download, Maximize2, X, RefreshCw, Trash2, CheckCircle, Zap, Image as ImageIcon } from 'lucide-react';
import { upscaleImage } from '../services/geminiService';
import { downloadDataUrl, createZipAndDownload } from '../utils/imageUtils';

interface UpscaleItem {
  id: string;
  name: string;
  originalUrl: string;
  upscaledUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

const BatchUpscaler: React.FC = () => {
  const [items, setItems] = useState<UpscaleItem[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const remainingSlots = 20 - items.length;
    const filesToProcess = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      alert(`单次最多支持 20 张图片，已为您添加前 ${remainingSlots} 张。`);
    }

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newItem: UpscaleItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          originalUrl: ev.target?.result as string,
          status: 'pending'
        };
        setItems(prev => [...prev, newItem]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const processAll = async () => {
    if (items.length === 0) return;
    setIsProcessingAll(true);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === 'completed') continue;

      setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'processing' } : it));

      try {
        const upscaled = await upscaleImage(item.originalUrl);
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'completed', upscaledUrl: upscaled } : it));
      } catch (err) {
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error' } : it));
      }
    }
    setIsProcessingAll(false);
  };

  const downloadAll = async () => {
    const urls = items.filter(i => i.status === 'completed').map(i => i.upscaledUrl!);
    if (urls.length === 0) return;
    await createZipAndDownload(urls);
  };

  const completedCount = items.filter(i => i.status === 'completed').length;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Zap size={20} className="text-blue-600 fill-current" />
            批量 4K 细节重建
          </h2>
          <p className="text-slate-500 text-sm font-medium">采用神经网络合成技术重构模糊图像，达成 Ultra HD 画质</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-all border border-slate-200"
          >
            <ImageIcon size={18} />
            导入待增强图
          </button>
          <button
            disabled={items.length === 0 || isProcessingAll}
            onClick={processAll}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-black transition-all shadow-lg ${
              items.length === 0 || isProcessingAll 
                ? 'bg-slate-100 text-slate-400' 
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-blue-50'
            }`}
          >
            {isProcessingAll ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} className="fill-current" />}
            {isProcessingAll ? '细节重构中...' : '开始全部重建'}
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
          <p className="text-slate-800 font-bold">点击或拖入低分辨率图片</p>
          <p className="text-slate-400 text-xs mt-1 italic">神经网络将为你重建每一个丢失的像素点</p>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {items.map((item) => (
              <div key={item.id} className="relative group aspect-square rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md">
                <img src={item.status === 'completed' ? item.upscaledUrl : item.originalUrl} className="w-full h-full object-cover" alt="" />
                
                {item.status === 'processing' && (
                  <div className="absolute inset-0 bg-blue-600/60 backdrop-blur-sm flex flex-col items-center justify-center px-4 text-center">
                    <RefreshCw className="animate-spin text-white mb-2" size={24} />
                    <span className="text-white text-[9px] font-black uppercase tracking-widest">Reconstructing</span>
                  </div>
                )}
                
                {item.status === 'completed' && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-green-500 text-white text-[8px] font-bold rounded shadow-lg">4K DONE</div>
                )}

                {!isProcessingAll && item.status !== 'completed' && (
                  <button 
                    onClick={() => removeFile(item.id)}
                    className="absolute top-3 right-3 p-2 bg-white/90 text-slate-400 hover:text-red-500 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                
                {item.status === 'completed' && (
                  <button 
                    onClick={() => downloadDataUrl(item.upscaledUrl!, `4k-${item.name}`)}
                    className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg shadow-lg"
                  >
                    <Download size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {completedCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-slate-900 text-white rounded-2xl gap-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-400" size={20} />
                <span className="font-bold text-sm tracking-tight">成功合成 {completedCount} 张 4K 超清图像</span>
              </div>
              <button 
                onClick={downloadAll}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-blue-50 transition-all"
              >
                <Download size={18} />
                全部打包导出 ({completedCount})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BatchUpscaler;
