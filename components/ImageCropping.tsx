
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, X, RefreshCw, Trash2, CheckCircle, Crop, ImageIcon, AlertCircle, Move, Maximize2 } from 'lucide-react';
import { downloadDataUrl, createZipAndDownload } from '../utils/imageUtils';

interface CropData {
  x: number;
  y: number;
}

interface CropItem {
  id: string;
  name: string;
  originalUrl: string;
  croppedUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  cropData: CropData;
}

interface AspectRatio {
  label: string;
  ratio: number; // width / height
  css: string;
}

const RATIOS: AspectRatio[] = [
  { label: '1:1', ratio: 1/1, css: 'aspect-square' },
  { label: '4:5', ratio: 4/5, css: 'aspect-[4/5]' },
  { label: '3:4', ratio: 3/4, css: 'aspect-[3/4]' },
  { label: '4:3', ratio: 4/3, css: 'aspect-[4/3]' },
  { label: '9:16', ratio: 9/16, css: 'aspect-[9/16]' },
  { label: '16:9', ratio: 16/9, css: 'aspect-[16/9]' },
  { label: '21:9', ratio: 21/9, css: 'aspect-[21/9]' },
  { label: '2.35:1', ratio: 2.35/1, css: 'aspect-[2.35/1]' },
  { label: '2:3', ratio: 2/3, css: 'aspect-[2/3]' },
  { label: '3:2', ratio: 3/2, css: 'aspect-[3/2]' },
];

const ImageCropping: React.FC = () => {
  const [items, setItems] = useState<CropItem[]>([]);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>(RATIOS[0]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; initialX: number; initialY: number; moved: boolean } | null>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const remainingSlots = 20 - items.length;
    if (remainingSlots <= 0) return alert('已达到单次处理上限（20张）');

    files.slice(0, remainingSlots).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newItem: CropItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          originalUrl: ev.target?.result as string,
          status: 'pending',
          cropData: { x: 0, y: 0 }
        };
        setItems(prev => [...prev, newItem]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const performCrop = async (item: CropItem, ratio: AspectRatio): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const imgRatio = img.width / img.height;
        
        let dw, dh;
        if (imgRatio > ratio.ratio) {
          dh = img.height;
          dw = img.height * ratio.ratio;
        } else {
          dw = img.width;
          dh = img.width / ratio.ratio;
        }

        const zoom = 1.1;
        const sw = dw / zoom;
        const sh = dh / zoom;

        canvas.width = dw;
        canvas.height = dh;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas Context Error');

        const sx = (img.width - sw) / 2 - (item.cropData.x * (sw / 100));
        const sy = (img.height - sh) / 2 - (item.cropData.y * (sh / 100));

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
        resolve(canvas.toDataURL('image/png', 1.0));
      };
      img.onerror = () => reject('Image Load Error');
      img.src = item.originalUrl;
    });
  };

  const openZoomPreview = async (item: CropItem) => {
    setIsPreviewLoading(true);
    try {
      const url = await performCrop(item, selectedRatio);
      setPreviewImage(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const onMouseDown = (e: React.MouseEvent, id: string) => {
    const item = items.find(it => it.id === id);
    if (!item || item.status === 'processing') return;
    
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: item.cropData.x,
      initialY: item.cropData.y,
      moved: false
    };
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      
      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;
      
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragRef.current.moved = true;
      }

      const sensitivity = 0.2; 
      
      setItems(prev => prev.map(it => {
        if (it.id === id) {
          return {
            ...it,
            status: 'pending',
            cropData: {
              x: dragRef.current!.initialX + (dx * sensitivity),
              y: dragRef.current!.initialY + (dy * sensitivity)
            }
          };
        }
        return it;
      }));
    };

    const onMouseUp = () => {
      if (dragRef.current && !dragRef.current.moved) {
        openZoomPreview(item);
      }
      dragRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleProcessAll = async () => {
    if (items.length === 0 || isProcessingAll) return;
    setIsProcessingAll(true);
    for (const item of items) {
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'processing' } : it));
      try {
        const croppedUrl = await performCrop(item, selectedRatio);
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'completed', croppedUrl } : it));
      } catch (e) {
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error' } : it));
      }
    }
    setIsProcessingAll(false);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
        <div className="space-y-1.5 min-w-[240px]">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Crop size={20} className="text-blue-600" />
            高级裁切工坊
          </h2>
          <p className="text-slate-500 text-sm font-medium">拖拽图片定位，点击图片预览效果</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto overflow-hidden">
          <div className="bg-white p-1.5 rounded-2xl border border-slate-100 flex gap-1 shadow-sm mr-2 overflow-x-auto max-w-full no-scrollbar">
            {RATIOS.map((r) => (
              <button
                key={r.label}
                onClick={() => {
                  setSelectedRatio(r);
                  setItems(prev => prev.map(it => ({ ...it, status: 'pending', cropData: { x: 0, y: 0 } })));
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedRatio.label === r.label ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 ml-auto">
            {items.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(!showClearConfirm ? true : (setItems([]), false))}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold border transition-all text-sm ${
                  showClearConfirm ? 'bg-red-600 text-white animate-pulse' : 'bg-white text-red-500 border-red-100 hover:bg-red-50'
                }`}
              >
                {showClearConfirm ? <AlertCircle size={16} /> : <Trash2 size={16} />}
                <span>{showClearConfirm ? '确认？' : '清空'}</span>
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-3 bg-white text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-all border border-slate-200 flex items-center gap-2 text-sm"
            >
              <ImageIcon size={16} />
              添加
            </button>
            <button
              disabled={items.length === 0 || isProcessingAll}
              onClick={handleProcessAll}
              className={`px-6 py-3 rounded-xl font-black transition-all shadow-lg flex items-center gap-2 text-sm ${
                items.length === 0 || isProcessingAll ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-50'
              }`}
            >
              {isProcessingAll ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              确定全部
            </button>
          </div>
        </div>
      </div>

      <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFiles} />

      {items.length === 0 ? (
        <div onClick={() => fileInputRef.current?.click()} className="group flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-100 rounded-[2.5rem] cursor-pointer hover:bg-slate-50/50 transition-all">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
            <Upload size={32} />
          </div>
          <p className="text-slate-800 font-bold">点击或拖入图片开始裁切</p>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {items.map((item) => (
              <div key={item.id} className="group bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 transition-all hover:shadow-xl">
                <div 
                  className={`relative overflow-hidden bg-slate-100 cursor-move active:cursor-grabbing ${selectedRatio.css}`}
                  onMouseDown={(e) => onMouseDown(e, item.id)}
                >
                  <img 
                    src={item.originalUrl} 
                    draggable={false}
                    style={{
                      transform: `translate(${item.cropData.x}%, ${item.cropData.y}%) scale(1.1)`,
                      objectFit: 'cover',
                      width: '100%',
                      height: '100%'
                    }}
                    className="transition-transform duration-75 select-none"
                    alt="" 
                  />
                  
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 bg-white/40 backdrop-blur-md p-3 rounded-full text-white transition-opacity">
                      <Move size={20} />
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 flex gap-2">
                    {item.status === 'completed' && <div className="bg-green-500 text-white p-1.5 rounded-full shadow-lg"><CheckCircle size={14} /></div>}
                    <button
                      onClick={(e) => { e.stopPropagation(); openZoomPreview(item); }}
                      className="p-2 bg-white/90 backdrop-blur text-slate-800 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-white shadow-sm transition-all"
                    >
                      <Maximize2 size={14} />
                    </button>
                  </div>

                  <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setItems(prev => prev.filter(it => it.id !== item.id)); }}
                      className="p-2 bg-white/90 backdrop-blur text-red-500 rounded-xl hover:bg-red-500 hover:text-white shadow-sm"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); performCrop(item, selectedRatio).then(url => downloadDataUrl(url, `crop_${item.name}`)); }}
                      className="p-2 bg-white/90 backdrop-blur text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white shadow-sm"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="p-4 flex items-center justify-between border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px]">{item.name}</span>
                    <span className="text-[9px] text-blue-500 font-bold uppercase tracking-tighter">Click to Preview</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-300 uppercase">{selectedRatio.label}</span>
                </div>
              </div>
            ))}
          </div>

          {items.some(i => i.status === 'completed') && (
            <div className="flex justify-center pt-8 border-t border-slate-100">
              <button
                onClick={() => createZipAndDownload(items.filter(i => i.status === 'completed').map(i => i.croppedUrl!))}
                className="flex items-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-2xl active:scale-95"
              >
                <Download size={20} />
                打包下载已裁切图片
              </button>
            </div>
          )}
        </div>
      )}

      {/* 放大预览 Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/95 backdrop-blur-xl animate-in fade-in" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-8 right-8 text-white/50 hover:text-white bg-white/10 p-4 rounded-full transition-colors"><X size={28} /></button>
          <div className="max-w-4xl w-full flex flex-col items-center gap-6">
            <h3 className="text-white font-black text-xl tracking-tighter bg-white/10 px-6 py-2 rounded-full">裁切结果预览</h3>
            <div className="bg-white p-2 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <img src={previewImage} className="max-h-[70vh] rounded-2xl object-contain" alt="Preview" />
            </div>
            <p className="text-white/40 text-sm font-medium">所见即所得，点击任何位置返回</p>
          </div>
        </div>
      )}

      {isPreviewLoading && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <RefreshCw className="animate-spin text-white" size={48} />
        </div>
      )}
    </div>
  );
};

export default ImageCropping;
