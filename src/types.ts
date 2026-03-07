export type Attempt = 'O' | 'X' | '-' | null;
export type Unit = 'metric' | 'imperial';

export interface Athlete {
  id: string;
  name: string;
  school?: string;
  bibNumber?: string;
  results: Record<number, Attempt[]>;
  status: 'active' | 'out' | 'finished';
  consecutiveMisses: number;
  checkedOut?: boolean;
}

export interface CompetitionState {
  currentHeight: number;
  heights: number[];
  athletes: Athlete[];
  startTime: string;
}
