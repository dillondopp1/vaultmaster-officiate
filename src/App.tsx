import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CSVImporter } from './components/CSVImporter';
import { AthleteRow } from './components/AthleteRow';
import { Athlete, Attempt, Unit, EventType, HEIGHT_EVENTS } from './types';
import {
  Plus, ChevronRight, ChevronLeft, Trophy, Users, BarChart3,
  RotateCcw, X, Clock, Download, Zap, Medal, Eye, ArrowRight,
  LogOut, LogIn, Ruler, Pencil, AlertTriangle,
} from 'lucide-react';
import logoSvg from './assets/logo.svg';
import pvIcon from './assets/icons/pole-vault.svg';
import hjIcon from './assets/icons/high-jump.svg';
import ljIcon from './assets/icons/long-jump.svg';
import spIcon from './assets/icons/shot-put.svg';
import dtIcon from './assets/icons/discus.svg';
import htIcon from './assets/icons/hammer.svg';
import jtIcon from './assets/icons/javelin.svg';
import { cn } from './lib/utils';

// ─── Event Meta ──────────────────────────────────────────────────────────────
const EVENT_META: Record<EventType, { label: string; description: string; action: string; icon: string; svg?: string }> = {
  'pole-vault':   { label: 'Pole Vault',   description: 'Bar height · entry heights', action: 'Jumping',  icon: '🏋️', svg: pvIcon },
  'high-jump':    { label: 'High Jump',    description: 'Bar height · entry heights', action: 'Jumping',  icon: '🏃', svg: hjIcon },
  'long-jump':    { label: 'Long Jump',    description: '3 attempts · distance',      action: 'Jumping',  icon: '🦘', svg: ljIcon },
  'triple-jump':  { label: 'Triple Jump',  description: '3 attempts · distance',      action: 'Jumping',  icon: '🦘', svg: ljIcon },
  'shot-put':     { label: 'Shot Put',     description: '3 attempts · distance',      action: 'Throwing', icon: '⚪', svg: spIcon },
  'discus':       { label: 'Discus',       description: '3 attempts · distance',      action: 'Throwing', icon: '🥏', svg: dtIcon },
  'javelin':      { label: 'Javelin',      description: '3 attempts · distance',      action: 'Throwing', icon: '🏹', svg: jtIcon },
  'hammer':       { label: 'Hammer Throw', description: '3 attempts · distance',      action: 'Throwing', icon: '🔨', svg: htIcon },
};

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
  const [manualEntryHeightFt, setManualEntryHeightFt] = useState('');
  const [manualEntryHeightIn, setManualEntryHeightIn] = useState('0');
  const [unit, setUnit] = useState<Unit>('imperial');
  const [startHeightInput, setStartHeightInput] = useState('7');
  const [startHeightInchesInput, setStartHeightInchesInput] = useState('0');
  const [incrementInput, setIncrementInput] = useState('6');

  // ─── Event Selection ─────────────────────────────────────────────────────────
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);

  // ─── Distance Event State ─────────────────────────────────────────────────
  const [distanceTab, setDistanceTab] = useState<'competing' | 'done' | 'away'>('competing');
  const [markModalAthleteId, setMarkModalAthleteId] = useState<string | null>(null);
  const [markFt, setMarkFt] = useState('');
  const [markIn, setMarkIn] = useState('0');
  const markInRef = useRef<HTMLInputElement>(null);

  // ─── Flights State ────────────────────────────────────────────────────────
  const [flightSize, setFlightSize] = useState(8);
  const [flightSizeStr, setFlightSizeStr] = useState('8');
  const [flights, setFlights] = useState<string[][]>([]);
  const [currentFlightIdx, setCurrentFlightIdx] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);

  // ─── Live View State ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'jumping' | 'cleared' | 'out' | 'checkedOut' | 'upcoming'>('jumping');
  const [setupView, setSetupView] = useState<'main' | 'roster'>('main');
  const [showRosterCSVImport, setShowRosterCSVImport] = useState(false);
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

  // ─── Run-Through & Edit Entry Height ────────────────────────────────────────
  const [runThroughAthletes, setRunThroughAthletes] = useState<Athlete[]>([]);
  const [pendingAdvanceHeight, setPendingAdvanceHeight] = useState<number | null>(null);
  const [editEntryHeightId, setEditEntryHeightId] = useState<string | null>(null);
  const [editEntryHeightFt, setEditEntryHeightFt] = useState('');
  const [editEntryHeightIn, setEditEntryHeightIn] = useState('0');

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
      if (p.selectedEvent) setSelectedEvent(p.selectedEvent);
      if (p.flights) setFlights(p.flights);
      if (p.currentFlightIdx !== undefined) setCurrentFlightIdx(p.currentFlightIdx);
      if (p.currentRound !== undefined) setCurrentRound(p.currentRound);
      if (p.flightSize !== undefined) { setFlightSize(p.flightSize); setFlightSizeStr(String(p.flightSize)); }
    }
    const savedHistory = localStorage.getItem('vault_master_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    if (isStarted) {
      localStorage.setItem('vault_master_state', JSON.stringify({
        athletes, currentHeight, heights, isStarted, unit,
        incrementInput, startTime, jumpOrderIds, fiveAlive, selectedEvent,
        flights, currentFlightIdx, currentRound, flightSize,
      }));
    }
  }, [athletes, currentHeight, heights, isStarted, unit, incrementInput, startTime, jumpOrderIds, fiveAlive, flights, currentFlightIdx, currentRound, flightSize]);

  // ─── Derived ────────────────────────────────────────────────────────────────
  const isHeightEvent = selectedEvent ? HEIGHT_EVENTS.includes(selectedEvent) : true;

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

  const formatMark = (meters: number): string => {
    if (unit === 'metric') return `${meters.toFixed(2)}m`;
    const totalIn = meters / 0.0254;
    const ft = Math.floor(totalIn / 12);
    const inches = totalIn % 12;
    return `${ft}' ${inches.toFixed(1).replace('.0', '')}"`;
  };

  const parseMarkToMeters = (ft: string, inches: string): number => {
    if (unit === 'metric') return parseFloat(ft) || 0;
    const f = parseFloat(ft) || 0;
    const i = parseFloat(inches) || 0;
    return (f * 12 + i) * 0.0254;
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

  // Consecutive misses accumulated strictly BEFORE upToHeight.
  // Determines how many attempts an athlete gets at a new height (3 − this value).
  const priorConsecutiveMisses = (results: Record<number, Attempt[]>, upToHeight: number): number => {
    const sortedHeights = Object.keys(results).map(Number).sort((a, b) => a - b);
    let consecutive = 0;
    for (const h of sortedHeights) {
      if (h >= upToHeight) break;
      for (const a of results[h] || []) {
        if (a === 'X') consecutive++;
        else if (a === 'O') consecutive = 0;
        // '-' does not reset
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

  const distanceLeaderboard = useMemo(() => {
    return [...athletes].map(a => {
      const marks = Object.values(a.markValues ?? {}) as number[];
      const bestMark = marks.length > 0 ? Math.max(...marks) : 0;
      return { ...a, bestMark, marks };
    }).sort((a, b) => b.bestMark - a.bestMark);
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
    if (!isHeightEvent) {
      // Flight-based: first eligible athlete in current flight who hasn't taken currentRound attempt
      const currentFlightIds = flights[currentFlightIdx] ?? [];
      for (const id of currentFlightIds) {
        const a = athletes.find(x => x.id === id);
        if (a && !a.checkedOut && (a.results[0]?.length ?? 0) < currentRound) {
          return id;
        }
      }
      return null;
    }
    const eligible = jumpOrderIds.filter(id => {
      const a = athletes.find(x => x.id === id);
      if (!a || a.checkedOut) return false;
      if (a.status === 'out') return false;
      if (a.entryHeight && a.entryHeight > currentHeight) return false;
      const att = a.results[currentHeight] ?? [];
      const maxAtt = 3 - priorConsecutiveMisses(a.results, currentHeight);
      return !att.includes('O') && att.length < maxAtt;
    });
    if (eligible.length === 0) return null;
    return eligible[currentJumperIndex % eligible.length];
  }, [jumpOrderIds, athletes, currentHeight, currentJumperIndex, isHeightEvent, flights, currentFlightIdx, currentRound]);

  const upcomingJumpers = useMemo(() => {
    if (!isHeightEvent) {
      // Flight-based: next 3 eligible athletes in current flight for currentRound
      const currentFlightIds = flights[currentFlightIdx] ?? [];
      const eligible = currentFlightIds.filter(id => {
        const a = athletes.find(x => x.id === id);
        return a && !a.checkedOut && (a.results[0]?.length ?? 0) < currentRound;
      });
      const count = Math.min(3, eligible.length);
      return Array.from({ length: count }, (_, i) =>
        athletes.find(a => a.id === eligible[i]) ?? null
      ).filter((a): a is Athlete => a !== null);
    }
    const eligible = jumpOrderIds.filter(id => {
      const a = athletes.find(x => x.id === id);
      if (!a || a.checkedOut) return false;
      if (a.status === 'out') return false;
      if (a.entryHeight && a.entryHeight > currentHeight) return false;
      const att = a.results[currentHeight] ?? [];
      const maxAtt = 3 - priorConsecutiveMisses(a.results, currentHeight);
      return !att.includes('O') && att.length < maxAtt;
    });
    if (eligible.length === 0) return [];
    const count = Math.min(3, eligible.length);
    return Array.from({ length: count }, (_, offset) => {
      const id = eligible[(currentJumperIndex + offset) % eligible.length];
      return athletes.find(a => a.id === id) ?? null;
    }).filter((a): a is Athlete => a !== null);
  }, [jumpOrderIds, athletes, currentHeight, currentJumperIndex, isHeightEvent, flights, currentFlightIdx, currentRound]);

  const filteredAthletes = useMemo(() => {
    const filtered = athletes.filter(athlete => {
      const att = athlete.results[currentHeight] ?? [];
      const hasCleared = att.includes('O');
      const isOut = athlete.status === 'out';
      const isUpcoming = !!(athlete.entryHeight && athlete.entryHeight > currentHeight);
      if (activeTab === 'jumping') return !isOut && !hasCleared && !athlete.checkedOut && !isUpcoming;
      if (activeTab === 'cleared') return hasCleared;
      if (activeTab === 'out') return isOut;
      if (activeTab === 'checkedOut') return !!athlete.checkedOut && !isOut;
      if (activeTab === 'upcoming') return isUpcoming && !isOut;
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

  // ─── Auto-advance round/flight for distance events ───────────────────────────
  useEffect(() => {
    if (!isStarted || isHeightEvent || flights.length === 0) return;
    const currentFlightIds = flights[currentFlightIdx] ?? [];
    if (currentFlightIds.length === 0) return;
    // Guard: only advance after at least one athlete has recorded for currentRound
    const hasProgress = currentFlightIds.some(id => {
      const a = athletes.find(x => x.id === id);
      return a && (a.results[0]?.length ?? 0) >= currentRound;
    });
    if (!hasProgress) return;
    // Still someone left to go — don't advance
    if (currentJumperId !== null) return;
    // All eligible in current flight done with this round — advance
    if (currentRound < 3) {
      setCurrentRound(r => r + 1);
    } else if (currentFlightIdx < flights.length - 1) {
      setCurrentFlightIdx(f => f + 1);
      setCurrentRound(1);
    }
  }, [currentJumperId, isStarted, isHeightEvent, flights, currentFlightIdx, currentRound, athletes]);

  // ─── Setup Actions ───────────────────────────────────────────────────────────
  const handleImport = (importedAthletes: Athlete[]) => {
    setAthletes(prev => [...prev, ...importedAthletes]);
  };

  const addManualAthlete = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!manualName.trim()) return;
    const parsedEntryHeight = manualEntryHeightFt.trim()
      ? parseInputToMeters(manualEntryHeightFt.trim(), unit === 'imperial' ? manualEntryHeightIn : '0')
      : undefined;
    setAthletes(prev => [...prev, {
      id: crypto.randomUUID(),
      name: manualName.trim(),
      school: manualSchool.trim(),
      bibNumber: manualBib.trim(),
      results: {},
      status: 'active',
      consecutiveMisses: 0,
      ...(parsedEntryHeight && parsedEntryHeight > 0 ? { entryHeight: parsedEntryHeight } : {}),
    }]);
    setManualName('');
    setManualSchool('');
    setManualBib('');
    setManualEntryHeightFt('');
    setManualEntryHeightIn('0');
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
    if (isHeightEvent) {
      if (heights.length === 0) {
        const startH = parseInputToMeters(startHeightInput, startHeightInchesInput) || 2.00;
        setHeights([startH]);
        setCurrentHeight(startH);
      } else {
        setCurrentHeight(heights[0]);
      }
    } else {
      // Distance event: split athletes into flights
      const orderedIds = ordered.map(a => a.id);
      const size = Math.max(1, flightSize);
      const flightGroups: string[][] = [];
      for (let i = 0; i < orderedIds.length; i += size) {
        flightGroups.push(orderedIds.slice(i, i + size));
      }
      setFlights(flightGroups);
      setCurrentFlightIdx(0);
      setCurrentRound(1);
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
      setFlights([]); setCurrentFlightIdx(0); setCurrentRound(1);
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
  const recordAttempt = (athleteId: string, attempt: Attempt, markValue?: number) => {
    if (!isHeightEvent) {
      // ── Distance event (flight-based) ────────────────────────────────────────
      setAthletes(prev => prev.map(a => {
        if (a.id !== athleteId) return a;
        const prevAttempts = a.results[0] ?? [];
        const attemptIdx = prevAttempts.length;
        const newMarkValues = attempt === 'O' && markValue !== undefined
          ? { ...(a.markValues ?? {}), [attemptIdx]: markValue }
          : a.markValues;
        return { ...a, results: { 0: [...prevAttempts, attempt] }, markValues: newMarkValues };
      }));
      // No advanceJumper() — flight-based currentJumperId auto-rotates
      return;
    }

    // ── Height event ──────────────────────────────────────────────────────────
    // Snapshot eligible athletes before the state update
    const eligibleBefore = jumpOrderIds.filter(id => {
      const a = athletes.find(x => x.id === id);
      if (!a || a.status === 'out' || a.checkedOut) return false;
      if (a.entryHeight && a.entryHeight > currentHeight) return false;
      const att = a.results[currentHeight] ?? [];
      const maxAtt = 3 - priorConsecutiveMisses(a.results, currentHeight);
      return !att.includes('O') && att.length < maxAtt;
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
      const heightKey = isHeightEvent ? currentHeight : 0;
      const curr = a.results[heightKey] ?? [];
      if (curr.length === 0) return a;
      const removedIdx = curr.length - 1;
      const newResults = { ...a.results, [heightKey]: curr.slice(0, -1) };
      const newMisses = recalculateConsecutiveMisses(newResults);
      // Clean up markValues for the removed distance attempt
      const newMarkValues = a.markValues ? { ...a.markValues } : undefined;
      if (newMarkValues) delete newMarkValues[removedIdx];
      return { ...a, results: newResults, consecutiveMisses: newMisses, status: newMisses >= 3 ? 'out' : 'active', markValues: newMarkValues };
    }));
  };

  const toggleCheckout = (athleteId: string) => {
    setAthletes(prev => prev.map(a => a.id === athleteId ? { ...a, checkedOut: !a.checkedOut } : a));
  };

  const advanceJumper = () => setCurrentJumperIndex(prev => prev + 1);

  // ─── Height Navigation ───────────────────────────────────────────────────────
  const doAdvanceHeightTo = (targetHeight: number) => {
    setActiveTab('jumping');
    setCurrentJumperIndex(0);
    if (!heights.includes(targetHeight)) {
      setHeights(prev => [...prev, targetHeight].sort((a, b) => a - b));
    }
    setCurrentHeight(targetHeight);
  };

  const doAdvanceHeight = () => {
    const idx = heights.indexOf(currentHeight);
    const inc = parseIncrementToMeters(incrementInput) || 0.15;
    const nextH = idx < heights.length - 1
      ? heights[idx + 1]
      : Number((currentHeight + inc).toFixed(4));
    doAdvanceHeightTo(nextH);
  };

  // Gate: ensure all athletes are done before advancing
  const tryAdvanceHeight = () => {
    const notDone = athletes.filter(a => {
      if (a.status === 'out' || a.checkedOut) return false;
      if (a.entryHeight && a.entryHeight > currentHeight) return false;
      const att = a.results[currentHeight] ?? [];
      const maxAtt = 3 - priorConsecutiveMisses(a.results, currentHeight);
      return !att.includes('O') && att.length < maxAtt;
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
    const idx = heights.indexOf(currentHeight);
    const inc = parseIncrementToMeters(incrementInput) || 0.15;
    const target = targetHeight !== undefined
      ? targetHeight
      : idx < heights.length - 1
        ? heights[idx + 1]
        : Number((currentHeight + inc).toFixed(4));

    // Check for athletes entering at this height who skipped 3+ heights
    const skippedCount = heights.filter(h => h < target).length;
    if (skippedCount >= 3) {
      const entering = athletes.filter(a => a.entryHeight && Math.abs(a.entryHeight - target) < 0.0001);
      if (entering.length > 0) {
        setRunThroughAthletes(entering);
        setPendingAdvanceHeight(target);
        return;
      }
    }

    doAdvanceHeightTo(target);
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
    setFlights([]); setCurrentFlightIdx(0); setCurrentRound(1);
    setSelectedEvent(null);
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
    link.download = `teton-vault-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ─── Record Mark Modal ────────────────────────────────────────────────────
  const renderMarkModal = () => {
    if (!markModalAthleteId) return null;
    const athlete = athletes.find(a => a.id === markModalAthleteId);
    if (!athlete) return null;

    const closeModal = () => { setMarkModalAthleteId(null); setMarkFt(''); setMarkIn('0'); };
    const saveAndClose = () => {
      const meters = parseMarkToMeters(markFt, markIn);
      if (meters > 0) recordAttempt(markModalAthleteId, 'O', meters);
      closeModal();
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Record Mark</h3>
            <p className="text-sm text-slate-500">{athlete.bibNumber ? `#${athlete.bibNumber} ` : ''}{athlete.name}</p>
          </div>
          <div className="p-5">
            {unit === 'imperial' ? (
              <div className="flex gap-3">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500">
                  <input
                    autoFocus type="number" step="1" min="0"
                    className="w-full outline-none text-2xl font-bold text-slate-800 bg-transparent"
                    value={markFt}
                    onChange={e => {
                      const val = e.target.value;
                      setMarkFt(val);
                      const threshold = selectedEvent && ['discus', 'javelin', 'hammer'].includes(selectedEvent) ? 3 : 2;
                      if (val.length >= threshold) {
                        markInRef.current?.focus();
                        markInRef.current?.select();
                      }
                    }}
                    placeholder="0"
                  />
                  <span className="text-sm font-bold text-slate-400 shrink-0">ft</span>
                </div>
                <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500">
                  <input
                    ref={markInRef}
                    type="number" step="0.25" min="0" max="11.75"
                    className="w-full outline-none text-2xl font-bold text-slate-800 bg-transparent"
                    value={markIn} onChange={e => setMarkIn(e.target.value)}
                  />
                  <span className="text-sm font-bold text-slate-400 shrink-0">in</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500">
                <input
                  autoFocus type="number" step="0.01" min="0"
                  className="w-full outline-none text-2xl font-bold text-slate-800 bg-transparent"
                  value={markFt} onChange={e => setMarkFt(e.target.value)}
                  placeholder="0.00"
                />
                <span className="text-sm font-bold text-slate-400 shrink-0">m</span>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-slate-100 space-y-2">
            <button
              onClick={saveAndClose}
              disabled={parseMarkToMeters(markFt, markIn) <= 0}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-all"
            >
                Save Mark
            </button>
            <button
              onClick={() => { recordAttempt(markModalAthleteId, 'X'); closeModal(); }}
              className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              Scratch (No Mark)
            </button>
            <button
              onClick={closeModal}
              className="w-full py-3 text-slate-400 font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Entry Height Modal (shared between setup + live screens) ───────────────
  const renderEntryHeightModal = () => {
    if (!editEntryHeightId) return null;
    const athlete = athletes.find(a => a.id === editEntryHeightId);
    if (!athlete) return null;

    const saveHeight = (meters: number | undefined) => {
      setAthletes(prev => prev.map(a =>
        a.id === editEntryHeightId ? { ...a, entryHeight: meters } : a
      ));
      setEditEntryHeightId(null);
    };

    // Build height list from configured start + increment
    const startM = parseInputToMeters(startHeightInput, startHeightInchesInput) || (7 * 12 * 0.0254);
    const incM = parseIncrementToMeters(incrementInput) || (unit === 'imperial' ? 6 * 0.0254 : 0.10);
    const maxM = unit === 'imperial' ? 20 * 12 * 0.0254 : 6.25;
    const heightOptions: number[] = [];
    let h = startM;
    while (h <= maxM + 0.0001) {
      heightOptions.push(Number(h.toFixed(4)));
      h = Number((h + incM).toFixed(4));
    }

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Set Entry Height</h3>
            <p className="text-sm text-slate-500">{athlete.bibNumber ? `#${athlete.bibNumber} ` : ''}{athlete.name}</p>
          </div>

          <div className="p-4 overflow-y-auto flex-1">
            {unit === 'imperial' ? (
              <div className="grid grid-cols-3 gap-1.5">
                {heightOptions.map((meters) => {
                  const totalIn = meters / 0.0254;
                  const ft = Math.floor(totalIn / 12);
                  const inches = Math.round(totalIn % 12);
                  const isSelected = !!(athlete.entryHeight && Math.abs(athlete.entryHeight - meters) < 0.001);
                  return (
                    <button
                      key={meters}
                      onClick={() => saveHeight(meters)}
                      className={cn(
                        'py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95',
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700',
                      )}
                    >
                      {ft}' {inches === 0 ? '0"' : `${inches}"`}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {heightOptions.map((meters) => {
                  const isSelected = !!(athlete.entryHeight && Math.abs(athlete.entryHeight - meters) < 0.001);
                  return (
                    <button
                      key={meters}
                      onClick={() => saveHeight(meters)}
                      className={cn(
                        'py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95',
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700',
                      )}
                    >
                      {meters.toFixed(2)}m
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 space-y-2">
            <button
              onClick={() => saveHeight(undefined)}
              className="w-full py-2.5 bg-slate-100 text-slate-500 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Starts at Opening Height
            </button>
            <button
              onClick={() => setEditEntryHeightId(null)}
              className="w-full py-2.5 text-slate-400 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Event Selection Screen ──────────────────────────────────────────────────
  if (!selectedEvent) {
    const heightEvents: EventType[] = ['pole-vault', 'high-jump'];
    const distanceEvents: EventType[] = ['long-jump', 'triple-jump', 'shot-put', 'discus', 'javelin', 'hammer'];
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-lg mx-auto">
          <header className="mb-8 text-center pt-2">
            <img src={logoSvg} alt="Teton Vault" className="w-20 h-20 mx-auto mb-3 drop-shadow-lg" />
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Teton Vault Officiate</h1>
            <p className="text-slate-500 mt-1 text-sm">Select your event to get started</p>
          </header>

          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Bar Height Events</p>
              <div className="grid grid-cols-2 gap-3">
                {heightEvents.map(evt => {
                  const meta = EVENT_META[evt];
                  return (
                    <button
                      key={evt}
                      onClick={() => setSelectedEvent(evt)}
                      className="flex flex-col items-start gap-2 p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 active:scale-[0.97] transition-all text-left shadow-sm"
                    >
                      {meta.svg
                        ? <img src={meta.svg} alt={meta.label} className="h-9 w-auto" />
                        : <span className="text-2xl">{meta.icon}</span>}
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{meta.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{meta.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Distance &amp; Throwing Events</p>
              <div className="grid grid-cols-3 gap-3">
                {distanceEvents.map(evt => {
                  const meta = EVENT_META[evt];
                  return (
                    <button
                      key={evt}
                      onClick={() => setSelectedEvent(evt)}
                      className="flex flex-col items-start gap-2 p-3 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 active:scale-[0.97] transition-all text-left shadow-sm"
                    >
                      {meta.svg
                        ? <img src={meta.svg} alt={meta.label} className="h-7 w-auto" />
                        : <span className="text-xl">{meta.icon}</span>}
                      <div>
                        <p className="font-bold text-slate-800 text-xs leading-tight">{meta.label}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{meta.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Setup Screen ────────────────────────────────────────────────────────────
  if (!isStarted) {

    // ─── Roster Sub-Screen ───────────────────────────────────────────────────
    if (setupView === 'roster') {
      return (
        <>
        <div className="h-screen flex flex-col bg-white overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-3 bg-white border-b border-slate-100 shrink-0">
            <button
              onClick={() => { setSetupView('main'); setShowRosterCSVImport(false); }}
              className="p-2 -ml-1 rounded-xl text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-slate-900 leading-tight">Athlete Roster</h2>
              <p className="text-[11px] text-slate-400 leading-tight">
                {athletes.length === 0 ? 'No athletes yet' : `${athletes.length} athlete${athletes.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={loadDemoData}
              className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg uppercase tracking-wider hover:bg-blue-100 transition-colors"
            >
              Demo
            </button>
            {athletes.length > 0 && (
              <button
                onClick={() => setAthletes([])}
                className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2.5 py-1.5 rounded-lg uppercase tracking-wider hover:bg-rose-100 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Add Athlete Form */}
          <div className="px-3 py-3 bg-slate-50 border-b border-slate-100 shrink-0 space-y-2">
            <form onSubmit={addManualAthlete} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Bib"
                  className="w-14 px-2 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-center font-bold bg-white"
                  value={manualBib}
                  onChange={e => setManualBib(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Athlete name *"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!manualName.trim()}
                  className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-40 transition-all active:scale-95 shrink-0"
                >
                  <Plus size={18} />
                </button>
              </div>
              <input
                type="text"
                placeholder="School (optional)"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                value={manualSchool}
                onChange={e => setManualSchool(e.target.value)}
              />
            </form>
            <button
              onClick={() => setShowRosterCSVImport(v => !v)}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Download size={13} />
              {showRosterCSVImport ? 'Hide CSV Import' : 'Import from CSV'}
            </button>
            {showRosterCSVImport && (
              <div className="pt-1">
                <CSVImporter onImport={(a) => { handleImport(a); setShowRosterCSVImport(false); }} unit={unit} />
              </div>
            )}
          </div>

          {/* Athlete List */}
          <div className="flex-1 overflow-y-auto">
            {athletes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 pb-20">
                <Users size={40} className="mb-3" />
                <p className="font-semibold text-sm">No athletes added yet</p>
                <p className="text-xs mt-1">Add manually or import CSV above</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {athletes.map(a => (
                  <div key={a.id} className="flex items-center gap-2 px-3 py-2.5">
                    <button
                      onClick={() => isHeightEvent && setEditEntryHeightId(a.id)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      {a.bibNumber && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                          #{a.bibNumber}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 truncate leading-tight">{a.name}</p>
                        {a.school && (
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate leading-tight">{a.school}</p>
                        )}
                      </div>
                      {isHeightEvent && (a.entryHeight ? (
                        <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full shrink-0 uppercase">
                          ↳ {formatHeight(a.entryHeight)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300 shrink-0 italic">tap to set height</span>
                      ))}
                    </button>
                    <button
                      onClick={() => removeAthlete(a.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 active:scale-90 transition-all shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Start Meet sticky footer */}
          <div className="px-3 py-3 border-t border-slate-100 bg-white shrink-0">
            <button
              onClick={startCompetition}
              disabled={athletes.length === 0}
              className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-base shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Start Meet <ChevronRight size={18} />
            </button>
          </div>

        </div>
        {renderEntryHeightModal()}
        </>
      );
    }

    return (
      <>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-lg mx-auto">
          <header className="mb-6 pt-2">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => { setSelectedEvent(null); setAthletes([]); setHeights([]); setCurrentHeight(0); setJumpOrderIds([]); }}
                className="p-2 -ml-1 rounded-xl text-slate-500 hover:bg-slate-200 active:scale-95 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{selectedEvent ? EVENT_META[selectedEvent].label : ''}</span>
            </div>
            <div className="text-center">
              <img src={logoSvg} alt="Teton Vault" className="w-16 h-16 mx-auto mb-3 drop-shadow-lg" />
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Teton Vault Officiate</h1>
              <p className="text-slate-500 mt-1 text-sm">{selectedEvent ? EVENT_META[selectedEvent].label : ''}</p>
            </div>
          </header>

          <div className="space-y-4">
            {/* Roster Navigation Card */}
            <button
              onClick={() => setSetupView('roster')}
              className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 active:scale-[0.98] transition-all text-left shadow-sm"
            >
              <div className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                athletes.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-500',
              )}>
                <Users size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900">Manage Roster</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {athletes.length === 0 ? 'Add athletes before starting' : `${athletes.length} athlete${athletes.length !== 1 ? 's' : ''} loaded`}
                </p>
              </div>
              {athletes.length > 0 && (
                <span className="text-sm font-black text-emerald-600 bg-emerald-50 w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
                  {athletes.length}
                </span>
              )}
              <ChevronRight size={18} className="text-slate-400 shrink-0" />
            </button>

            {/* Competition Settings — only for height events */}
            {isHeightEvent && <div className="space-y-4">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="text-blue-600" />
                    <h2 className="text-xl font-bold text-slate-800">Settings</h2>
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

                </div>
              </div>

            </div>}

            {/* Distance event settings */}
            {!isHeightEvent && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                    <Users size={18} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Flight Settings</h2>
                </div>
                <label className="text-sm font-bold text-slate-700 block mb-2">Athletes per Flight</label>
                <input
                  type="number"
                  min="1"
                  value={flightSizeStr}
                  onChange={e => {
                    setFlightSizeStr(e.target.value);
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1) setFlightSize(val);
                  }}
                  onBlur={() => {
                    const val = parseInt(flightSizeStr);
                    const clamped = isNaN(val) || val < 1 ? 1 : val;
                    setFlightSize(clamped);
                    setFlightSizeStr(String(clamped));
                  }}
                  className="w-24 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono text-center"
                />
                <p className="text-xs text-slate-400 mt-2">
                  {athletes.length > 0
                    ? `${Math.ceil(athletes.length / flightSize)} flight${Math.ceil(athletes.length / flightSize) !== 1 ? 's' : ''} of up to ${flightSize} athletes`
                    : 'Splits athletes into sequential groups of this size'}
                </p>
              </div>
            )}

            <button
              onClick={startCompetition}
              disabled={athletes.length === 0}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              Start Meet <ChevronRight size={20} />
            </button>

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

      {renderEntryHeightModal()}
      </>
    );
  }

  // ─── Distance Event Live Screen ───────────────────────────────────────────────
  if (!isHeightEvent) {
    const meta = EVENT_META[selectedEvent!];
    const allDone = athletes.length > 0 && athletes.every(a => (a.results[0]?.length ?? 0) >= 3);
    const currentFlightSet = new Set(flights[currentFlightIdx] ?? []);
    // "Competing" = current flight athletes who haven't taken their currentRound attempt yet
    const distCompeting = athletes.filter(a =>
      currentFlightSet.has(a.id) && !a.checkedOut && (a.results[0]?.length ?? 0) < currentRound
    );
    // "Waiting" = current flight athletes who have taken currentRound but aren't done yet (round in progress)
    const distWaiting = athletes.filter(a =>
      currentFlightSet.has(a.id) && !a.checkedOut &&
      (a.results[0]?.length ?? 0) >= currentRound && (a.results[0]?.length ?? 0) < 3
    );
    const distDone = athletes.filter(a => (a.results[0]?.length ?? 0) >= 3);
    const distAway = athletes.filter(a => !!a.checkedOut && (a.results[0]?.length ?? 0) < 3);

    const distFilteredAthletes = (() => {
      if (distanceTab === 'competing') return [...distCompeting, ...distWaiting];
      if (distanceTab === 'done') return distDone;
      return distAway;
    })();

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
                  <button onClick={() => setModal({ type: 'none', title: '', message: '' })} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                  <button
                    onClick={() => modal.type === 'save' ? confirmSave(modal.inputValue ?? '') : confirmReset()}
                    className={cn('flex-1 py-3 text-white font-bold rounded-xl transition-all', modal.type === 'reset' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700')}
                  >
                    {modal.type === 'save' ? 'Save Meet' : 'Reset All'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {renderMarkModal()}

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 shrink-0">
              <img src={logoSvg} alt="Teton Vault" className="w-9 h-9 rounded-lg" />
              <div>
                <h1 className="font-bold text-slate-900 leading-tight text-sm">{meta.label}</h1>
                <div className="flex items-center gap-1.5">
                  <Clock size={10} className="text-slate-400" />
                  <span className="text-[10px] text-slate-400 font-mono font-bold">{elapsedTime}</span>
                  {flights.length > 1 && (
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wide">
                      Flight {currentFlightIdx + 1}/{flights.length} · Rd {currentRound}/3
                    </span>
                  )}
                  {flights.length === 1 && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      Round {currentRound}/3
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={saveAndNew}
                className="flex items-center gap-1.5 px-2 py-2 sm:px-4 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
              >
                <Trophy size={14} />
                <span className="hidden sm:inline">Save &amp; New</span>
              </button>
              <button onClick={resetCompetition} className="p-2 text-slate-400 hover:text-rose-500 transition-colors" title="Reset">
                <RotateCcw size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* All done banner */}
        {allDone && (
          <div className="bg-gradient-to-r from-yellow-400 to-amber-400 px-6 py-4 text-center shadow-lg">
            <div className="flex items-center justify-center gap-3">
              <Medal size={24} className="text-yellow-800" />
              <span className="text-yellow-900 font-black text-xl tracking-tight">
                Competition complete! — {distanceLeaderboard[0]?.bestMark > 0 ? `${distanceLeaderboard[0].name} leads with ${formatMark(distanceLeaderboard[0].bestMark)}` : 'No marks recorded'}
              </span>
              <Medal size={24} className="text-yellow-800" />
            </div>
          </div>
        )}

        <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-4 pb-24">

          {/* Now [Action] bar */}
          {upcomingJumpers.length > 0 && activeView === 'athletes' && (
            <div className="bg-blue-50 border border-blue-200 px-3 py-2.5 rounded-2xl mb-4 flex items-center gap-2 sm:gap-4">
              {upcomingJumpers.map((athlete, i) => {
                const labels = [`Now ${meta.action}`, 'On Deck', 'On Hold'];
                return (
                  <div key={athlete.id} className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    {i > 0 && <div className="w-px h-8 bg-blue-200 shrink-0" />}
                    <div className="min-w-0">
                      <span className={`text-[9px] sm:text-[10px] font-bold uppercase block ${i === 0 ? 'text-blue-500' : 'text-blue-300'}`}>{labels[i]}</span>
                      <span className={`text-xs sm:text-base font-bold truncate block ${i === 0 ? 'text-blue-700' : 'text-blue-400'}`}>
                        {athlete.bibNumber ? `#${athlete.bibNumber} ` : ''}{athlete.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Athletes view */}
          {activeView === 'athletes' && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full">
                {([
                  { key: 'competing' as const, label: 'Competing', count: distCompeting.length + distWaiting.length, color: 'blue' },
                  { key: 'done' as const, label: 'Done', count: distDone.length, color: 'emerald' },
                  { key: 'away' as const, label: 'Away', count: distAway.length, color: 'amber' },
                ]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setDistanceTab(tab.key)}
                    className={cn(
                      'flex-1 px-2 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1 sm:gap-2',
                      distanceTab === tab.key ? `bg-white text-${tab.color}-600 shadow-sm` : 'text-slate-500 hover:text-slate-700',
                    )}
                  >
                    {tab.label}
                    <span className={cn('px-1.5 py-0.5 rounded-full text-[10px]', distanceTab === tab.key ? `bg-${tab.color}-100 text-${tab.color}-600` : 'bg-slate-200 text-slate-500')}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Athlete list */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {distFilteredAthletes.map(athlete => {
                    const isCurrentDist = athlete.id === currentJumperId && distanceTab === 'competing';
                    const attempts = athlete.results[0] ?? [];
                    const canAct = !athlete.checkedOut && attempts.length < 3;
                    const markVals = athlete.markValues ?? {};

                    if (isCurrentDist) {
                      return (
                        <div key={athlete.id} className="px-4 pt-4 pb-3 bg-blue-50 border-l-4 border-l-blue-500">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {athlete.bibNumber && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-blue-400 bg-blue-100">#{athlete.bibNumber}</span>}
                                <span className="font-bold text-blue-700 text-base">{athlete.name}</span>
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase animate-pulse">Now {meta.action}</span>
                              </div>
                              {athlete.school && <p className="text-xs uppercase tracking-wider text-blue-500 mt-0.5">{athlete.school}</p>}
                            </div>
                            {/* Attempt slots — tap last filled to erase */}
                            <div className="flex gap-1.5 items-center shrink-0">
                              {[0, 1, 2].map(i => {
                                const isLastFilled = attempts.length > 0 && i === attempts.length - 1;
                                return (
                                  <div
                                    key={i}
                                    onClick={isLastFilled ? () => setUndoConfirmId(athlete.id) : undefined}
                                    className={cn(
                                      'min-w-[2.5rem] h-10 rounded-lg flex items-center justify-center text-xs font-bold border px-1',
                                      attempts[i] === 'O' ? 'bg-emerald-500 text-white border-emerald-600' :
                                      attempts[i] === 'X' ? 'bg-rose-100 text-rose-600 border-rose-200' :
                                      'bg-white text-slate-300 border-blue-200',
                                      isLastFilled ? 'cursor-pointer hover:opacity-70 active:scale-90 transition-all' : '',
                                    )}
                                  >
                                    {attempts[i] === 'O' && markVals[i] ? formatMark(markVals[i]) : attempts[i] === 'X' ? 'S' : ''}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {canAct && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => { setMarkModalAthleteId(athlete.id); setMarkFt(''); setMarkIn('0'); }}
                                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
                              >
                                <Ruler size={22} />
                                <span className="text-[10px] font-bold uppercase tracking-wide">Record Mark</span>
                              </button>
                              <button
                                onClick={() => recordAttempt(athlete.id, 'X')}
                                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 active:scale-95 transition-all"
                              >
                                <X size={22} />
                                <span className="text-[10px] font-bold uppercase tracking-wide">Scratch</span>
                              </button>
                              <button
                                onClick={() => toggleCheckout(athlete.id)}
                                className="flex flex-col items-center justify-center gap-1 px-4 py-3 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 active:scale-95 transition-all"
                              >
                                <LogOut size={22} />
                                <span className="text-[10px] font-bold uppercase tracking-wide">Away</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Non-current athlete row
                    return (
                      <div key={athlete.id} className={cn('px-4 py-2.5', distanceTab === 'done' ? 'bg-white' : distanceTab === 'away' ? 'bg-amber-50/50' : 'bg-white hover:bg-slate-50/50')}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate leading-snug text-slate-900">
                              {athlete.bibNumber ? `#${athlete.bibNumber} ${athlete.name}` : athlete.name}
                              {athlete.checkedOut && <span className="ml-1 text-[10px] font-bold text-amber-600 bg-amber-100 px-1 py-0.5 rounded uppercase">Away</span>}
                            </p>
                            {athlete.school && <p className="text-[10px] uppercase tracking-wider text-slate-400 leading-snug">{athlete.school}</p>}
                          </div>
                          {/* 3 mark slots — tap last filled to erase */}
                          <div className="flex gap-1 shrink-0">
                            {[0, 1, 2].map(i => {
                              const isLastFilled = attempts.length > 0 && i === attempts.length - 1;
                              return (
                                <div
                                  key={i}
                                  onClick={isLastFilled ? () => setUndoConfirmId(athlete.id) : undefined}
                                  className={cn(
                                    'min-w-[2rem] h-7 rounded flex items-center justify-center text-[10px] font-bold border px-1',
                                    attempts[i] === 'O' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                    attempts[i] === 'X' ? 'bg-rose-50 text-rose-400 border-rose-100' :
                                    'bg-slate-100 text-slate-300 border-slate-200',
                                    isLastFilled ? 'cursor-pointer hover:opacity-70 active:scale-90 transition-all' : '',
                                  )}
                                >
                                  {attempts[i] === 'O' && markVals[i] ? formatMark(markVals[i]) : attempts[i] === 'X' ? 'S' : ''}
                                </div>
                              );
                            })}
                          </div>
                          {distanceTab === 'competing' && !athlete.checkedOut && (
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => { setMarkModalAthleteId(athlete.id); setMarkFt(''); setMarkIn('0'); }} className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 active:scale-95 transition-all" title="Record Mark"><Ruler size={14} /></button>
                              <button onClick={() => recordAttempt(athlete.id, 'X')} className="p-1.5 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 active:scale-95 transition-all" title="Scratch"><X size={14} /></button>
                              <button onClick={() => toggleCheckout(athlete.id)} className="p-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 active:scale-95 transition-all" title="Away"><LogOut size={14} /></button>
                            </div>
                          )}
                          {distanceTab === 'away' && (
                            <button onClick={() => toggleCheckout(athlete.id)} className="p-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 active:scale-95 transition-all" title="Check In"><LogIn size={14} /></button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {distFilteredAthletes.length === 0 && (
                    <div className="p-12 text-center text-slate-400 italic">
                      {distanceTab === 'competing' ? `All athletes have completed their ${meta.label.toLowerCase()} attempts.` :
                       distanceTab === 'done' ? 'No athletes have finished yet.' :
                       'No athletes are currently away.'}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Leaderboard view — distance */}
          {activeView === 'leaderboard' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <Medal size={18} className="text-amber-500" />
                  Current Standings
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {distanceLeaderboard.map((a, i) => (
                  <div key={a.id} className={cn('flex items-center gap-4 px-6 py-4', i === 0 ? 'bg-yellow-50' : i === 1 ? 'bg-slate-50' : i === 2 ? 'bg-orange-50' : 'bg-white')}>
                    <div className="w-10 shrink-0 text-center">
                      {i < 3 ? (
                        <span className="text-lg font-black">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                      ) : (
                        <span className="text-sm font-bold text-slate-400">{getPlaceLabel(i)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {a.bibNumber && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{a.bibNumber}</span>}
                        <span className="font-bold text-slate-900">{a.name}</span>
                      </div>
                      {a.school && <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{a.school}</p>}
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {[0, 1, 2].map(idx => {
                          const att = (a.results[0] ?? [])[idx];
                          const m = (a.markValues ?? {})[idx];
                          return (
                            <span key={idx} className={cn('text-[10px] font-mono font-bold px-1.5 py-0.5 rounded', att === 'O' && m ? 'bg-emerald-50 text-emerald-700' : att === 'X' ? 'bg-rose-50 text-rose-400' : 'bg-slate-50 text-slate-300')}>
                              {att === 'O' && m ? formatMark(m) : att === 'X' ? 'S' : '—'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-black text-lg text-slate-800">
                        {a.bestMark > 0 ? formatMark(a.bestMark) : <span className="text-slate-300 text-base">ND</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {distanceLeaderboard.length === 0 && (
                  <div className="p-12 text-center text-slate-400 italic">No athletes in competition yet.</div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Sticky bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20 flex">
          <button onClick={() => setActiveView('athletes')} className={cn('flex-1 flex flex-col items-center py-3 gap-1 transition-colors', activeView === 'athletes' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600')}>
            <Users size={22} />
            <span className="text-[10px] font-bold uppercase">Athletes</span>
          </button>
          <button onClick={() => setActiveView('leaderboard')} className={cn('flex-1 flex flex-col items-center py-3 gap-1 transition-colors', activeView === 'leaderboard' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600')}>
            <Medal size={22} />
            <span className="text-[10px] font-bold uppercase">Standings</span>
          </button>
        </nav>
      </div>
    );
  }

  // ─── Height Event Live Screen ─────────────────────────────────────────────────
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
        const heightKey = isHeightEvent ? currentHeight : 0;
        const lastAttempt = athlete?.results[heightKey]?.at(-1);
        const lastIdx = (athlete?.results[heightKey]?.length ?? 1) - 1;
        const distMark = !isHeightEvent && lastAttempt === 'O' ? athlete?.markValues?.[lastIdx] : null;
        const attemptLabel = lastAttempt === 'O'
          ? (distMark ? formatMark(distMark) : 'Make ✓')
          : lastAttempt === 'X' ? 'Scratch ✗' : 'Pass —';
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

      {/* Run-Through Alert Dialog */}
      {runThroughAthletes.length > 0 && pendingAdvanceHeight !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Run-Through Alert</h3>
                  <p className="text-xs text-slate-500">Bar advancing to {formatHeight(pendingAdvanceHeight)}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                The following athlete{runThroughAthletes.length > 1 ? 's are' : ' is'} entering the competition
                after passing <span className="font-bold text-slate-800">3+ heights</span> and{' '}
                {runThroughAthletes.length > 1 ? 'are' : 'is'} eligible for a{' '}
                <span className="font-bold text-slate-800">run-through warm-up</span>:
              </p>
              <ul className="mb-5 space-y-1">
                {runThroughAthletes.map(a => (
                  <li key={a.id} className="flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2">
                    <span className="text-xs font-bold text-amber-700">
                      {a.bibNumber ? `#${a.bibNumber}` : '—'}
                    </span>
                    <span className="text-sm font-bold text-slate-800">{a.name}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  const target = pendingAdvanceHeight;
                  setRunThroughAthletes([]);
                  setPendingAdvanceHeight(null);
                  doAdvanceHeightTo(target);
                }}
                className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors"
              >
                Got it — Advance to {formatHeight(pendingAdvanceHeight)}
              </button>
            </div>
          </div>
        </div>
      )}

      {renderEntryHeightModal()}

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
              <img src={logoSvg} alt="Teton Vault" className="w-9 h-9 rounded-lg" />
              <div>
                <h1 className="font-bold text-slate-900 leading-tight text-sm">Teton Vault</h1>
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
        {upcomingJumpers.length > 0 && activeView === 'athletes' && (
          <div className="bg-blue-50 border border-blue-200 px-3 py-2.5 rounded-2xl mb-4 flex items-center gap-2 sm:gap-4">
            {upcomingJumpers.map((athlete, i) => {
              const labels = ['Now Jumping', 'On Deck', 'On Hold'];
              return (
                <div key={athlete.id} className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                  {i > 0 && <div className="w-px h-8 bg-blue-200 shrink-0" />}
                  <div className="min-w-0">
                    <span className={`text-[9px] sm:text-[10px] font-bold uppercase block ${i === 0 ? 'text-blue-500' : 'text-blue-300'}`}>
                      {labels[i]}
                    </span>
                    <span className={`text-xs sm:text-base font-bold truncate block ${i === 0 ? 'text-blue-700' : 'text-blue-400'}`}>
                      {athlete.bibNumber ? `#${athlete.bibNumber} ` : ''}{athlete.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Athletes View */}
        {activeView === 'athletes' && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full">
              {([
                { key: 'jumping', label: 'Jumping', color: 'blue', count: athletes.filter(a => a.status !== 'out' && !(a.results[currentHeight] ?? []).includes('O') && !a.checkedOut && !(a.entryHeight && a.entryHeight > currentHeight)).length },
                { key: 'cleared', label: 'Cleared', color: 'emerald', count: athletes.filter(a => (a.results[currentHeight] ?? []).includes('O')).length },
                { key: 'out', label: 'Out', color: 'rose', count: outAthletes.length },
                { key: 'checkedOut', label: 'Away', color: 'amber', count: checkedOutAthletes.length },
                { key: 'upcoming', label: 'Upcoming', color: 'violet', count: athletes.filter(a => a.entryHeight && a.entryHeight > currentHeight && a.status !== 'out').length },
              ] as const).filter(tab => tab.key !== 'upcoming' || tab.count > 0).map(tab => (
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
                      isUpcoming={activeTab === 'upcoming'}
                      maxAttempts={3 - priorConsecutiveMisses(athlete.results, currentHeight)}
                      onEditEntryHeight={activeTab === 'upcoming' ? (id) => {
                        const a = athletes.find(x => x.id === id);
                        if (!a) return;
                        if (unit === 'imperial' && a.entryHeight) {
                          const totalIn = a.entryHeight / 0.0254;
                          setEditEntryHeightFt(String(Math.floor(totalIn / 12)));
                          setEditEntryHeightIn(String(Math.round(totalIn % 12)));
                        } else {
                          setEditEntryHeightFt(a.entryHeight ? a.entryHeight.toFixed(2) : '');
                          setEditEntryHeightIn('0');
                        }
                        setEditEntryHeightId(id);
                      } : undefined}
                    />
                  </React.Fragment>
                ))}
                {filteredAthletes.length === 0 && (
                  <div className="p-12 text-center text-slate-400 italic">
                    {activeTab === 'jumping' ? 'All athletes have finished jumping at this height.' :
                     activeTab === 'cleared' ? 'No athletes have cleared this height yet.' :
                     activeTab === 'out' ? 'No athletes are out of the competition yet.' :
                     activeTab === 'upcoming' ? 'No athletes with future entry heights.' :
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
