'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Plus, Minus, UtensilsCrossed, Trash2, ShoppingBag } from 'lucide-react';
import { mockTables, mockItems } from '../../data/mockData';
import { getApiBaseUrl } from '../../lib/config';

export default function CaptainTabletPage() {
  const [selectedTable, setSelectedTable] = useState('T7');
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  const [fired, setFired] = useState(false);

  const addItem = (item: (typeof mockItems)[0]) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.name === item.name);
      if (exists) {
        return prev.map((i) => (i.name === item.name ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { id: item.id, name: item.name, price: item.variants[0].price, qty: 1 }];
    });
  };

  const updateQty = (name: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.name === name ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const handleFireKOT = async () => {
    if (cart.length === 0) return;
    setFired(true);
    try {
      await fetch(`${getApiBaseUrl()}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'dine_in',
          channel: 'captain',
          tableId: '12121212-0000-0000-0000-000000000007',
          covers: 2,
          items: cart.map((it) => ({
            variantId: 'aaaaaaaa-0000-0000-0000-000000000001',
            name: it.name,
            qty: it.qty,
            unitPrice: it.price,
          })),
        }),
      });
    } catch { }

    setTimeout(() => {
      setFired(false);
      setCart([]);
    }, 1500);
  };

  const total = cart.reduce((acc, i) => acc + i.price * i.qty, 0);

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden select-none">
      {/* Header */}
      <header className="h-14 bg-[#0B1F4B] text-white px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/billing" className="p-1.5 bg-slate-800 rounded-lg text-slate-300">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-bold text-sm">Captain Tablet · Waiter View</span>
        </div>

        {/* Table Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-md">
          {['T1', 'T2', 'T3', 'T4', 'T5', 'T7', 'B1', 'B2'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTable(t)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                selectedTable === t
                  ? 'bg-[#E91E7B] text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* Main Split Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Quick Item Buttons */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {mockItems.map((item) => (
              <button
                key={item.id}
                onClick={() => addItem(item)}
                className="bg-white p-4 rounded-xl border border-slate-200 text-left hover:border-[#3B4FE0] active:scale-95 shadow-xs transition min-h-[90px] flex flex-col justify-between"
              >
                <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                <span className="font-extrabold text-[#0B1F4B]">₹{item.variants[0].price}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Waiter Order Tray */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col justify-between p-4 shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-black text-slate-900">Table {selectedTable}</span>
              <span className="text-xs text-slate-500 font-bold">{cart.length} items</span>
            </div>

            <div className="py-3 space-y-2 max-h-[60vh] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">No items added yet</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Tap menu items to add to table</p>
                </div>
              ) : (
                cart.map((i) => (
                  <div key={i.name} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex-1 pr-2">
                      <span className="font-bold text-slate-800 text-xs block">{i.name}</span>
                      <span className="text-[11px] text-slate-500">₹{i.price * i.qty}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(i.name, -1)} className="p-1 rounded bg-white border text-slate-600">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{i.qty}</span>
                      <button onClick={() => updateQty(i.name, 1)} className="p-1 rounded bg-white border text-slate-600">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="flex justify-between font-black text-base text-slate-900">
              <span>Total</span>
              <span className="text-[#E91E7B]">₹{total}</span>
            </div>

            <button
              onClick={handleFireKOT}
              disabled={cart.length === 0}
              className={`w-full min-h-[50px] rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition ${
                fired
                  ? 'bg-[#12B39A] text-white'
                  : 'bg-[#E91E7B] hover:bg-[#D0156B] text-white disabled:opacity-50'
              }`}
            >
              {fired ? (
                <>
                  <Check className="w-5 h-5" />
                  KOT Sent to Kitchen!
                </>
              ) : (
                <>
                  <UtensilsCrossed className="w-5 h-5" />
                  Fire KOT to Kitchen
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
