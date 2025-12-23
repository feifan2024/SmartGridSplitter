export enum GridType {
  G4 = '4',
  G6 = '6',
  G8 = '8',
  G9 = '9',
  G12 = '12',
  G15 = '15',
  G16 = '16',
  G18 = '18',
  G20 = '20'
}

export interface GridConfig {
  cols: number;
  rows: number;
}

export interface SplitResult {
  id: string;
  dataUrl: string;
  upscaledUrl?: string;
  isUpscaling: boolean;
}

export const GRID_LAYOUTS: Record<GridType, GridConfig[]> = {
  [GridType.G4]: [{ cols: 2, rows: 2 }],
  [GridType.G6]: [{ cols: 3, rows: 2 }, { cols: 2, rows: 3 }],
  [GridType.G8]: [{ cols: 4, rows: 2 }, { cols: 2, rows: 4 }],
  [GridType.G9]: [{ cols: 3, rows: 3 }],
  [GridType.G12]: [{ cols: 4, rows: 3 }, { cols: 3, rows: 4 }],
  [GridType.G15]: [{ cols: 5, rows: 3 }, { cols: 3, rows: 5 }],
  [GridType.G16]: [{ cols: 4, rows: 4 }],
  [GridType.G18]: [{ cols: 6, rows: 3 }, { cols: 3, rows: 6 }],
  [GridType.G20]: [{ cols: 5, rows: 4 }, { cols: 4, rows: 5 }]
};