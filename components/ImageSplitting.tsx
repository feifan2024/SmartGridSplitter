
import React, { useState, useRef } from 'react';
import { Upload, Download, X, RefreshCw, Layers, Zap } from 'lucide-react';
import GridSelector from './GridSelector';
import { GridType, GRID_LAYOUTS, SplitResult } from '../types';
import { splitImage, downloadDataUrl, createZipAndDownload } from '../utils/imageUtils';
import { upscaleImage } from '../services/geminiService';

const ImageSplitting: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [gridType, setGridType] = useState<GridType>(GridType.G9);
  const [layoutIndex, setLayoutIndex] = useState(0);
  const [results, setResults] = useState<SplitResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="space-y-12">
      <section className="grid lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`relative group cursor-pointer aspect-video rounded-[2.5rem] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center p-8 ${
              sourceImage ? 'border-blue-100 bg-blue-50/10 shadow-sm' : 'border-slate-200 bg-slate-50/30 hover:border-blue-400 hover:bg-white hover:shadow-xl hover:shadow-blue-50'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            {sourceImage ? (
              <div className="relative w-full h-full">
                <img src={sourceImage} className="w-full h-full object-contain rounded-2xl" alt="Upload" />
                <div className="absolute inset-0 bg-blue-600/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                  <div className="bg-white px-6 py-2 rounded-full text-blue-600 font-bold shadow-lg">点击更换图片</div>
                </div>
              </div>
            ) : (
              <div className="text-center group">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Upload size={28} />
                </div>
                <p className="text-slate-700 font-black">上传待切割的宫格图</p>
                <p className="text-slate-400 text-xs mt-1">支持 4/6/8/9/12 宫格布局</p>
              </div>
            )}
          </div>

          <GridSelector 
            selectedType={gridType} 
            selectedLayoutIndex={layoutIndex}
            onSelectType={(t) => { setGridType(t); setLayoutIndex(0); }}
            onSelectLayout={setLayoutIndex}
          />

          <button
            disabled={!sourceImage || isProcessing}
            onClick={handleProcess}
            className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all duration-300 ${
              !sourceImage 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-slate-900 text-white shadow-xl shadow-slate-100 hover:bg-blue-600 active:scale-[0.98]'
            }`}
          >
            {isProcessing ? <RefreshCw className="animate-spin" size={20} /> : <Layers size={20} />}
            {isProcessing ? '图片拆解中...' : '开始拆解图片'}
          </button>
        </div>

        <div className="hidden lg:flex flex-col justify-center">
          <div className="p-10 bg-slate-50 border border-slate-100 rounded-[2.5rem] relative overflow-hidden group">
            <h2 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3 relative z-10">
              <Zap size={22} className="text-blue-600 fill-current" />
              本地 4K 高清引擎
            </h2>
            <ul className="space-y-6 relative z-10">
              {[
                { title: "像素重构技术", desc: "采用高质量插值算法，在缩放过程中保持边缘锐利，减少锯齿。" },
                { title: "4K 级超清输出", desc: "将每一个宫格切片自动拉伸至超高清分辨率，满足专业打印需求。" },
                { title: "隐私离线处理", desc: "所有增强过程均在您的浏览器本地完成，无需上传云端，无泄露风险。" },
                { title: "零费用无限使用", desc: "不消耗 API 额度，无并发限制，处理速度受限于您的硬件性能。" }
              ].map((item, i) => (
                <li key={i} className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 shadow-lg shadow-blue-100">{i + 1}</div>
                  <div>
                    <p className="text-slate-800 font-bold text-sm">{item.title}</p>
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {results.length > 0 && (
        <section className="space-y-10 pt-12 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">重建中心</h2>
              <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">Local Reconstruction Center • {results.length} Tiles</p>
            </div>
            <button 
              onClick={handleDownloadAll}
              className="flex items-center gap-2.5 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
            >
              <Download size={20} />
              打包下载所有切片
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {results.map((res, idx) => (
              <div key={res.id} className="group bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 transition-all hover:shadow-xl hover:shadow-slate-100">
                <div className="aspect-square relative overflow-hidden bg-slate-50">
                  <img src={res.upscaledUrl || res.dataUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                  {res.upscaledUrl && (
                    <div className="absolute top-4 left-4 px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center gap-1.5 shadow-lg">
                      <Zap size={10} className="fill-current" />
                      4K RECONSTRUCTED
                    </div>
                  )}
                  {res.isUpscaling && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center px-6 text-center">
                      <RefreshCw className="animate-spin text-blue-600 w-10 h-10 mb-4" />
                      <span className="text-blue-900 text-xs font-black uppercase tracking-tighter">本地增强中...</span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase">Part {idx + 1}</span>
                  <div className="flex gap-2">
                    {!res.upscaledUrl && !res.isUpscaling && (
                      <button 
                        onClick={() => handleUpscale(res.id)} 
                        className="p-3 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                        title="高清增强"
                      >
                        <Zap size={16} className="fill-current" />
                      </button>
                    )}
                    <button 
                      onClick={() => setPreviewImage(res.upscaledUrl || res.dataUrl)} 
                      className="p-3 text-slate-500 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm"
                    >
                      <Layers size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/98 backdrop-blur-xl animate-in fade-in" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-8 right-8 text-white/50 hover:text-white bg-white/10 p-4 rounded-full transition-colors"><X size={28} /></button>
          <img src={previewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain border border-white/5" onClick={(e) => e.stopPropagation()} alt="" />
        </div>
      )}
    </div>
  );
};

export default ImageSplitting;
