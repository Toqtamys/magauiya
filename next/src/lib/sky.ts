// мост между карточками и небом: наведение на карточку подсвечивает звезду инструмента
type SkyApi = { focus: (i: number) => void; setLabels: (l: string[]) => void; destroy: () => void };
let api: SkyApi | null = null;
export const setSky = (a: SkyApi | null) => { api = a; };
export const focusStar = (i: number) => api?.focus(i);
export type { SkyApi };
