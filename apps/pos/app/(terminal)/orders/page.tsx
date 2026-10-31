'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Store, Utensils, Check, X, Clock, ExternalLink, RefreshCw, Radio } from 'lucide-react';
import { getApiBaseUrl } from '../../../lib/config';
import { Skeleton } from '../../../components/ui/Skeleton';

interface LiveOrderCard {
  id: string;
  channel: 'pos' | 'swiggy' | 'zomato' | 'ondc';
  orderNo: string;
  source: string;
  itemsSummary: string;
  amount: number;
  status: 'pending_accept' | 'preparing' | 'ready';
  timeAgo: string;
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'online' | 'dine_in'>('all');
  const [orders, setOrders] = useState<LiveOrderCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLiveOrders = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/orders`);
      if (res.ok) {
        const json = await res.json();
        setIsLiveConnected(true);
        const apiCards: LiveOrderCard[] = (json && Array.isArray(json.data)) ? json.data.map((item: any) => {
          const ch = (item.channel || 'pos').toLowerCase();
          const validCh = (['pos', 'swiggy', 'zomato', 'ondc'].includes(ch) ? ch : 'pos') as LiveOrderCard['channel'];
          
          let status: LiveOrderCard['status'] = 'preparing';
          if (item.status === 'settled') status = 'ready';
          else if (item.status === 'fired') status = 'preparing';
          else if (ch === 'swiggy' || ch === 'zomato') status = 'pending_accept';

          let itemsStr = 'Kitchen items';
          if (Array.isArray(item.items) && item.items.length > 0) {
            itemsStr = item.items.map((it: any) => `${it.qty}x ${it.name}`).join(', ');
          }

          const elapsedMins = item.created_at
            ? Math.max(0, Math.floor((Date.now() - new Date(item.created_at).getTime()) / 60000))
            : 0;
          const timeAgo = elapsedMins < 1 ? 'Just now' : `${elapsedMins}m ago`;

          const src = validCh === 'pos'
            ? (item.table_label ? `Dine-In (Table ${item.table_label})` : 'Dine-In (Counter)')
            : validCh === 'swiggy'
            ? 'Swiggy Delivery'
            : validCh === 'zomato'
            ? 'Zomato Delivery'
            : 'ONDC (Magicpin)';

          return {
            id: item.id,
            channel: validCh,
            orderNo: item.order_no || `ORD-${item.id.slice(-4)}`,
            source: src,
            itemsSummary: itemsStr,
            amount: parseFloat(item.grand_total) || 0,
            status,
            timeAgo,
          };
        }) : [];

        // Merge with local settled orders from localStorage
        let localSettled: LiveOrderCard[] = [];
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('bizbox_settled_orders');
            if (raw) {
              const parsed = JSON.parse(raw);
              localSettled = parsed.map((o: any) => ({
                id: o.id || `loc-${o.orderNo}`,
                channel: (o.channel || 'pos') as LiveOrderCard['channel'],
                orderNo: o.orderNo,
                source: o.tableOrToken ? `Dine-In (${o.tableOrToken})` : 'Counter Sale',
                itemsSummary: o.itemsSummary || 'Counter Items',
                amount: parseFloat(o.grandTotal) || 0,
                status: 'ready' as const,
                timeAgo: o.time || 'Just now',
              }));
            }
          } catch (err) {
            console.warn('Error parsing local settled orders:', err);
          }
        }

        // Deduplicate by orderNo
        const map = new Map<string, LiveOrderCard>();
        apiCards.forEach((c) => map.set(c.orderNo, c));
        localSettled.forEach((c) => {
          if (!map.has(c.orderNo)) map.set(c.orderNo, c);
        });

        setOrders(Array.from(map.values()));
      } else {
        setIsLiveConnected(false);
      }
    } catch (err) {
      setIsLiveConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveOrders();
    const interval = setInterval(fetchLiveOrders, 6000);

    const handleKOT = () => fetchLiveOrders();
    const handleSettled = () => fetchLiveOrders();

    window.addEventListener('bizbox_kot_fired', handleKOT);
    window.addEventListener('bizbox_order_settled', handleSettled);

    return () => {
      clearInterval(interval);
      window.removeEventListener('bizbox_kot_fired', handleKOT);
      window.removeEventListener('bizbox_order_settled', handleSettled);
    };
  }, [fetchLiveOrders]);

  const handleAccept = (id: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: 'preparing' } : o))
    );
  };

  const handleMarkReady = (id: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: 'ready' } : o))
    );
  };

  const filtered = orders.filter((o) => {
    if (activeTab === 'online') return o.channel !== 'pos';
    if (activeTab === 'dine_in') return o.channel === 'pos';
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9] p-5 select-none overflow-hidden">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 mb-4 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          {(['all', 'online', 'dine_in'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition duration-150 pos-touch-btn min-h-[40px] capitalize ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-[#3B4FE0] to-[#4F46E5] text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70'
              }`}
            >
              {tab === 'all' ? 'All Live Orders' : tab === 'online' ? 'Swiggy / Zomato / ONDC' : 'Dine-In'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLiveConnected ? 'bg-[#12B39A]' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isLiveConnected ? 'bg-[#12B39A]' : 'bg-amber-500'}`}></span>
            </span>
            <span>{isLiveConnected ? 'API Live (Connected)' : 'Offline Outbox'}</span>
          </div>

          <button
            onClick={fetchLiveOrders}
            className={`p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-slate-600 transition ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col justify-between shadow-xs min-h-[170px]"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-16 h-6 rounded-lg" />
                      <Skeleton className="w-20 h-5 rounded-md" />
                    </div>
                    <Skeleton className="w-14 h-4 rounded-md" />
                  </div>

                  <div className="py-3.5 space-y-2">
                    <Skeleton className="w-28 h-3 rounded-md" />
                    <Skeleton className="w-48 h-4 rounded-md" />
                  </div>
                </div>

                <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <Skeleton className="w-20 h-6 rounded-md" />
                  <Skeleton className="w-24 h-8 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-8 bg-white rounded-2xl border border-slate-200/80">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Utensils className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No active orders found</h3>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              There are no orders in this tab right now. Incoming orders from POS, Swiggy, or Zomato will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col justify-between shadow-xs hover:shadow-lg transition duration-150 group"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                          order.channel === 'swiggy'
                            ? 'bg-amber-500/10 text-amber-800 border-amber-300/40'
                            : order.channel === 'zomato'
                            ? 'bg-rose-500/10 text-rose-800 border-rose-300/40'
                            : order.channel === 'ondc'
                            ? 'bg-blue-500/10 text-blue-800 border-blue-300/40'
                            : 'bg-emerald-500/10 text-emerald-800 border-emerald-300/40'
                        }`}
                      >
                        {order.channel}
                      </span>
                      <span className="font-extrabold text-sm text-slate-900 font-mono tracking-tight">
                        {order.orderNo}
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {order.timeAgo}
                    </span>
                  </div>

                  <div className="py-3.5">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                      {order.source}
                    </div>
                    <div className="text-sm font-bold text-slate-800 leading-snug">
                      {order.itemsSummary}
                    </div>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Total Amount</span>
                    <span className="text-lg font-black text-slate-900 font-mono">
                      ₹{order.amount.toFixed(2)}
                    </span>
                  </div>

                  {order.status === 'pending_accept' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(order.id)}
                        className="px-3.5 py-2 bg-gradient-to-r from-[#12B39A] to-[#0E937E] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-teal-500/20 pos-touch-btn"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        Accept
                      </button>
                      <button className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold rounded-xl border border-slate-200 transition">
                        Reject
                      </button>
                    </div>
                  ) : order.status === 'preparing' ? (
                    <button
                      onClick={() => handleMarkReady(order.id)}
                      className="px-4 py-2 bg-gradient-to-r from-[#3B4FE0] to-[#4F46E5] text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 pos-touch-btn"
                    >
                      Mark Ready
                    </button>
                  ) : (
                    <span className="text-xs font-extrabold text-[#12B39A] bg-teal-50 border border-teal-200/80 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#12B39A]"></span>
                      Ready for Pickup
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
