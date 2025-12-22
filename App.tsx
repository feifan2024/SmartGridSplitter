
import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, Maximize2, X, RefreshCw, Layers } from 'lucide-react';
import GridSelector from './components/GridSelector';
import { GridType, GRID_LAYOUTS, SplitResult } from './types';
import { splitImage, downloadDataUrl, createZipAndDownload } from './utils/imageUtils';
import { upscaleImage } from './services/geminiService';

const App: React.FC = () => {
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
    } catch (err) {
      console.error(err);
      setResults(prev => prev.map(r => r.id === id ? { ...r, isUpscaling: false } : r));
      alert('AI 无损放大失败，请检查网络或 API Key');
    }
  };

  const handleDownloadAll = async () => {
    const urls = results.map(r => r.upscaledUrl || r.dataUrl);
    await createZipAndDownload(urls);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Layers className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">SmartGrid Splitter</h1>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm font-medium text-slate-500">
            <span>支持 4 / 6 / 8 / 9 / 12 宫格</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span>Gemini AI 5倍无损放大</span>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        <section className="grid lg:grid-cols-2 gap-10">
          {/* Left Column: Upload and Controls */}
          <div className="space-y-8">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`relative group cursor-pointer aspect-video rounded-3xl border-4 border-dashed transition-all flex flex-col items-center justify-center p-8 ${
                sourceImage ? 'border-blue-100 bg-blue-50/30' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
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
                  <img src={sourceImage} className="w-full h-full object-contain rounded-xl shadow-lg" alt="Upload" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                    <span className="text-white font-medium">点击更换图片</span>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="text-blue-600 w-8 h-8" />
                  </div>
                  <p className="text-slate-600 font-medium text-lg">点击或拖拽图片到这里</p>
                  <p className="text-slate-400 text-sm mt-1">支持 JPG, PNG, WEBP (建议高分辨率)</p>
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
              className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                !sourceImage ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95'
              }`}
            >
              {isProcessing ? <RefreshCw className="animate-spin" /> : <Maximize2 />}
              {isProcessing ? '正在拆分...' : '立即开始拆分'}
            </button>
          </div>

          {/* Right Column: Information */}
          <div className="hidden lg:flex flex-col justify-center space-y-6">
            <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-blue-100/50">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">使用说明</h2>
              <ul className="space-y-4">
                <li className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs flex-shrink-0 mt-1">1</div>
                  <p className="text-slate-600">上传包含多宫格内容的图片（如九宫格合照）。</p>
                </li>
                <li className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs flex-shrink-0 mt-1">2</div>
                  <p className="text-slate-600">选择对应的宫格数量及布局（横屏/竖屏）。</p>
                </li>
                <li className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs flex-shrink-0 mt-1">3</div>
                  <p className="text-slate-600">点击“5倍无损放大”利用 Gemini AI 提升画质。</p>
                </li>
                <li className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs flex-shrink-0 mt-1">4</div>
                  <p className="text-slate-600">预览结果，可单张下载或一键打包。打包将自动包含已放大的版本。</p>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Results Section */}
        {results.length > 0 && (
          <section className="space-y-8 pt-10 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                拆分预览
                <span className="text-sm font-normal text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  共 {results.length} 张图片
                </span>
              </h2>
              <button 
                onClick={handleDownloadAll}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-900 transition-all shadow-lg shadow-slate-200"
              >
                <Download size={18} />
                一键打包下载 (ZIP)
              </button>
            </div>

            <div 
              className="grid gap-6" 
              style={{ 
                gridTemplateColumns: `repeat(auto-fill, minmax(240px, 1fr))` 
              }}
            >
              {results.map((res, idx) => (
                <div key={res.id} className="group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="aspect-square relative overflow-hidden bg-slate-50">
                    <img 
                      src={res.upscaledUrl || res.dataUrl} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                      alt={`Result ${idx + 1}`} 
                    />
                    {res.upscaledUrl && (
                      <div className="absolute top-3 left-3 px-2 py-1 bg-green-500 text-white text-[10px] font-bold rounded uppercase tracking-wider shadow-sm">
                        5倍分辨率提升
                      </div>
                    )}
                    {res.isUpscaling && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                        <RefreshCw className="animate-spin text-blue-600 w-8 h-8 mb-2" />
                        <span className="text-blue-700 text-xs font-bold">5倍无损放大中...</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 flex items-center justify-between bg-white">
                    <span className="text-sm font-semibold text-slate-400">#{idx + 1}</span>
                    <div className="flex gap-2">
                      {!res.upscaledUrl && !res.isUpscaling && (
                        <button 
                          onClick={() => handleUpscale(res.id)}
                          title="5倍无损放大"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Maximize2 size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => setPreviewImage(res.upscaledUrl || res.dataUrl)}
                        title="查看大图"
                        className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <Layers size={18} />
                      </button>
                      <button 
                        onClick={() => downloadDataUrl(res.upscaledUrl || res.dataUrl, `tile-${idx + 1}.png`)}
                        title="下载此图"
                        className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <button 
            onClick={() => setPreviewImage(null)}
            className="absolute top-6 right-6 p-2 text-white/50 hover:text-white transition-colors"
          >
            <X size={32} />
          </button>
          <div className="max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} className="max-w-full max-h-full rounded-xl shadow-2xl object-contain border border-white/10" alt="Preview" />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-100 py-10 text-center">
        <p className="text-slate-400 text-sm">Powered by Gemini AI Engine & SmartGrid Tech</p>
      </footer>
    </div>
  );
};

export default App;
