
import React, { useState, useEffect } from 'react';
import { Maximize2, Zap, LayoutGrid, ShieldCheck, ExternalLink, Settings, AlertCircle } from 'lucide-react';
import ImageSplitting from './components/ImageSplitting';
import BatchUpscaler from './components/BatchUpscaler';

type Page = 'splitting' | 'upscaling';

// Define the AIStudio interface for global window augmentation
interface AIStudio {
  hasSelectedApiKey(): Promise<boolean>;
  openSelectKey(): Promise<void>;
}

declare global {
  interface Window {
    // Fix: Remove readonly modifier to match the environment's existing declaration of aistudio
    aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('splitting');
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    checkKeyStatus();
  }, []);

  const checkKeyStatus = async () => {
    if (window.aistudio) {
      try {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } catch (e) {
        setHasKey(false);
      }
    } else {
      setHasKey(false);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // 规避 race condition: 触发后立即假设成功进入应用流程
        setHasKey(true);
      } catch (e) {
        console.error("Key selection failed", e);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f1f3f4]">
      {/* 纯净标签页导航区 */}
      <header className="bg-[#dee1e6] px-4 pt-3 flex flex-col">
        <div className="max-w-6xl mx-auto w-full flex items-end justify-between">
          <div className="flex items-end gap-1">
            <button
              onClick={() => setActivePage('splitting')}
              className={`relative flex items-center gap-2.5 px-8 py-2.5 min-w-[180px] rounded-t-xl transition-all duration-150 text-sm font-bold tracking-tight select-none ${
                activePage === 'splitting'
                  ? 'bg-white text-blue-600 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]'
                  : 'text-slate-600 hover:bg-[#cfd3d9]'
              }`}
            >
              <LayoutGrid size={16} className={activePage === 'splitting' ? 'text-blue-600' : 'text-slate-500'} />
              <span>图片切割工具</span>
              {activePage === 'splitting' && (
                <>
                  <div className="absolute -left-[10px] bottom-0 w-[10px] h-[10px] bg-white">
                    <div className="w-full h-full bg-[#dee1e6] rounded-br-xl"></div>
                  </div>
                  <div className="absolute -right-[10px] bottom-0 w-[10px] h-[10px] bg-white">
                    <div className="w-full h-full bg-[#dee1e6] rounded-bl-xl"></div>
                  </div>
                </>
              )}
            </button>

            <button
              onClick={() => setActivePage('upscaling')}
              className={`relative flex items-center gap-2.5 px-8 py-2.5 min-w-[180px] rounded-t-xl transition-all duration-150 text-sm font-bold tracking-tight select-none ${
                activePage === 'upscaling'
                  ? 'bg-white text-blue-600 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]'
                  : 'text-slate-600 hover:bg-[#cfd3d9]'
              }`}
            >
              <Maximize2 size={16} className={activePage === 'upscaling' ? 'text-blue-600' : 'text-slate-500'} />
              <span>批量 4K 重建</span>
              {activePage === 'upscaling' && (
                <>
                  <div className="absolute -left-[10px] bottom-0 w-[10px] h-[10px] bg-white">
                    <div className="w-full h-full bg-[#dee1e6] rounded-br-xl"></div>
                  </div>
                  <div className="absolute -right-[10px] bottom-0 w-[10px] h-[10px] bg-white">
                    <div className="w-full h-full bg-[#dee1e6] rounded-bl-xl"></div>
                  </div>
                </>
              )}
            </button>
          </div>

          <div className="mb-2 flex items-center gap-3">
             <button 
               onClick={handleSelectKey}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all shadow-sm ${
                 hasKey 
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' 
                  : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700 animate-pulse'
               }`}
             >
               {hasKey ? <Settings size={14} className="text-blue-500" /> : <Zap size={14} className="fill-current" />}
               <span className="text-[10px] font-bold uppercase tracking-wider">
                 {hasKey ? '配置 API 密钥' : '需要配置 API 密钥'}
               </span>
             </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 bg-white">
        <div className="max-w-6xl mx-auto w-full px-6 py-12">
          {hasKey === false && (
            <div className="mb-12 p-8 bg-amber-50 border border-amber-200 rounded-[2rem] flex flex-col md:flex-row items-center gap-6">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <AlertCircle size={32} />
              </div>
              <div className="flex-1">
                <h3 className="text-amber-900 font-black text-lg">尚未配置个人 API 密钥</h3>
                <p className="text-amber-800/70 text-sm mt-1 leading-relaxed">
                  为了使用 4K 高清细节重建功能，您需要配置自己的 Google Gemini API 密钥。本站不存储您的密钥，所有操作直接在您的账户中运行。
                </p>
                <div className="flex flex-wrap gap-4 mt-4">
                  <button 
                    onClick={handleSelectKey}
                    className="px-6 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors shadow-lg shadow-amber-200"
                  >
                    立即配置密钥
                  </button>
                  <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    className="flex items-center gap-1.5 px-4 py-2 text-amber-700 font-bold text-sm hover:underline"
                  >
                    查看计费说明 <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          )}
          
          <div key={activePage} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activePage === 'splitting' ? <ImageSplitting /> : <BatchUpscaler />}
          </div>
        </div>
      </main>

      <footer className="py-12 bg-white border-t border-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 opacity-30">
             <div className="flex items-center gap-4">
               <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">SmartGrid Studio v3.5</p>
               <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
               <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">User Key Auth Mode</p>
             </div>
             <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Powered by Gemini 3 Pro</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
