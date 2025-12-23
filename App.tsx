
import React, { useState } from 'react';
import { Maximize2, LayoutGrid } from 'lucide-react';
import ImageSplitting from './components/ImageSplitting';
import BatchUpscaler from './components/BatchUpscaler';

type Page = 'splitting' | 'upscaling';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('splitting');

  return (
    <div className="min-h-screen flex flex-col bg-[#f1f3f4]">
      {/* 头部导航 */}
      <header className="bg-[#dee1e6] px-4 pt-3 flex flex-col">
        <div className="max-w-6xl mx-auto w-full flex items-end">
          <div className="flex items-end gap-1">
            <button
              onClick={() => setActivePage('splitting')}
              className={`relative flex items-center gap-2.5 px-8 py-2.5 min-w-[180px] rounded-t-xl transition-all duration-150 text-sm font-bold tracking-tight select-none ${
                activePage === 'splitting' ? 'bg-white text-blue-600 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]' : 'text-slate-600 hover:bg-[#cfd3d9]'
              }`}
            >
              <LayoutGrid size={16} />
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
                activePage === 'upscaling' ? 'bg-white text-blue-600 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]' : 'text-slate-600 hover:bg-[#cfd3d9]'
              }`}
            >
              <Maximize2 size={16} />
              <span>批量高清增强</span>
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
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-1 bg-white relative">
        <div className="max-w-6xl mx-auto w-full px-6 py-12">
          <div key={activePage} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activePage === 'splitting' ? <ImageSplitting /> : <BatchUpscaler />}
          </div>
        </div>
      </main>

      <footer className="py-12 bg-white border-t border-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 opacity-30">
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">SmartGrid Studio v4.0 - Local Engine</p>
             <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">纯本地处理 • 保护隐私</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
