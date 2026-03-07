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

  return (
    <div className={cn(
      'grid grid-cols-[1fr_140px_auto] items-center p-4 transition-colors',
      isCurrentJumper && !isOut
        ? 'bg-blue-50 border-l-4 border-l-blue-500'
        : isOut
        ? 'bg-slate-50 opacity-60'
        : athlete.checkedOut
        ? 'bg-amber-50/50'
        : isWaiting
        ? 'bg-slate-50/80'
        : 'bg-white hover:bg-slate-50/50',
    )}>
      {/* Athlete Info */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {athlete.bibNumber && (
            <span className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
              isWaiting ? 'text-slate-300 bg-slate-100' : 'text-slate-400 bg-slate-100',
            )}>
              #{athlete.bibNumber}
            </span>
          )}
          <span className={cn(
            'font-semibold truncate',
            isCurrentJumper && !isOut ? 'text-blue-700' : isWaiting ? 'text-slate-400' : 'text-slate-900',
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

        <div className="flex items-center gap-2 flex-wrap">
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

      {/* Attempts */}
      <div className="flex gap-2 items-center">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'w-8 h-8 rounded flex items-center justify-center text-sm font-bold border',
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

      {/* Actions */}
      <div className="flex justify-end gap-2 pl-4">
        {canAttempt && (
          <>
            <button
              onClick={() => onRecord(athlete.id, 'O')}
              className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
              title="Make (O)"
            >
              <Check size={20} />
            </button>
            <button
              onClick={() => onRecord(athlete.id, 'X')}
              className="p-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors"
              title="Miss (X)"
            >
              <X size={20} />
            </button>
            <button
              onClick={() => onRecord(athlete.id, '-')}
              className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              title="Pass (-)"
            >
              <Minus size={20} />
            </button>
          </>
        )}

        {!isOut && !isFinished && !isWaiting && (
          <button
            onClick={() => onToggleCheckout(athlete.id)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              athlete.checkedOut
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200',
            )}
            title={athlete.checkedOut ? 'Check In' : 'Check Out'}
          >
            {athlete.checkedOut ? <LogIn size={20} /> : <LogOut size={20} />}
          </button>
        )}

        {attempts.length > 0 && !athlete.checkedOut && !isOut && !isWaiting && (
          <button
            onClick={() => onUndo(athlete.id)}
            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
            title="Undo Last Attempt"
          >
            <Trash2 size={18} />
          </button>
        )}

        {isOut && (
          <span className="px-3 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded-full uppercase">Out</span>
        )}
        {isFinished && (
          <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-full uppercase">Finished</span>
        )}
      </div>
    </div>
  );
};
