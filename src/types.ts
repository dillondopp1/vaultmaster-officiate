export type Attempt = 'O' | 'X' | '-' | null;
export type Unit = 'metric' | 'imperial';

export type EventType =
  | 'pole-vault' | 'high-jump'
  | 'long-jump' | 'triple-jump'
  | 'shot-put' | 'discus' | 'javelin' | 'hammer';

export const HEIGHT_EVENTS: EventType[] = ['pole-vault', 'high-jump'];

export interface Athlete {
  id: string;
  name: string;
  school?: string;
  bibNumber?: string;
  results: Record<number, Attempt[]>;
  status: 'active' | 'out' | 'finished';
  consecutiveMisses: number;
  checkedOut?: boolean;
  entryHeight?: number; // height in meters where athlete enters; undefined = competes from opening height
  markValues?: Record<number, number>; // attempt index (0,1,2) → distance in meters (distance events only)
}

export interface CompetitionState {
  currentHeight: number;
  heights: number[];
  athletes: Athlete[];
  startTime: string;
}
