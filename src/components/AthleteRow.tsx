import React from 'react';
import { Athlete, Attempt } from '../types';
import { Check, X, Minus, Trash2, LogOut, LogIn, Clock, Star } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  athlete: Athlete;
  currentHeight: number;
  onRecord: (athleteId: string, attempt: Attempt) => void;
  onUndo: (athleteId: string) => void;
  onToggleCheckout: (athleteId: string) => void;
  isOutTab?: boolean;
  formatHeight: (m: number) => string;
  isCurrentJumper?: boolean;
  isWaiting?: boolean;
}

export const AthleteRow: React.FC<Props> = ({
  athlete,
  currentHeight,
  onRecord,
  onUndo,
  onToggleCheckout,
  isOutTab,
  formatHeight,
  isCurrentJumper,
  isWaiting,
}) => {
  const isOut = athlete.status === 'out';
  const isFinished = athlete.status === 'finished';

  const outHeight = React.useMemo(() => {
    if (!isOut) return null;
    const hs = Object.keys(athlete.results).map(Number).sort((a, b) => b - a);
    for (const h of hs) {
      if ((athlete.results[h] || []).filter(a => a === 'X').length >= 3) return h;
    }
    return hs[0] || null;
  }, [athlete.results, isOut]);

  const personalBest = React.useMemo(() => {
    const cleared = Object.entries(athlete.results)
      .filter(([, attempts]) => (attempts as Attempt[]).includes('O'))
      .map(([h]) => Number(h));
    return cleared.length > 0 ? Math.max(...cleared) : 0;
  }, [athlete.results]);

  const displayHeight = isOutTab && outHeight !== null ? outHeight : currentHeight;
  const attempts = athlete.results[displayHeight] || [];
  const canAttempt = !isOut && !isFinished && !athlete.checkedOut && !isWaiting
    && attempts.length < 3 && !attempts.includes('O');

  // ── Current jumper: full card with large buttons ──────────────────────────
  if (isCurrentJumper && !isOut) {
    return (
      <div className="px-4 pt-4 pb-3 bg-blue-50 border-l-4 border-l-blue-500 transition-colors">
        {/* Top row: info + attempt boxes */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {athlete.bibNumber && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 text-blue-400 bg-blue-100">
                  #{athlete.bibNumber}
                </span>
              )}
              <span className="font-bold text-blue-700 text-base">{athlete.name}</span>
              {!athlete.checkedOut && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase animate-pulse shrink-0">
                  Now Jumping
                </span>
              )}
              {athlete.checkedOut && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded uppercase shrink-0">
                  <Clock size={10} /> Away
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              {athlete.school && <span className="text-xs uppercase tracking-wider text-blue-500">{athlete.school}</span>}
              {personalBest > 0 && !isOutTab && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                  <Star size={9} /> PB: {formatHeight(personalBest)}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1.5 items-center shrink-0">
            {[0, 1, 2].map((i) => (
              <div key={i} className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border',
                attempts[i] === 'O' ? 'bg-emerald-500 text-white border-emerald-600' :
                attempts[i] === 'X' ? 'bg-rose-500 text-white border-rose-600' :
                attempts[i] === '-' ? 'bg-slate-400 text-white border-slate-500' :
                'bg-white text-slate-300 border-blue-200',
              )}>
                {attempts[i] ?? ''}
              </div>
            ))}
          </div>
        </div>

        {/* Large action buttons */}
        <div className="flex gap-2 mt-3">
          {canAttempt && (
            <>
              <button
                onClick={() => onRecord(athlete.id, 'O')}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 active:scale-95 transition-all"
              >
                <Check size={22} />
                <span className="text-[10px] font-bold uppercase tracking-wide">Make</span>
              </button>
              <button
                onClick={() => onRecord(athlete.id, 'X')}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-rose-100 text-rose-700 rounded-xl hover:bg-rose-200 active:scale-95 transition-all"
              >
                <X size={22} />
                <span className="text-[10px] font-bold uppercase tracking-wide">Miss</span>
              </button>
              <button
                onClick={() => onRecord(athlete.id, '-')}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 active:scale-95 transition-all"
              >
                <Minus size={22} />
                <span className="text-[10px] font-bold uppercase tracking-wide">Pass</span>
              </button>
            </>
          )}
          {!isFinished && (
            <button
              onClick={() => onToggleCheckout(athlete.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl transition-all active:scale-95',
                canAttempt ? '' : 'flex-1',
                athlete.checkedOut ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-amber-100 text-amber-700 hover:bg-amber-200',
              )}
            >
              {athlete.checkedOut ? <LogIn size={22} /> : <LogOut size={22} />}
              <span className="text-[10px] font-bold uppercase tracking-wide">{athlete.checkedOut ? 'Check In' : 'Away'}</span>
            </button>
          )}
          {!athlete.checkedOut && (
            <button
              onClick={() => attempts.length > 0 && onUndo(athlete.id)}
              disabled={attempts.length === 0}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl transition-all',
                attempts.length > 0
                  ? 'bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 active:scale-95'
                  : 'bg-slate-50 text-slate-200 cursor-not-allowed',
              )}
            >
              <Trash2 size={22} />
              <span className="text-[10px] font-bold uppercase tracking-wide">Undo</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── All other athletes: compact single row ────────────────────────────────
  return (
    <div className={cn(
      'px-4 py-2.5 transition-colors',
      isOut ? 'bg-slate-50 opacity-60' :
      athlete.checkedOut ? 'bg-amber-50/50' :
      isWaiting ? 'bg-slate-50/80' :
      'bg-white hover:bg-slate-50/50',
    )}>
      <div className="flex items-center gap-2">
        {/* Athlete info */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'font-semibold text-sm truncate leading-snug',
            isWaiting ? 'text-slate-400' : isOut ? 'text-slate-500' : 'text-slate-900',
          )}>
            {athlete.bibNumber ? `#${athlete.bibNumber} ${athlete.name}` : athlete.name}
            {isWaiting && <span className="ml-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-1 py-0.5 rounded uppercase">Waiting</span>}
            {athlete.checkedOut && !isOut && <span className="ml-1 text-[10px] font-bold text-amber-600 bg-amber-100 px-1 py-0.5 rounded uppercase">Away</span>}
          </p>
          <p className={cn('text-[10px] uppercase tracking-wider truncate leading-snug', isWaiting ? 'text-slate-300' : 'text-slate-400')}>
            {isOutTab && outHeight !== null
              ? `Out @ ${formatHeight(outHeight)}`
              : athlete.school}
          </p>
        </div>

        {/* Attempt boxes — compact */}
        <div className="flex gap-1 shrink-0">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn(
              'w-7 h-7 rounded flex items-center justify-center text-xs font-bold border',
              attempts[i] === 'O' ? 'bg-emerald-500 text-white border-emerald-600' :
              attempts[i] === 'X' ? 'bg-rose-500 text-white border-rose-600' :
              attempts[i] === '-' ? 'bg-slate-400 text-white border-slate-500' :
              isWaiting ? 'bg-slate-50 text-slate-200 border-slate-100' :
              'bg-slate-100 text-slate-300 border-slate-200',
            )}>
              {attempts[i] ?? ''}
            </div>
          ))}
        </div>

        {/* Icon-only action buttons — compact: Make, Miss, Away only */}
        <div className="flex gap-1 shrink-0">
          {canAttempt && (
            <>
              <button onClick={() => onRecord(athlete.id, 'O')} className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 active:scale-95 transition-all" title="Make">
                <Check size={14} />
              </button>
              <button onClick={() => onRecord(athlete.id, 'X')} className="p-1.5 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 active:scale-95 transition-all" title="Miss">
                <X size={14} />
              </button>
            </>
          )}
          {!isOut && !isFinished && !isWaiting && (
            <button
              onClick={() => onToggleCheckout(athlete.id)}
              className={cn(
                'p-1.5 rounded-lg transition-all active:scale-95',
                athlete.checkedOut ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-amber-100 text-amber-700 hover:bg-amber-200',
              )}
              title={athlete.checkedOut ? 'Check In' : 'Check Out'}
            >
              {athlete.checkedOut ? <LogIn size={14} /> : <LogOut size={14} />}
            </button>
          )}
          {isOut && <span className="px-2 py-1 bg-slate-200 text-slate-500 text-[10px] font-bold rounded-full uppercase self-center">Out</span>}
          {isFinished && <span className="px-2 py-1 bg-blue-100 text-blue-600 text-[10px] font-bold rounded-full uppercase self-center">Done</span>}
        </div>
      </div>
    </div>
  );
};
