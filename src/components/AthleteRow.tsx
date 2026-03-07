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

  const hasSecondaryActions = (!isOut && !isFinished && !isWaiting) || (attempts.length > 0 && !athlete.checkedOut && !isOut && !isWaiting);
  const showActionRow = canAttempt || hasSecondaryActions || isOut || isFinished;

  return (
    <div className={cn(
      'px-4 pt-4 pb-3 transition-colors',
      isCurrentJumper && !isOut
        ? 'bg-blue-50 border-l-4 border-l-blue-500'
        : isOut
        ? 'bg-slate-50 opacity-60'
        : athlete.checkedOut
        ? 'bg-amber-50/50'
        : isWaiting
        ? 'bg-slate-50/80'
        : 'bg-white',
    )}>
      {/* Top row: athlete info + attempt boxes */}
      <div className="flex items-start justify-between gap-3">
        {/* Athlete info */}
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {athlete.bibNumber && (
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
                isWaiting ? 'text-slate-300 bg-slate-100' : 'text-slate-400 bg-slate-100',
              )}>
                #{athlete.bibNumber}
              </span>
            )}
            <span className={cn(
              'font-semibold',
              isCurrentJumper && !isOut ? 'text-blue-700 text-base' : isWaiting ? 'text-slate-400' : 'text-slate-900',
            )}>
              {athlete.name}
            </span>
            {isCurrentJumper && !isOut && !athlete.checkedOut && (
              <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase animate-pulse shrink-0">
                Now Jumping
              </span>
            )}
            {isWaiting && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase shrink-0">
                Waiting
              </span>
            )}
            {athlete.checkedOut && !isOut && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded uppercase shrink-0">
                <Clock size={10} />
                Away
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            {athlete.school && (
              <span className={cn('text-xs uppercase tracking-wider', isWaiting ? 'text-slate-300' : 'text-slate-500')}>
                {athlete.school}
              </span>
            )}
            {personalBest > 0 && !isOutTab && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                <Star size={9} />
                PB: {formatHeight(personalBest)}
              </span>
            )}
            {isOutTab && outHeight !== null && (
              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded uppercase shrink-0">
                Out @ {formatHeight(outHeight)}
              </span>
            )}
          </div>
        </div>

        {/* Attempt boxes */}
        <div className="flex gap-1.5 items-center shrink-0">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border',
                attempts[i] === 'O' ? 'bg-emerald-500 text-white border-emerald-600' :
                attempts[i] === 'X' ? 'bg-rose-500 text-white border-rose-600' :
                attempts[i] === '-' ? 'bg-slate-400 text-white border-slate-500' :
                isWaiting ? 'bg-slate-50 text-slate-200 border-slate-100' :
                'bg-slate-100 text-slate-300 border-slate-200',
              )}
            >
              {attempts[i] ?? ''}
            </div>
          ))}
        </div>
      </div>

      {/* Action row */}
      {showActionRow && (
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

          {!isOut && !isFinished && !isWaiting && (
            <button
              onClick={() => onToggleCheckout(athlete.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl transition-all active:scale-95',
                canAttempt ? '' : 'flex-1',
                athlete.checkedOut
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200',
              )}
            >
              {athlete.checkedOut ? <LogIn size={22} /> : <LogOut size={22} />}
              <span className="text-[10px] font-bold uppercase tracking-wide">
                {athlete.checkedOut ? 'Check In' : 'Away'}
              </span>
            </button>
          )}

          {attempts.length > 0 && !athlete.checkedOut && !isOut && !isWaiting && (
            <button
              onClick={() => onUndo(athlete.id)}
              className="flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95"
            >
              <Trash2 size={22} />
              <span className="text-[10px] font-bold uppercase tracking-wide">Undo</span>
            </button>
          )}

          {isOut && (
            <span className="px-3 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded-full uppercase self-center ml-auto">
              Out
            </span>
          )}
          {isFinished && (
            <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-full uppercase self-center ml-auto">
              Finished
            </span>
          )}
        </div>
      )}
    </div>
  );
};
