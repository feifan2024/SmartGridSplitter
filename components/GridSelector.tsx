
import React from 'react';
import { GridType, GRID_LAYOUTS, GridConfig } from '../types';

interface GridSelectorProps {
  selectedType: GridType;
  selectedLayoutIndex: number;
  onSelectType: (type: GridType) => void;
  onSelectLayout: (index: number) => void;
}

const GridSelector: React.FC<GridSelectorProps> = ({
  selectedType,
  selectedLayoutIndex,
  onSelectType,
  onSelectLayout
}) => {
  const types = Object.values(GridType);
  const currentLayouts = GRID_LAYOUTS[selectedType];

  return (
    <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          1. 选择宫格类型
        </h3>
        <div className="flex flex-wrap gap-2">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => onSelectType(type)}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                selectedType === type
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {type} 宫格
            </button>
          ))}
        </div>
      </div>

      {currentLayouts.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            2. 选择排列方式
          </h3>
          <div className="flex gap-4">
            {currentLayouts.map((layout, idx) => (
              <button
                key={idx}
                onClick={() => onSelectLayout(idx)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                  selectedLayoutIndex === idx
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-100 bg-white hover:border-slate-200 text-slate-600'
                }`}
              >
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${layout.cols}, 1fr)` }}>
                  {Array.from({ length: layout.cols * layout.rows }).map((_, i) => (
                    <div key={i} className={`w-3 h-3 rounded-sm ${selectedLayoutIndex === idx ? 'bg-blue-400' : 'bg-slate-300'}`} />
                  ))}
                </div>
                <span className="font-medium">{layout.cols}列 x {layout.rows}行</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GridSelector;
