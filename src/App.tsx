import React, { useState, useEffect, useMemo } from 'react';
import { CSVImporter } from './components/CSVImporter';
import { AthleteRow } from './components/AthleteRow';
import { Athlete, Attempt, Unit } from './types';
import {
  Plus, ChevronRight, ChevronLeft, Trophy, Users, BarChart3,
  RotateCcw, X, Clock, Download, Zap, Medal, Eye, ArrowRight,
  LogOut, Ruler,
} from 'lucide-react';
import { cn } from './lib/utils';

// ─── Placement helpers ───────────────────────────────────────────────────────
const PLACE_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
const getPlaceLabel = (i: number) => PLACE_LABELS[i] ?? `${i + 1}th`;
const placeColor = (i: number) =>
  i === 0 ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
  : i === 1 ? 'bg-slate-100 border-slate-300 text-slate-600'
  : i === 2 ? 'bg-orange-50 border-orange-300 text-orange-700'
  : 'bg-white border-slate-200 text-slate-500';

export default function App() {
  // ─── Core State ─────────────────────────────────────────────────────────────
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [currentHeight, setCurrentHeight] = useState<number>(0);
  const [heights, setHeights] = useState<number[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState('0:00:00');
  const [fiveAlive, setFiveAlive] = useState(false);

  // ─── Setup State ────────────────────────────────────────────────────────────
  const [newHeightInput, setNewHeightInput] = useState('');
  const [newHeightInchesInput, setNewHeightInchesInput] = useState('0');
  const [manualName, setManualName] = useState('');
  const [manualSchool, setManualSchool] = useState('');
  const [manualBib, setManualBib] = useState('');
  const [unit, setUnit] = useState<Unit>('metric');
  const [startHeightInput, setStartHeightInput] = useState('2.00');
  const [startHeightInchesInput, setStartHeightInchesInput] = useState('0');
  const [incrementInput, setIncrementInput] = useState('0.10');

  // ─── Live View State ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'jumping' | 'cleared' | 'out' | 'checkedOut'>('jumping');
  const [activeView, setActiveView] = useState<'athletes' | 'leaderboard'>('athletes');
  const [jumpOrderIds, setJumpOrderIds] = useState<string[]>([]);
  const [currentJumperIndex, setCurrentJumperIndex] = useState(0);

  // Checked-out queue (shown when trying to advance height)
  const [checkedOutQueue, setCheckedOutQueue] = useState<Athlete[]>([]);

  // ─── History State ──────────────────────────────────────────────────────────
  const [history, setHistory] = useState<any[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);

  // ─── Modal & Toast ──────────────────────────────────────────────────────────
  const [modal, setModal] = useState<{
    type: 'none' | 'save' | 'reset';
    title: string;
    message: string;
    inputValue?: string;
  }>({ type: 'none', title: '', message: '' });
  const [toast, setToast] = useState<string | null>(null);
  const [showHeightSelector, setShowHeightSelector] = useState(false);
  const [customAdvanceInput, setCustomAdvanceInput] = useState('');
  const [customAdvanceInchesInput, setCustomAdvanceInchesInput] = useState('0');
  const [undoConfirmId, setUndoConfirmId] = useState<string | null>(null);

  // ─── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    if (!startTime || !isStarted) return;
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(startTime).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsedTime(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isStarted]);

  useEffect(() => {
    const saved = localStorage.getItem('vault_master_state');
    if (saved) {
      const p = JSON.parse(saved);
      setAthletes(p.athletes || []);
      setCurrentHeight(p.currentHeight || 0);
      setHeights(p.heights || []);
      setIsStarted(p.isStarted || false);
      if (p.unit) setUnit(p.unit);
      if (p.incrementInput) setIncrementInput(p.incrementInput);
      if (p.startTime) setStartTime(p.startTime);
      if (p.jumpOrderIds) setJumpOrderIds(p.jumpOrderIds);
      if (p.fiveAlive !== undefined) setFiveAlive(p.fiveAlive);
    }
    const savedHistory = localStorage.getItem('vault_master_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    if (isStarted) {
      localStorage.setItem('vault_master_state', JSON.stringify({
        athletes, currentHeight, heights, isStarted, unit,
        incrementInput, startTime, jumpOrderIds, fiveAlive,
      }));
    }
  }, [athletes, currentHeight, heights, isStarted, unit, incrementInput, startTime, jumpOrderIds, fiveAlive]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const formatHeight = (m: number) => {
    if (unit === 'metric') return `${m.toFixed(2)}m`;
    const totalInches = m / 0.0254;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}' ${inches}"`;
  };

  const parseInputToMeters = (ftVal: string, inVal = '0') => {
    const ft = parseFloat(ftVal);
    const inch = parseFloat(inVal);
    if (isNaN(ft)) return 0;
    if (unit === 'metric') return ft;
    return (ft * 12 + (isNaN(inch) ? 0 : inch)) * 0.0254;
  };

  const parseIncrementToMeters = (val: string) => {
    const n = parseFloat(val);
    if (isNaN(n)) return 0;
    return unit === 'metric' ? n : n * 0.0254;
  };

  const recalculateConsecutiveMisses = (results: Record<number, Attempt[]>): number => {
    const sortedHeights = Object.keys(results).map(Number).sort((a, b) => a - b);
    let consecutive = 0;
    for (const h of sortedHeights) {
      for (const a of results[h] || []) {
        if (a === 'X') consecutive++;
        else if (a === 'O') consecutive = 0;
        // '-' does not reset consecutive misses
      }
    }
    return consecutive;
  };

  // ─── Computed ───────────────────────────────────────────────────────────────
  // Five Alive is only active when toggle is on AND more than 5 non-eliminated athletes remain
  const isFiveAliveActive = fiveAlive && isStarted && athletes.filter(a => a.status !== 'out').length > 5;

  const activeAthletes = useMemo(() => athletes.filter(a => a.status !== 'out' && !a.checkedOut), [athletes]);
  const outAthletes = useMemo(() => athletes.filter(a => a.status === 'out'), [athletes]);
  const checkedOutAthletes = useMemo(() => athletes.filter(a => a.checkedOut && a.status !== 'out'), [athletes]);

  const winner = useMemo(() => {
    if (!isStarted || athletes.length < 2) return null;
    const active = athletes.filter(a => a.status !== 'out');
    if (active.length === 1 && outAthletes.length > 0) return active[0];
    return null;
  }, [athletes, isStarted, outAthletes]);

  const leaderboard = useMemo(() => {
    return [...athletes].map(a => {
      const clearedList = Object.entries(a.results)
        .filter(([, att]) => (att as Attempt[]).includes('O'))
        .map(([h]) => Number(h))
        .sort((a, b) => b - a);
      const bestHeight = clearedList[0] ?? 0;
      const missesAtBest = bestHeight > 0
        ? (a.results[bestHeight] ?? []).filter(x => x === 'X').length
        : 0;
      const totalMisses = Object.values(a.results).flat().filter(x => x === 'X').length;
      return { ...a, bestHeight, missesAtBest, totalMisses, clearedList };
    }).sort((a, b) => {
      if (b.bestHeight !== a.bestHeight) return b.bestHeight - a.bestHeight;
      if (a.missesAtBest !== b.missesAtBest) return a.missesAtBest - b.missesAtBest;
      return a.totalMisses - b.totalMisses;
    });
  }, [athletes]);

  const historyLeaderboard = useMemo(() => {
    if (!selectedHistoryItem) return [];
    const h = selectedHistoryItem.unit as Unit;
    const fmt = (m: number) => {
      if (h === 'metric') return `${m.toFixed(2)}m`;
      const ti = m / 0.0254;
      const ft = Math.floor(ti / 12);
      const inch = Math.round(ti % 12);
      return `${ft}' ${inch}"`;
    };
    return {
      athletes: [...(selectedHistoryItem.athletes as Athlete[])].map(a => {
        const clearedList = Object.entries(a.results)
          .filter(([, att]) => (att as Attempt[]).includes('O'))
          .map(([hh]) => Number(hh))
          .sort((a, b) => b - a);
        const bestHeight = clearedList[0] ?? 0;
        return { ...a, bestHeight, fmt };
      }).sort((a, b) => b.bestHeight - a.bestHeight),
      fmt,
    };
  }, [selectedHistoryItem]);

  const currentJumperId = useMemo(() => {
    const eligible = jumpOrderIds.filter(id => {
      const a = athletes.find(x => x.id === id);
      if (!a || a.status === 'out' || a.checkedOut) return false;
      const att = a.results[currentHeight] ?? [];
      return !att.includes('O') && att.length < 3;
    });
    if (eligible.length === 0) return null;
    return eligible[currentJumperIndex % eligible.length];
  }, [jumpOrderIds, athletes, currentHeight, currentJumperIndex]);

  const filteredAthletes = useMemo(() => {
    const filtered = athletes.filter(athlete => {
      const att = athlete.results[currentHeight] ?? [];
      const hasCleared = att.includes('O');
      const isOut = athlete.status === 'out';
      if (activeTab === 'jumping') return !isOut && !hasCleared && !athlete.checkedOut;
      if (activeTab === 'cleared') return hasCleared;
      if (activeTab === 'out') return isOut;
      if (activeTab === 'checkedOut') return !!athlete.checkedOut && !isOut;
      return true;
    });

    if (activeTab === 'jumping' && currentJumperId) {
      // Build a rotated jump order: current jumper first, then the rest in sequence
      const eligibleIds = jumpOrderIds.filter(id => filtered.some(a => a.id === id));
      const currentPos = eligibleIds.indexOf(currentJumperId);
      const rotated = currentPos >= 0
        ? [...eligibleIds.slice(currentPos), ...eligibleIds.slice(0, currentPos)]
        : eligibleIds;
      return [...filtered].sort((a, b) => {
        const ai = rotated.indexOf(a.id);
        const bi = rotated.indexOf(b.id);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return [...filtered].sort((a, b) => {
      const ai = jumpOrderIds.indexOf(a.id);
      const bi = jumpOrderIds.indexOf(b.id);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [athletes, activeTab, currentHeight, jumpOrderIds, currentJumperId]);

  // ─── Setup Actions ───────────────────────────────────────────────────────────
  const handleImport = (importedAthletes: Athlete[]) => {
    setAthletes(prev => [...prev, ...importedAthletes]);
  };

  const addManualAthlete = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!manualName.trim()) return;
    setAthletes(prev => [...prev, {
      id: crypto.randomUUID(),
      name: manualName.trim(),
      school: manualSchool.trim(),
      bibNumber: manualBib.trim(),
      results: {},
      status: 'active',
      consecutiveMisses: 0,
    }]);
    setManualName('');
    setManualSchool('');
    setManualBib('');
  };

  const removeAthlete = (id: string) => setAthletes(prev => prev.filter(a => a.id !== id));

  const loadDemoData = () => {
    const names = [
      'Alex Johnson', 'Sam Rivera', 'Jordan Smith', 'Casey Wright', 'Taylor Brooks',
      'Morgan Lee', 'Riley Quinn', 'Quinn Davis', 'Skyler Hart', 'Dakota Lane',
      'Peyton Reed', 'Avery Cole', 'Cameron Blair', 'Hayden Frost', 'Parker Vance',
      'Emerson Gray', 'Finley Moss', 'Rowan Wilde', 'Sawyer Finch', 'Blake Sterling',
    ];
    const schools = ['West High', 'East Academy', 'North Prep', 'South Valley', 'Central Tech'];
    setAthletes(names.map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      bibNumber: String(i + 1),
      school: schools[Math.floor(Math.random() * schools.length)],
      results: {},
      status: 'active',
      consecutiveMisses: 0,
    })));
  };

  const startCompetition = () => {
    if (athletes.length === 0) return;
    const now = new Date().toISOString();
    setStartTime(now);
    setIsStarted(true);
    // Initialize jump order by bib number, then name
    const ordered = [...athletes].sort((a, b) => {
      const aN = parseInt(a.bibNumber || '', 10);
      const bN = parseInt(b.bibNumber || '', 10);
      if (!isNaN(aN) && !isNaN(bN)) return aN - bN;
      if (!isNaN(aN)) return -1;
      if (!isNaN(bN)) return 1;
      return a.name.localeCompare(b.name);
    });
    setJumpOrderIds(ordered.map(a => a.id));
    setCurrentJumperIndex(0);
    if (heights.length === 0) {
      const startH = parseInputToMeters(startHeightInput, startHeightInchesInput) || 2.00;
      setHeights([startH]);
      setCurrentHeight(startH);
    } else {
      setCurrentHeight(heights[0]);
    }
  };

  // ─── History Actions ─────────────────────────────────────────────────────────
  const saveAndNew = () => {
    if (athletes.length === 0) { setToast('No athletes to save.'); return; }
    setModal({
      type: 'save',
      title: 'Save & New Meet',
      message: 'Enter a name for this meet to archive it and start fresh.',
      inputValue: `Meet ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    });
  };

  const confirmSave = (name: string) => {
    const nameToUse = name.trim() || `Meet ${new Date().toLocaleDateString()}`;
    try {
      const item = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: nameToUse,
        date: new Date().toISOString(),
        athletes: JSON.parse(JSON.stringify(athletes)),
        heights: [...heights],
        unit,
      };
      const updated = [item, ...history];
      setHistory(updated);
      localStorage.setItem('vault_master_history', JSON.stringify(updated));
      localStorage.removeItem('vault_master_state');
      setAthletes([]); setHeights([]); setCurrentHeight(0); setIsStarted(false);
      setStartTime(null); setJumpOrderIds([]); setCurrentJumperIndex(0);
      setModal({ type: 'none', title: '', message: '' });
      setToast(`Meet "${nameToUse}" saved!`);
    } catch {
      setToast('Error saving meet.');
    }
  };

  const deleteHistoryItem = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('vault_master_history', JSON.stringify(updated));
    setToast('Meet deleted.');
  };

  // ─── Competition Actions ─────────────────────────────────────────────────────
  const recordAttempt = (athleteId: string, attempt: Attempt) => {
    // Snapshot eligible athletes before the state update
    const eligibleBefore = jumpOrderIds.filter(id => {
      const a = athletes.find(x => x.id === id);
      if (!a || a.status === 'out' || a.checkedOut) return false;
      const att = a.results[currentHeight] ?? [];
      return !att.includes('O') && att.length < 3;
    });
    const eligibleCount = eligibleBefore.length;

    setAthletes(prev => prev.map(a => {
      if (a.id !== athleteId) return a;
      const newAttempts = [...(a.results[currentHeight] ?? []), attempt];
      const newResults = { ...a.results, [currentHeight]: newAttempts };
      const newMisses = recalculateConsecutiveMisses(newResults);
      return { ...a, results: newResults, status: newMisses >= 3 ? 'out' : a.status, consecutiveMisses: newMisses };
    }));

    // After a miss or pass, rotate to the next jumper (unless they're the only one left)
    if ((attempt === 'X' || attempt === '-') && eligibleCount > 1) {
      if (isFiveAliveActive) {
        // Five Alive: missed athlete stays at bottom of the active 5 (position 4 from new current)
        const currIdx = currentJumperIndex % eligibleCount;
        // Build rotation from next athlete, excluding the missed one
        const rotatedFromNext = [
          ...eligibleBefore.slice(currIdx + 1),
          ...eligibleBefore.slice(0, currIdx),
        ].filter(id => id !== athleteId);
        // Insert missed athlete at position 4 (or at the end if fewer than 4 others)
        const insertAt = Math.min(4, rotatedFromNext.length);
        const newEligibleOrder = [
          ...rotatedFromNext.slice(0, insertAt),
          athleteId,
          ...rotatedFromNext.slice(insertAt),
        ];
        // Rebuild jumpOrderIds: new eligible order + non-eligible athletes
        const nonEligible = jumpOrderIds.filter(id => !eligibleBefore.includes(id));
        setJumpOrderIds([...newEligibleOrder, ...nonEligible]);
        setCurrentJumperIndex(0);
      } else {
        advanceJumper();
      }
    }
  };

  const undoAttempt = (athleteId: string) => {
    setAthletes(prev => prev.map(a => {
      if (a.id !== athleteId) return a;
      const curr = a.results[currentHeight] ?? [];
      if (curr.length === 0) return a;
      const newResults = { ...a.results, [currentHeight]: curr.slice(0, -1) };
      const newMisses = recalculateConsecutiveMisses(newResults);
      return { ...a, results: newResults, consecutiveMisses: newMisses, status: newMisses >= 3 ? 'out' : 'active' };
    }));
  };

  const toggleCheckout = (athleteId: string) => {
    setAthletes(prev => prev.map(a => a.id === athleteId ? { ...a, checkedOut: !a.checkedOut } : a));
  };

  const advanceJumper = () => setCurrentJumperIndex(prev => prev + 1);

  // ─── Height Navigation ───────────────────────────────────────────────────────
  const doAdvanceHeight = () => {
    const idx = heights.indexOf(currentHeight);
    setActiveTab('jumping');
    setCurrentJumperIndex(0);
    if (idx < heights.length - 1) {
      setCurrentHeight(heights[idx + 1]);
    } else {
      const inc = parseIncrementToMeters(incrementInput) || 0.15;
      const nextH = Number((currentHeight + inc).toFixed(4));
      setHeights(prev => [...prev, nextH]);
      setCurrentHeight(nextH);
    }
  };

  // Gate: ensure all athletes are done before advancing
  const tryAdvanceHeight = () => {
    const notDone = athletes.filter(a => {
      if (a.status === 'out' || a.checkedOut) return false;
      const att = a.results[currentHeight] ?? [];
      return !att.includes('O') && att.length < 3;
    });
    if (notDone.length > 0) {
      setToast(`${notDone.length} athlete${notDone.length > 1 ? 's' : ''} still have attempts remaining at this height.`);
      return;
    }
    const coAthletes = athletes.filter(a => a.checkedOut && a.status !== 'out');
    if (coAthletes.length > 0) {
      setCheckedOutQueue(coAthletes);
      return;
    }
    setCustomAdvanceInput('');
    setCustomAdvanceInchesInput('0');
    setShowHeightSelector(true);
  };

  const confirmAdvanceHeight = (targetHeight?: number) => {
    setShowHeightSelector(false);
    if (targetHeight !== undefined) {
      // Jump to a specific selected height
      setActiveTab('jumping');
      setCurrentJumperIndex(0);
      if (!heights.includes(targetHeight)) {
        setHeights(prev => [...prev, targetHeight].sort((a, b) => a - b));
      }
      setCurrentHeight(targetHeight);
    } else {
      doAdvanceHeight();
    }
  };

  const handleCheckedOutDecision = (athlete: Athlete, decision: 'pass' | 'eliminate') => {
    if (decision === 'eliminate') {
      setAthletes(prev => prev.map(a => {
        if (a.id !== athlete.id) return a;
        const curr = a.results[currentHeight] ?? [];
        const xToAdd = Math.max(0, 3 - curr.length);
        const newAttempts = [...curr, ...Array(xToAdd).fill('X')] as Attempt[];
        return { ...a, results: { ...a.results, [currentHeight]: newAttempts }, status: 'out', consecutiveMisses: 3, checkedOut: false };
      }));
    }
    const newQueue = checkedOutQueue.filter(q => q.id !== athlete.id);
    setCheckedOutQueue(newQueue);
    if (newQueue.length === 0) doAdvanceHeight();
  };

  const prevHeight = () => {
    const idx = heights.indexOf(currentHeight);
    if (idx > 0) {
      setCurrentHeight(heights[idx - 1]);
      setActiveTab('jumping');
      setCurrentJumperIndex(0);
    }
  };

  // ─── Reset ───────────────────────────────────────────────────────────────────
  const resetCompetition = () => {
    setModal({ type: 'reset', title: 'Reset Competition', message: 'Are you sure? All current data will be lost.' });
  };

  const confirmReset = () => {
    setAthletes([]); setHeights([]); setCurrentHeight(0); setIsStarted(false);
    setStartTime(null); setJumpOrderIds([]); setCurrentJumperIndex(0);
    localStorage.removeItem('vault_master_state');
    setModal({ type: 'none', title: '', message: '' });
    setToast('Competition reset.');
  };

  // ─── Export ──────────────────────────────────────────────────────────────────
  const exportResults = () => {
    const rows = leaderboard.map((a, i) => [
      getPlaceLabel(i), a.bibNumber ?? '', a.name, a.school ?? '',
      a.bestHeight > 0 ? formatHeight(a.bestHeight) : 'NH',
      a.totalMisses, a.status === 'out' ? 'Out' : 'Active',
    ]);
    const csv = [
      ['Place', 'Bib', 'Name', 'School', 'Best Height', 'Total Misses', 'Status'],
      ...rows,
    ].map(r => r.map(String).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vaultmaster-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ─── Setup Screen ────────────────────────────────────────────────────────────
  if (!isStarted) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          <header className="mb-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-2xl mb-6 shadow-lg shadow-blue-200">
              <Trophy size={32} />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">VaultMaster Officiate</h1>
            <p className="text-slate-500 mt-2 text-lg">Professional pole vault meet management</p>
          </header>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Athletes Setup */}
            <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Users className="text-blue-600" />
                  <h2 className="text-xl font-bold text-slate-800">1. Setup Athletes</h2>
                </div>
                <button
                  onClick={loadDemoData}
                  className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors uppercase tracking-wider"
                >
                  Load Demo
                </button>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Manual Entry</h3>
                  <form onSubmit={addManualAthlete} className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Bib #"
                        className="w-20 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={manualBib}
                        onChange={(e) => setManualBib(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Athlete Name"
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="School (Optional)"
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={manualSchool}
                        onChange={(e) => setManualSchool(e.target.value)}
                      />
                      <button
                        type="submit"
                        disabled={!manualName.trim()}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </form>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-400 font-bold">Or</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Bulk Import</h3>
                  <CSVImporter onImport={handleImport} />
                </div>

                {athletes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Roster ({athletes.length})</h3>
                      <button onClick={() => setAthletes([])} className="text-[10px] text-rose-500 font-bold uppercase hover:underline">Clear All</button>
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                      {athletes.map(a => (
                        <div key={a.id} className="p-3 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {a.bibNumber && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{a.bibNumber}</span>}
                            <div>
                              <span className="font-medium text-sm">{a.name}</span>
                              {a.school && <span className="block text-[10px] text-slate-400 uppercase">{a.school}</span>}
                            </div>
                          </div>
                          <button onClick={() => removeAthlete(a.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Competition Settings */}
            <section className="space-y-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="text-blue-600" />
                    <h2 className="text-xl font-bold text-slate-800">2. Settings</h2>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => { setUnit('metric'); setStartHeightInput('2.00'); setStartHeightInchesInput('0'); setIncrementInput('0.10'); setNewHeightInput(''); setNewHeightInchesInput('0'); }}
                      className={cn('px-3 py-1 text-xs font-bold rounded-lg transition-all', unit === 'metric' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400')}
                    >
                      Metric
                    </button>
                    <button
                      onClick={() => { setUnit('imperial'); setStartHeightInput('7'); setStartHeightInchesInput('0'); setIncrementInput('6'); setNewHeightInput(''); setNewHeightInchesInput('0'); }}
                      className={cn('px-3 py-1 text-xs font-bold rounded-lg transition-all', unit === 'imperial' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400')}
                    >
                      Imperial
                    </button>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-3">
                    {/* Starting Height */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-xs font-bold text-slate-500 mb-2.5">
                        Starting Height <span className="font-normal text-slate-400">— first height athletes attempt</span>
                      </p>
                      {unit === 'metric' ? (
                        <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                          <input
                            type="number" step="0.01" min="0"
                            className="flex-1 outline-none text-xl font-bold text-slate-800 bg-transparent"
                            value={startHeightInput}
                            onChange={(e) => setStartHeightInput(e.target.value)}
                          />
                          <span className="text-sm font-bold text-slate-400 shrink-0">m</span>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <div className="flex-1 flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                            <input
                              type="number" step="1" min="0"
                              className="w-full outline-none text-xl font-bold text-slate-800 bg-transparent"
                              value={startHeightInput}
                              onChange={(e) => setStartHeightInput(e.target.value)}
                            />
                            <span className="text-sm font-bold text-slate-400 shrink-0">ft</span>
                          </div>
                          <div className="flex-1 flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                            <input
                              type="number" step="1" min="0" max="11"
                              className="w-full outline-none text-xl font-bold text-slate-800 bg-transparent"
                              value={startHeightInchesInput}
                              onChange={(e) => setStartHeightInchesInput(e.target.value)}
                            />
                            <span className="text-sm font-bold text-slate-400 shrink-0">in</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bar Increment */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-xs font-bold text-slate-500 mb-2.5">
                        Bar Increment <span className="font-normal text-slate-400">— raised each round</span>
                      </p>
                      <div className={cn('flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 transition-all', unit === 'imperial' ? 'max-w-[200px]' : '')}>
                        <input
                          type="number" step="0.01" min="0"
                          className="flex-1 outline-none text-xl font-bold text-slate-800 bg-transparent"
                          value={incrementInput}
                          onChange={(e) => setIncrementInput(e.target.value)}
                        />
                        <span className="text-sm font-bold text-slate-400 shrink-0">{unit === 'metric' ? 'm' : 'in'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Five Alive Toggle */}
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-purple-600 text-white rounded-lg flex items-center justify-center font-black text-base">5</span>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">Five Alive</p>
                        <p className="text-[10px] text-slate-500">Only 5 athletes rotate actively at a time; others wait in queue</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFiveAlive(!fiveAlive)}
                      className={cn(
                        'relative w-11 h-6 rounded-full transition-colors duration-200',
                        fiveAlive ? 'bg-purple-600' : 'bg-slate-300',
                      )}
                    >
                      <span className={cn(
                        'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                        fiveAlive ? 'translate-x-6' : 'translate-x-1',
                      )} />
                    </button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-400 font-bold">Custom Heights</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                    Add a one-off height outside the normal sequence — e.g. a record attempt at a non-standard increment. Heights are sorted automatically.
                  </p>

                  <div className="flex gap-2">
                    <div className="flex-1 flex gap-2">
                      <input
                        type="number" step="0.01"
                        placeholder={unit === 'metric' ? 'm' : 'ft'}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={newHeightInput}
                        onChange={(e) => setNewHeightInput(e.target.value)}
                      />
                      {unit === 'imperial' && (
                        <input
                          type="number" step="0.1" placeholder="in"
                          className="w-20 px-3 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          value={newHeightInchesInput}
                          onChange={(e) => setNewHeightInchesInput(e.target.value)}
                        />
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const h = parseInputToMeters(newHeightInput, newHeightInchesInput);
                        if (h > 0 && !heights.includes(h)) {
                          setHeights([...heights, h].sort((a, b) => a - b));
                          setNewHeightInput('');
                          setNewHeightInchesInput('0');
                        }
                      }}
                      className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
                    >
                      <Plus size={24} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {heights.map(h => (
                      <span key={h} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-mono font-medium border border-slate-200 flex items-center gap-2">
                        {formatHeight(h)}
                        <button onClick={() => setHeights(heights.filter(x => x !== h))} className="text-slate-400 hover:text-rose-500">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={startCompetition}
                    disabled={athletes.length === 0}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    Start Meet <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {/* Past Meets */}
              {history.length > 0 && (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                      <Clock size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Past Meets</h2>
                  </div>
                  <div className="space-y-3">
                    {history.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div>
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">
                            {new Date(item.date).toLocaleDateString()} &bull; {item.athletes.length} Athletes
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedHistoryItem(item)}
                            className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                            title="View Results"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => deleteHistoryItem(item.id)}
                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* History Detail Modal */}
        {selectedHistoryItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedHistoryItem.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {new Date(selectedHistoryItem.date).toLocaleString()} &bull; {selectedHistoryItem.athletes.length} Athletes
                  </p>
                </div>
                <button onClick={() => setSelectedHistoryItem(null)} className="p-2 text-slate-400 hover:text-slate-700">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-6">
                <div className="space-y-2">
                  {historyLeaderboard.athletes?.map((a: any, i: number) => (
                    <div key={a.id} className={cn('flex items-center justify-between p-3 rounded-xl border', placeColor(i))}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold w-8">{getPlaceLabel(i)}</span>
                        {a.bibNumber && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{a.bibNumber}</span>}
                        <div>
                          <p className="font-semibold text-sm">{a.name}</p>
                          {a.school && <p className="text-[10px] text-slate-500 uppercase">{a.school}</p>}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-sm">
                        {a.bestHeight > 0 ? historyLeaderboard.fmt(a.bestHeight) : <span className="text-slate-400">NH</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Live Screen ─────────────────────────────────────────────────────────────
  const nextHeight_preview = heights[heights.indexOf(currentHeight) + 1]
    ?? Number((currentHeight + (parseIncrementToMeters(incrementInput) || 0.15)).toFixed(4));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">

      {/* Toast */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10">
            <Trophy size={18} className="text-emerald-400" />
            <span className="text-sm font-bold">{toast}</span>
          </div>
        </div>
      )}

      {/* Save / Reset Modal */}
      {modal.type !== 'none' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{modal.title}</h3>
              <p className="text-slate-500 mb-6">{modal.message}</p>
              {modal.type === 'save' && (
                <input
                  autoFocus type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none mb-6"
                  value={modal.inputValue}
                  onChange={(e) => setModal(prev => ({ ...prev, inputValue: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && confirmSave(modal.inputValue ?? '')}
                />
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setModal({ type: 'none', title: '', message: '' })}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => modal.type === 'save' ? confirmSave(modal.inputValue ?? '') : confirmReset()}
                  className={cn(
                    'flex-1 py-3 text-white font-bold rounded-xl transition-all',
                    modal.type === 'reset' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700',
                  )}
                >
                  {modal.type === 'save' ? 'Save Meet' : 'Reset All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Undo Confirmation Dialog */}
      {undoConfirmId && (() => {
        const athlete = athletes.find(a => a.id === undoConfirmId);
        const lastAttempt = athlete?.results[currentHeight]?.at(-1);
        const attemptLabel = lastAttempt === 'O' ? 'Make ✓' : lastAttempt === 'X' ? 'Miss ✗' : 'Pass —';
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Erase this mark?</h3>
                <p className="text-sm text-slate-500 mb-5">
                  Remove the <span className="font-bold text-slate-800">{attemptLabel}</span> recorded for{' '}
                  <span className="font-bold text-slate-800">{athlete?.name}</span>?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setUndoConfirmId(null)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { undoAttempt(undoConfirmId); setUndoConfirmId(null); }}
                    className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors"
                  >
                    Erase
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Checked-Out Athlete Modal (height advancement) */}
      {checkedOutQueue.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                  <LogOut size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Checked-Out Athlete</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase">
                    {checkedOutQueue.length} athlete{checkedOutQueue.length > 1 ? 's' : ''} remaining
                  </p>
                </div>
              </div>

              <div className="my-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-2 mb-1">
                  {checkedOutQueue[0].bibNumber && (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      #{checkedOutQueue[0].bibNumber}
                    </span>
                  )}
                  <span className="font-bold text-slate-900 text-lg">{checkedOutQueue[0].name}</span>
                </div>
                {checkedOutQueue[0].school && (
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{checkedOutQueue[0].school}</p>
                )}
                <p className="text-sm text-amber-700 mt-2 font-medium">
                  Currently checked out at {formatHeight(currentHeight)}. What should happen when advancing to the next height?
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleCheckedOutDecision(checkedOutQueue[0], 'pass')}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowRight size={18} />
                  Pass to Next Height
                </button>
                <button
                  onClick={() => handleCheckedOutDecision(checkedOutQueue[0], 'eliminate')}
                  className="w-full py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  Eliminate (Record as Missed)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Detail Modal */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedHistoryItem.name}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {new Date(selectedHistoryItem.date).toLocaleString()} &bull; {selectedHistoryItem.athletes.length} Athletes
                </p>
              </div>
              <button onClick={() => setSelectedHistoryItem(null)} className="p-2 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-2">
              {historyLeaderboard.athletes?.map((a: any, i: number) => (
                <div key={a.id} className={cn('flex items-center justify-between p-3 rounded-xl border', placeColor(i))}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold w-8">{getPlaceLabel(i)}</span>
                    {a.bibNumber && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{a.bibNumber}</span>}
                    <div>
                      <p className="font-semibold text-sm">{a.name}</p>
                      {a.school && <p className="text-[10px] text-slate-500 uppercase">{a.school}</p>}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-sm">
                    {a.bestHeight > 0 ? historyLeaderboard.fmt(a.bestHeight) : <span className="text-slate-400">NH</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Height Selector Modal */}
      {showHeightSelector && (() => {
        const currentIdx = heights.indexOf(currentHeight);
        const upcomingHeights = heights.slice(currentIdx + 1);
        const inc = parseIncrementToMeters(incrementInput) || 0.15;
        const autoNext = currentIdx < heights.length - 1
          ? heights[currentIdx + 1]
          : Number((currentHeight + inc).toFixed(4));
        return (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Advance Bar To</h3>
                <p className="text-xs text-slate-400 mb-4">Select a height or enter a custom one</p>

                {/* Height options */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => confirmAdvanceHeight(autoNext)}
                    className="px-4 py-3 bg-blue-600 text-white font-mono font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all text-sm"
                  >
                    {formatHeight(autoNext)} <span className="font-normal opacity-75 text-xs">next</span>
                  </button>
                  {upcomingHeights.filter(h => h !== autoNext).slice(0, 5).map(h => (
                    <button
                      key={h}
                      onClick={() => confirmAdvanceHeight(h)}
                      className="px-4 py-3 bg-slate-100 text-slate-800 font-mono font-bold rounded-xl hover:bg-slate-200 active:scale-95 transition-all text-sm"
                    >
                      {formatHeight(h)}
                    </button>
                  ))}
                </div>

                {/* Custom height input */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Custom Height</p>
                  <div className="flex gap-2">
                    <div className="flex flex-1 gap-2">
                      <input
                        type="number" step="0.01"
                        placeholder={unit === 'metric' ? 'm' : 'ft'}
                        className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={customAdvanceInput}
                        onChange={e => setCustomAdvanceInput(e.target.value)}
                      />
                      {unit === 'imperial' && (
                        <input
                          type="number" step="0.1" placeholder="in"
                          className="w-16 px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          value={customAdvanceInchesInput}
                          onChange={e => setCustomAdvanceInchesInput(e.target.value)}
                        />
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const h = parseInputToMeters(customAdvanceInput, customAdvanceInchesInput);
                        if (h > 0) confirmAdvanceHeight(h);
                      }}
                      className="px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all text-sm"
                    >
                      Set
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowHeightSelector(false)}
                  className="mt-4 w-full py-3 text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">

          {/* Row 1: Logo + Timer + Controls */}
          <div className="flex items-center justify-between gap-2">
            {/* Logo + Timer */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Trophy size={18} />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 leading-tight text-sm">VaultMaster</h1>
                <div className="flex items-center gap-1.5">
                  <Clock size={10} className="text-slate-400" />
                  <span className="text-[10px] text-slate-400 font-mono font-bold">{elapsedTime}</span>
                </div>
              </div>
            </div>

            {/* Height Navigator — desktop only (inline) */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={prevHeight}
                className="p-2 hover:bg-white rounded-xl transition-all text-slate-600 disabled:opacity-30"
                disabled={heights.indexOf(currentHeight) === 0}
              >
                <ChevronLeft size={20} />
              </button>
              <div className="px-4 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Height</span>
                <span className="text-xl font-mono font-bold text-blue-600 leading-none">{formatHeight(currentHeight)}</span>
              </div>
              <button
                onClick={tryAdvanceHeight}
                className="p-2 hover:bg-white rounded-xl transition-all text-slate-600"
                title="Advance to next height"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Athletes</span>
                <span className="text-xs font-semibold text-slate-700">
                  {activeAthletes.length} Active / {checkedOutAthletes.length} Away / {outAthletes.length} Out
                </span>
              </div>

              {/* Five Alive toggle */}
              <button
                onClick={() => setFiveAlive(!fiveAlive)}
                title={fiveAlive ? 'Five Alive ON — tap to disable' : 'Five Alive OFF — tap to enable'}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-2 sm:px-3 text-xs font-bold rounded-xl transition-all',
                  fiveAlive ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                )}
              >
                <span className="font-black text-sm leading-none">5</span>
                <span className="hidden sm:inline">Alive</span>
              </button>

              <button
                onClick={saveAndNew}
                className="flex items-center gap-1.5 px-2 py-2 sm:px-4 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
              >
                <Trophy size={14} />
                <span className="hidden sm:inline">Save & New</span>
              </button>
              <button onClick={resetCompetition} className="p-2 text-slate-400 hover:text-rose-500 transition-colors" title="Reset">
                <RotateCcw size={18} />
              </button>
            </div>
          </div>

          {/* Row 2 (mobile only): Height Navigator full-width */}
          <div className="sm:hidden flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={prevHeight}
              className="p-2 hover:bg-white rounded-xl transition-all text-slate-600 disabled:opacity-30"
              disabled={heights.indexOf(currentHeight) === 0}
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex-1 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Height</span>
              <span className="text-2xl font-mono font-bold text-blue-600 leading-none">{formatHeight(currentHeight)}</span>
            </div>
            <button
              onClick={tryAdvanceHeight}
              className="p-2 hover:bg-white rounded-xl transition-all text-slate-600"
              title="Advance to next height"
            >
              <ChevronRight size={24} />
            </button>
          </div>

        </div>
      </header>

      {/* Winner Banner */}
      {winner && (
        <div className="bg-gradient-to-r from-yellow-400 to-amber-400 px-6 py-4 text-center shadow-lg">
          <div className="flex items-center justify-center gap-3">
            <Medal size={24} className="text-yellow-800" />
            <span className="text-yellow-900 font-black text-xl tracking-tight">
              {winner.bibNumber ? `#${winner.bibNumber} ` : ''}{winner.name} wins the competition!
            </span>
            <Medal size={24} className="text-yellow-800" />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-4 pb-24">

        {/* Now Jumping card */}
        {currentJumperId && activeView === 'athletes' && (
          <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded-2xl">
            <span className="text-[10px] font-bold text-blue-400 uppercase block">Now Jumping</span>
            <span className="text-base font-bold text-blue-700">
              {(() => {
                const j = athletes.find(a => a.id === currentJumperId);
                return j ? `${j.bibNumber ? `#${j.bibNumber} ` : ''}${j.name}` : '—';
              })()}
            </span>
          </div>
        )}

        {/* Athletes View */}
        {activeView === 'athletes' && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full">
              {([
                { key: 'jumping', label: 'Jumping', color: 'blue', count: athletes.filter(a => a.status !== 'out' && !(a.results[currentHeight] ?? []).includes('O') && !a.checkedOut).length },
                { key: 'cleared', label: 'Cleared', color: 'emerald', count: athletes.filter(a => (a.results[currentHeight] ?? []).includes('O')).length },
                { key: 'out', label: 'Out', color: 'rose', count: outAthletes.length },
                { key: 'checkedOut', label: 'Away', color: 'amber', count: checkedOutAthletes.length },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex-1 sm:flex-none px-2 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1 sm:gap-2',
                    activeTab === tab.key
                      ? `bg-white text-${tab.color}-600 shadow-sm`
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px]',
                    activeTab === tab.key ? `bg-${tab.color}-100 text-${tab.color}-600` : 'bg-slate-200 text-slate-500',
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Athlete Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="hidden sm:flex bg-slate-50 px-4 py-3 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider justify-between">
                <span>Athlete</span>
                <span>{`Attempts @ ${formatHeight(currentHeight)}`}</span>
                <span className="pl-4 text-right">Actions</span>
              </div>
              <div className="divide-y divide-slate-100">
                {filteredAthletes.map((athlete, index) => (
                  <React.Fragment key={athlete.id}>
                    {isFiveAliveActive && activeTab === 'jumping' && index === 5 && filteredAthletes.length > 5 && (
                      <div className="px-4 py-2 bg-slate-100 border-y border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={11} />
                        Waiting — {filteredAthletes.length - 5} athlete{filteredAthletes.length - 5 !== 1 ? 's' : ''} in queue
                      </div>
                    )}
                    <AthleteRow
                      athlete={athlete}
                      currentHeight={currentHeight}
                      onRecord={recordAttempt}
                      onUndo={(id) => setUndoConfirmId(id)}
                      onToggleCheckout={toggleCheckout}
                      isOutTab={activeTab === 'out'}
                      formatHeight={formatHeight}
                      isCurrentJumper={athlete.id === currentJumperId}
                      isWaiting={isFiveAliveActive && activeTab === 'jumping' && index >= 5}
                    />
                  </React.Fragment>
                ))}
                {filteredAthletes.length === 0 && (
                  <div className="p-12 text-center text-slate-400 italic">
                    {activeTab === 'jumping' ? 'All athletes have finished jumping at this height.' :
                     activeTab === 'cleared' ? 'No athletes have cleared this height yet.' :
                     activeTab === 'out' ? 'No athletes are out of the competition yet.' :
                     'No athletes are currently away.'}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 grid md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Competition Progress</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: athletes.length > 0 ? `${(outAthletes.length / athletes.length) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-700 shrink-0">
                    {athletes.length > 0 ? Math.round((outAthletes.length / athletes.length) * 100) : 0}% Out
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Next Height</h3>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-mono font-bold text-slate-700">{formatHeight(nextHeight_preview)}</span>
                  <button
                    onClick={tryAdvanceHeight}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Advance Bar
                  </button>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase mb-1">Active Jumpers</h3>
                  <span className="text-2xl font-bold text-emerald-600">{activeAthletes.length}</span>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                  <Users size={22} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Leaderboard View */}
        {activeView === 'leaderboard' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Medal size={18} className="text-amber-500" />
                Current Standings
              </h2>
              <button
                onClick={exportResults}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {leaderboard.map((a, i) => (
                <div key={a.id} className={cn(
                  'flex items-center gap-4 px-6 py-4 transition-colors',
                  i === 0 ? 'bg-yellow-50' : i === 1 ? 'bg-slate-50' : i === 2 ? 'bg-orange-50' : 'bg-white',
                )}>
                  {/* Place */}
                  <div className="w-10 shrink-0 text-center">
                    {i < 3 ? (
                      <span className={cn('text-lg font-black', i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : 'text-orange-500')}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-slate-400">{getPlaceLabel(i)}</span>
                    )}
                  </div>

                  {/* Athlete Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {a.bibNumber && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{a.bibNumber}</span>}
                      <span className="font-bold text-slate-900">{a.name}</span>
                      {a.status !== 'out' && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded uppercase">Active</span>
                      )}
                    </div>
                    {a.school && <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{a.school}</p>}
                    {a.clearedList.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <span className="text-[10px] text-slate-400">Cleared:</span>
                        {[...a.clearedList].reverse().map(h => (
                          <span key={h} className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {formatHeight(h)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Best Height */}
                  <div className="text-right shrink-0">
                    <div className="font-mono font-black text-lg text-slate-800">
                      {a.bestHeight > 0 ? formatHeight(a.bestHeight) : <span className="text-slate-300 text-base">NH</span>}
                    </div>
                    <div className="text-[10px] text-slate-400">{a.totalMisses} miss{a.totalMisses !== 1 ? 'es' : ''}</div>
                  </div>
                </div>
              ))}

              {leaderboard.length === 0 && (
                <div className="p-12 text-center text-slate-400 italic">No athletes in competition yet.</div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Sticky bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20 flex">
        <button
          onClick={() => setActiveView('athletes')}
          className={cn(
            'flex-1 flex flex-col items-center py-3 gap-1 transition-colors',
            activeView === 'athletes' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600',
          )}
        >
          <Users size={22} />
          <span className="text-[10px] font-bold uppercase">Athletes</span>
        </button>
        <button
          onClick={() => setActiveView('leaderboard')}
          className={cn(
            'flex-1 flex flex-col items-center py-3 gap-1 transition-colors',
            activeView === 'leaderboard' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600',
          )}
        >
          <Medal size={22} />
          <span className="text-[10px] font-bold uppercase">Standings</span>
        </button>
      </nav>
    </div>
  );
}
