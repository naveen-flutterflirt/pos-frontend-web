'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  Maximize2,
  Volume2,
  VolumeX,
  Sparkles,
  UtensilsCrossed,
  RotateCcw,
  Plus,
  Trash2,
} from 'lucide-react';
import { getApiBaseUrl } from '../../lib/config';

export default function TokenDisplayPage() {
  const [preparingTokens, setPreparingTokens] = useState<string[]>([]);
  const [readyTokens, setReadyTokens] = useState<string[]>([]);
  const [outletName, setOutletName] = useState('Indiranagar');
  const [currentTime, setCurrentTime] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');

  // Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Outlet Name
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bizbox_pos_outlet');
      if (saved) {
        if (saved.toLowerCase().includes('koramangala') || saved === 'BLR02') setOutletName('Koramangala (BLR02)');
        else if (saved.toLowerCase().includes('connaught') || saved === 'DEL01') setOutletName('Connaught Place (DEL01)');
        else if (saved.toLowerCase().includes('bandra') || saved === 'MUM01') setOutletName('Bandra West (MUM01)');
        else setOutletName('Indiranagar (BLR01)');
      }
    }
  }, []);

  // Audio chime
  const playPickupChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.3); // G5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch { }
  }, [soundEnabled]);

  // Load live tokens from localStorage and backend
  const refreshTokens = useCallback(async () => {
    let prepList: string[] = [];
    let readyList: string[] = [];

    if (typeof window !== 'undefined') {
      try {
        // 1. Read live KOTs from storage
        const rawKots = localStorage.getItem('bizbox_live_kots');
        if (rawKots) {
          const kots = JSON.parse(rawKots);
          kots.forEach((k: any) => {
            const token = k.tableLabel || k.kotNo?.slice(-4) || k.orderNo?.slice(-4) || 'T1';
            if (k.status === 'new' || k.status === 'in_progress') {
              if (!prepList.includes(token)) prepList.push(token);
            } else if (k.status === 'ready') {
              if (!readyList.includes(token)) readyList.push(token);
            }
          });
        }

        // 2. Read explicit ready tokens
        const rawReady = localStorage.getItem('bizbox_ready_tokens');
        if (rawReady) {
          const list = JSON.parse(rawReady);
          list.forEach((tok: string) => {
            if (!readyList.includes(tok)) readyList.push(tok);
          });
        }
      } catch (e) {
        console.warn('Token read error:', e);
      }
    }

    // 3. Backend API fallback
    try {
      const res = await fetch(`${getApiBaseUrl()}/stations/kots`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          json.data.forEach((k: any) => {
            const token = k.table_label || k.kot_no || k.order_no?.slice(-4) || 'T1';
            if ((k.status === 'new' || k.status === 'in_progress') && !prepList.includes(token)) {
              prepList.push(token);
            }
          });
        }
      }
    } catch { }

    // Seed defaults if brand new session
    if (prepList.length === 0 && readyList.length === 0) {
      prepList = ['T1', 'T4', 'Takeaway #12', 'Swiggy #881'];
      readyList = ['T3', 'Token #10'];
    }

    // Filter out ready from prep
    prepList = prepList.filter((p) => !readyList.includes(p));

    setPreparingTokens(prepList);
    setReadyTokens(readyList);
  }, []);

  useEffect(() => {
    refreshTokens();
    const poll = setInterval(refreshTokens, 3000);

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'bizbox_ready_tokens' || e.key === 'bizbox_live_kots') {
        refreshTokens();
        playPickupChime();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      clearInterval(poll);
      window.removeEventListener('storage', onStorage);
    };
  }, [refreshTokens, playPickupChime]);

  // Fullscreen toggle
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  };

  // Clear served tokens
  const handleClearReady = () => {
    setReadyTokens([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bizbox_ready_tokens');
    }
  };

  return (
    <div className="h-screen bg-[#071533] text-white flex flex-col overflow-hidden select-none font-sans">
      {/* Top TV Banner */}
      <header className="h-20 bg-[#0B1F4B] px-8 flex items-center justify-between border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-4">
          <Link
            href="/billing"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
            title="Back to POS Billing"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-[#E91E7B] animate-ping"></span>
            <div>
              <h1 className="font-black text-2xl tracking-wide">
                Brew Street Cafe · {outletName}
              </h1>
              <p className="text-xs text-slate-400 font-semibold">Live Kitchen Order & Pickup Status</p>
            </div>
          </div>
        </div>

        {/* Right TV Controls */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-lg font-mono font-black text-indigo-300 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-700">
            <Clock className="w-5 h-5 text-indigo-400" />
            <span>{currentTime}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
              title={soundEnabled ? 'Chime sound on' : 'Muted'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleFullScreen}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
              title="Toggle Fullscreen TV Mode"
            >
              <Maximize2 className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowManualModal(true)}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
              title="Add token manually"
            >
              <Plus className="w-4 h-4" />
              <span>Token</span>
            </button>

            <button
              onClick={handleClearReady}
              className="p-2.5 bg-slate-800 hover:bg-rose-900/60 border border-slate-700 hover:border-rose-700 text-slate-400 hover:text-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
              title="Clear served tokens"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Grid (50% Preparing | 50% Ready for Pickup) */}
      <main className="flex-1 grid grid-cols-2 divide-x-2 divide-slate-800 p-8 gap-8 overflow-hidden">
        {/* Left Column: NOW PREPARING */}
        <div className="flex flex-col pr-4 overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b-2 border-amber-500/30 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-amber-400 uppercase tracking-wider">
                  Now Preparing
                </h2>
                <span className="text-xs text-slate-400 font-semibold">Kitchen is preparing your fresh order</span>
              </div>
            </div>
            <span className="text-xl font-mono font-black text-amber-400 bg-amber-950/40 border border-amber-500/30 px-3.5 py-1 rounded-xl">
              {preparingTokens.length} Orders
            </span>
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-5 content-start">
            {preparingTokens.map((token) => (
              <div
                key={token}
                className="bg-slate-900/90 border-2 border-slate-700 hover:border-amber-400/60 rounded-3xl p-6 text-center flex flex-col items-center justify-center shadow-lg transition"
              >
                <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-1">
                  ORDER / TABLE
                </span>
                <span className="text-4xl sm:text-5xl font-black font-mono text-slate-200 tracking-tight">
                  {token}
                </span>
                <span className="text-[11px] text-amber-400 font-bold mt-2 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  Cooking...
                </span>
              </div>
            ))}

            {preparingTokens.length === 0 && (
              <div className="col-span-3 text-center py-20 text-slate-500">
                <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 text-slate-600" />
                <p className="text-lg font-bold text-slate-400">No orders cooking currently</p>
                <p className="text-xs text-slate-600">New orders will show up here automatically</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: READY FOR PICKUP */}
        <div className="flex flex-col pl-8 overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b-2 border-emerald-500/40 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <span>Ready For Pickup</span>
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                </h2>
                <span className="text-xs text-slate-400 font-semibold">Please collect from counter with token</span>
              </div>
            </div>
            <span className="text-xl font-mono font-black text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3.5 py-1 rounded-xl">
              {readyTokens.length} Ready
            </span>
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-5 content-start">
            {readyTokens.map((token) => (
              <div
                key={token}
                className="bg-emerald-950/30 border-4 border-emerald-500 rounded-3xl p-6 text-center flex flex-col items-center justify-center shadow-2xl animate-pulse"
              >
                <span className="text-xs uppercase font-extrabold text-emerald-400 tracking-wider mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>COLLECT ORDER</span>
                </span>
                <span className="text-5xl sm:text-6xl font-black font-mono text-emerald-300 tracking-tight">
                  {token}
                </span>
                <span className="text-xs text-emerald-400 font-extrabold mt-2 px-3 py-0.5 bg-emerald-500/20 rounded-full border border-emerald-500/40">
                  READY NOW ✓
                </span>
              </div>
            ))}

            {readyTokens.length === 0 && (
              <div className="col-span-3 text-center py-20 text-slate-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-slate-600" />
                <p className="text-lg font-bold text-slate-400">All prepared orders collected!</p>
                <p className="text-xs text-slate-600">When chef bumps an order in KDS, it appears here</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Manual Token Add Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-white">Add Token to Ready Display</h3>
            <p className="text-xs text-slate-400">
              Enter customer token or table number to display in Ready column:
            </p>
            <input
              type="text"
              autoFocus
              value={manualTokenInput}
              onChange={(e) => setManualTokenInput(e.target.value)}
              placeholder="e.g. T5 or #884"
              className="w-full text-center tracking-widest text-3xl font-black font-mono py-3 bg-slate-950 border-2 border-indigo-500 rounded-2xl text-white focus:outline-none"
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  if (manualTokenInput.trim()) {
                    const tok = manualTokenInput.trim();
                    const newReady = [tok, ...readyTokens.filter((t) => t !== tok)];
                    setReadyTokens(newReady);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('bizbox_ready_tokens', JSON.stringify(newReady));
                      window.dispatchEvent(new Event('storage'));
                    }
                    playPickupChime();
                    setManualTokenInput('');
                    setShowManualModal(false);
                  }
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-xl cursor-pointer"
              >
                Mark Ready ✓
              </button>
              <button
                onClick={() => setShowManualModal(false)}
                className="px-4 py-3 bg-slate-800 text-slate-400 hover:text-white font-bold text-sm rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
