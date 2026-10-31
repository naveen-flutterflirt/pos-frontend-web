'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChefHat,
  ArrowLeft,
  Check,
  Clock,
  Flame,
  Coffee,
  IceCream,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  RotateCcw,
  Tv,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { getApiBaseUrl } from '../../../lib/config';

export interface KitchenTicketItem {
  name: string;
  qty: number;
  notes?: string;
}

export interface KitchenTicket {
  id: string;
  kotNo?: string;
  orderNo?: string;
  source: string; // e.g. "T1 · KOT 12"
  channel: 'dine_in' | 'swiggy' | 'zomato' | 'kiosk';
  tableLabel?: string;
  status: 'new' | 'in_progress' | 'ready' | 'served';
  firedAt: string; // ISO string
  elapsedSeconds: number;
  items: KitchenTicketItem[];
}

const STATIONS = [
  { id: 'hot-kitchen', label: 'Hot Kitchen', icon: Flame, desc: 'Hot Mains, Pasta, Sandwiches' },
  { id: 'cold-kitchen', label: 'Cold Kitchen & Bakery', icon: IceCream, desc: 'Salads, Desserts, Bakery' },
  { id: 'bar', label: 'Bar & Beverages', icon: Coffee, desc: 'Espresso, Cold Brews, Shakes, Tea' },
  { id: 'all', label: 'All Stations (Master KDS)', icon: UtensilsCrossed, desc: 'Complete Kitchen Overview' },
];

export default function DynamicKdsPage() {
  const params = useParams();
  const router = useRouter();
  const stationId = (params?.stationId as string) || 'hot-kitchen';

  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [completedTickets, setCompletedTickets] = useState<KitchenTicket[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Play pleasant chime on new KOT
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch { }
  }, [soundEnabled]);

  // Load active KOTs from both Fastify Backend and localStorage
  const fetchLiveKots = useCallback(async () => {
    let combinedTickets: KitchenTicket[] = [];

    // 1. Fetch from Local Storage (instant client-side sync)
    if (typeof window !== 'undefined') {
      try {
        const rawLocal = localStorage.getItem('bizbox_live_kots');
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          parsed.forEach((k: any) => {
            const firedTime = k.firedAt ? new Date(k.firedAt).getTime() : Date.now();
            const elapsed = Math.max(0, Math.floor((Date.now() - firedTime) / 1000));
            combinedTickets.push({
              id: k.id || `kot_${Date.now()}`,
              kotNo: k.kotNo,
              orderNo: k.orderNo,
              source: `${k.tableLabel || 'Table T1'} · ${k.kotNo || 'KOT'}`,
              channel: k.channel || 'dine_in',
              tableLabel: k.tableLabel || 'T1',
              status: k.status || 'new',
              firedAt: k.firedAt || new Date().toISOString(),
              elapsedSeconds: elapsed,
              items: k.items || [],
            });
          });
        }
      } catch (err) {
        console.warn('Local KDS read error:', err);
      }
    }

    // 2. Fetch from Fastify Backend API (/v1/stations/kots)
    try {
      const res = await fetch(`${getApiBaseUrl()}/stations/kots`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          json.data.forEach((k: any) => {
            const firedTime = k.fired_at ? new Date(k.fired_at).getTime() : Date.now();
            const elapsed = Math.max(0, Math.floor((Date.now() - firedTime) / 1000));
            // Check if not already in list
            if (!combinedTickets.some((t) => t.id === k.id || (k.kot_no && t.kotNo === k.kot_no))) {
              combinedTickets.push({
                id: k.id,
                kotNo: k.kot_no,
                orderNo: k.order_no,
                source: `${k.table_label || 'T1'} · ${k.kot_no || 'KOT'}`,
                channel: 'dine_in',
                tableLabel: k.table_label || 'T1',
                status: k.status || 'new',
                firedAt: k.fired_at || new Date().toISOString(),
                elapsedSeconds: elapsed,
                items: Array.isArray(k.items) ? k.items : [],
              });
            }
          });
        }
      }
    } catch {
      // Backend offline is gracefully handled
    }

    // If completely empty, seed a realistic sample KOT so KDS is never completely blank on first boot
    if (combinedTickets.length === 0) {
      combinedTickets = [
        {
          id: 'sample-kot-1',
          kotNo: 'KOT-101',
          orderNo: 'ORD-9021',
          source: 'Table T1 · KOT-101',
          channel: 'dine_in',
          tableLabel: 'Table T1',
          status: 'new',
          firedAt: new Date(Date.now() - 140000).toISOString(),
          elapsedSeconds: 140,
          items: [
            { name: 'Cold Coffee Frappe', qty: 1, notes: 'Less sweet, extra ice' },
            { name: 'Club Sandwich', qty: 1, notes: 'Brown bread, cut in 4' },
          ],
        },
        {
          id: 'sample-kot-2',
          kotNo: 'KOT-102',
          orderNo: 'ORD-9022',
          source: 'Table T4 · KOT-102',
          channel: 'dine_in',
          tableLabel: 'Table T4',
          status: 'in_progress',
          firedAt: new Date(Date.now() - 520000).toISOString(),
          elapsedSeconds: 520,
          items: [
            { name: 'Penne Arrabbiata', qty: 2, notes: 'Spicy, extra cheese' },
            { name: 'Iced Americano', qty: 1, notes: 'Oat milk' },
          ],
        },
      ];
    }

    // Filter active vs completed
    const active = combinedTickets.filter((t) => t.status === 'new' || t.status === 'in_progress');
    const completed = combinedTickets.filter((t) => t.status === 'ready' || t.status === 'served');

    setTickets(active);
    setCompletedTickets(completed);
    setLastUpdated(new Date());
  }, []);

  // Station-based filtering of items/tickets
  const filteredTickets = useMemo(() => {
    if (stationId === 'all') return tickets;

    return tickets.filter((ticket) => {
      if (stationId === 'bar') {
        // Bar shows coffee, tea, beverages, shakes, smoothies
        return ticket.items.some((it) =>
          it.name.toLowerCase().match(/coffee|tea|brew|frappe|shake|smoothie|water|soda|drink|beverage|latte|americano/i)
        );
      }
      if (stationId === 'cold-kitchen') {
        // Cold kitchen shows bakery, desserts, salads, ice cream
        return ticket.items.some((it) =>
          it.name.toLowerCase().match(/salad|dessert|cake|bakery|croissant|muffin|brownie|ice cream/i)
        );
      }
      if (stationId === 'hot-kitchen') {
        // Hot kitchen shows food, pasta, sandwich, burgers, pizza, wraps
        return ticket.items.some((it) =>
          !it.name.toLowerCase().match(/coffee|tea|brew|frappe|shake|smoothie|water|soda|drink/i) ||
          it.name.toLowerCase().match(/sandwich|pasta|burger|pizza|wrap|fries|rice|curry|meal|tikka/i)
        );
      }
      return true;
    });
  }, [tickets, stationId]);

  // Initial load and periodic polling
  useEffect(() => {
    fetchLiveKots();
    const pollTimer = setInterval(fetchLiveKots, 3000);

    // Listen to custom KOT fired events across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'bizbox_live_kots') {
        fetchLiveKots();
        playAlertSound();
      }
    };
    const handleKotFired = () => {
      fetchLiveKots();
      playAlertSound();
      showToast('🔔 New KOT arrived from billing terminal!');
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('bizbox_kot_fired', handleKotFired);

    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('bizbox_kot_fired', handleKotFired);
    };
  }, [fetchLiveKots, playAlertSound]);

  // Real-time ticking timer (1s interval)
  useEffect(() => {
    const secondTimer = setInterval(() => {
      setTickets((prev) =>
        prev.map((t) => ({
          ...t,
          elapsedSeconds: t.elapsedSeconds + 1,
        }))
      );
    }, 1000);
    return () => clearInterval(secondTimer);
  }, []);

  // Chef BUMP handler (marks KOT as ready)
  const handleBump = async (ticket: KitchenTicket) => {
    // 1. Update backend API
    try {
      await fetch(`${getApiBaseUrl()}/stations/kots/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ready' }),
      });
    } catch { }

    // 2. Update localStorage['bizbox_live_kots']
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('bizbox_live_kots');
        if (raw) {
          const list = JSON.parse(raw);
          const updated = list.map((k: any) =>
            k.id === ticket.id ? { ...k, status: 'ready', readyAt: new Date().toISOString() } : k
          );
          localStorage.setItem('bizbox_live_kots', JSON.stringify(updated));
        }

        // Add to Ready tokens list for /token-display TV
        const rawReady = localStorage.getItem('bizbox_ready_tokens');
        const readyList = rawReady ? JSON.parse(rawReady) : [];
        const tokenLabel = ticket.tableLabel || ticket.kotNo || ticket.orderNo?.slice(-4) || 'T1';
        if (!readyList.includes(tokenLabel)) {
          const newReadyList = [tokenLabel, ...readyList].slice(0, 20);
          localStorage.setItem('bizbox_ready_tokens', JSON.stringify(newReadyList));
          window.dispatchEvent(new Event('storage'));
        }
      } catch { }
    }

    // 3. Move from Active to Completed in state
    setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
    setCompletedTickets((prev) => [{ ...ticket, status: 'ready' }, ...prev]);

    showToast(`✅ ${ticket.source} bumped! Moved to Ready for Pickup TV.`);
  };

  // Format MM:SS
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  // Aging thresholds
  const getHeaderColor = (secs: number) => {
    if (secs < 480) return 'bg-[#12B39A] text-white'; // Green < 8m
    if (secs < 720) return 'bg-[#F59E0B] text-white'; // Amber 8-12m
    return 'bg-[#E91E7B] text-white animate-pulse'; // Red >= 12m
  };

  const getBumpButtonColor = (secs: number) => {
    if (secs < 480) return 'bg-[#12B39A] hover:bg-[#0E937E] active:scale-95';
    if (secs < 720) return 'bg-[#F59E0B] hover:bg-[#D97706] active:scale-95';
    return 'bg-[#E91E7B] hover:bg-[#D0156B] active:scale-95';
  };

  const currentStation = STATIONS.find((s) => s.id === stationId) || STATIONS[0];

  return (
    <div className="flex flex-col h-screen bg-[#071533] text-white select-none overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-slate-900 border-2 border-indigo-400 text-white px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="h-16 bg-[#0B1F4B] px-4 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Link
            href="/billing"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Back to POS Billing"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg tracking-wide text-white">
                  KDS · {currentStation.label}
                </h1>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">{currentStation.desc}</p>
            </div>
          </div>
        </div>

        {/* Station Switcher Pills */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-700/80">
          {STATIONS.map((st) => (
            <button
              key={st.id}
              onClick={() => router.push(`/kds/${st.id}`)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                stationId === st.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <st.icon className="w-3.5 h-3.5" />
              <span>{st.label}</span>
            </button>
          ))}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3 text-xs">
          {/* Active vs Completed Tab */}
          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                activeTab === 'active' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active ({filteredTickets.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                activeTab === 'completed' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Bumped ({completedTickets.length})
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border transition cursor-pointer ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
            title={soundEnabled ? 'Chime sound enabled' : 'Chime muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Link to Token Display TV */}
          <Link
            href="/token-display"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg font-bold transition"
            title="Open Token Pickup TV in new tab"
          >
            <Tv className="w-3.5 h-3.5 text-indigo-400" />
            <span>Token TV</span>
          </Link>
        </div>
      </header>

      {/* Main Ticket Cards Container */}
      <main className="flex-1 p-4 overflow-x-auto flex gap-4 items-start">
        {activeTab === 'active' &&
          filteredTickets.map((ticket) => {
            const headerBg = getHeaderColor(ticket.elapsedSeconds);
            const bumpBtn = getBumpButtonColor(ticket.elapsedSeconds);

            return (
              <div
                key={ticket.id}
                className="w-80 bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden flex flex-col shrink-0 shadow-2xl transition hover:border-slate-500"
              >
                {/* Header & Aging Timer */}
                <div className={`p-3.5 flex items-center justify-between font-black ${headerBg}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base tracking-wide">{ticket.source}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono text-base">{formatTimer(ticket.elapsedSeconds)}</span>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-4 flex-1 overflow-y-auto max-h-[calc(100vh-250px)] space-y-3">
                  {ticket.items.map((item, idx) => (
                    <div key={idx} className="border-b border-slate-800 pb-2.5 last:border-0">
                      <div className="flex items-start gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-indigo-900/80 text-indigo-200 border border-indigo-700 font-black text-sm flex items-center justify-center shrink-0">
                          {item.qty}
                        </span>
                        <div className="flex-1">
                          <span className="font-bold text-sm text-slate-100 block leading-tight">
                            {item.name}
                          </span>
                          {item.notes && (
                            <p className="text-xs text-amber-300 font-semibold italic mt-1 bg-amber-950/40 p-1 rounded border border-amber-900/50">
                              ⚠️ {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* BUMP Action Button */}
                <div className="p-3 border-t border-slate-800 bg-slate-950/80">
                  <button
                    onClick={() => handleBump(ticket)}
                    className={`w-full min-h-[50px] rounded-xl font-black text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg transition cursor-pointer text-white ${bumpBtn}`}
                  >
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>BUMP / READY ✓</span>
                  </button>
                </div>
              </div>
            );
          })}

        {/* Empty State */}
        {activeTab === 'active' && filteredTickets.length === 0 && (
          <div className="flex-1 h-full flex flex-col items-center justify-center text-slate-500 py-16">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <Check className="w-10 h-10 stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-black text-slate-200">All Orders Bumped Cleanly!</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
              No pending orders for <strong>{currentStation.label}</strong>. When cashier fires a KOT from Billing, it will appear here instantly.
            </p>
          </div>
        )}

        {/* Bumped History Tab */}
        {activeTab === 'completed' && (
          <div className="flex-1 overflow-x-auto flex gap-4">
            {completedTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="w-72 bg-slate-900/60 border border-slate-800 rounded-xl p-4 shrink-0 space-y-2 opacity-75"
              >
                <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                  <span>{ticket.source}</span>
                  <span>COMPLETED ✓</span>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  {ticket.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{it.name}</span>
                      <span className="font-bold">x{it.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer Station Status & Legend */}
      <footer className="h-10 bg-[#0B1F4B] border-t border-slate-800 px-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#12B39A]"></span>
            Green &lt; 8 min
          </span>
          <span className="flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
            Amber 8–12 min
          </span>
          <span className="flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E91E7B]"></span>
            Red &ge; 12 min
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span>Auto-sync Active · Last ping: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </footer>
    </div>
  );
}
