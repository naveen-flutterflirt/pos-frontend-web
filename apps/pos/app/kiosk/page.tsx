'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Plus, Minus, QrCode, Sparkles } from 'lucide-react';
import { mockItems } from '../../data/mockData';

export default function KioskPage() {
  const [tray, setTray] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  const [tokenGenerated, setTokenGenerated] = useState<number | null>(null);

  const addToTray = (item: (typeof mockItems)[0]) => {
    setTray((prev) => {
      const exists = prev.find((i) => i.name === item.name);
      if (exists) {
        return prev.map((i) => (i.name === item.name ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { id: item.id, name: item.name, price: item.variants[0].price, qty: 1 }];
    });
  };

  const updateQty = (name: string, delta: number) => {
    setTray((prev) =>
      prev
        .map((i) => (i.name === name ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const handlePay = () => {
    setTokenGenerated(Math.floor(10 + Math.random() * 89));
  };

  const total = tray.reduce((acc, i) => acc + i.price * i.qty, 0);

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden font-sans select-none">
      {/* Kiosk Header */}
      <header className="h-20 bg-[#0B1F4B] text-white px-8 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          <Link href="/billing" className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="font-black text-2xl tracking-tight">Brew Street Express</h1>
            <p className="text-xs text-slate-400">Self-Service Touch Kiosk</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#E91E7B] px-4 py-2 rounded-xl text-sm font-extrabold shadow-sm">
          <Sparkles className="w-4 h-4" />
          <span>Tap to Order</span>
        </div>
      </header>

      {/* Main Kiosk Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Menu Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider mb-4">
            Select Your Favorites
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {mockItems.map((item) => (
              <button
                key={item.id}
                onClick={() => addToTray(item)}
                className="bg-white p-5 rounded-2xl border-2 border-slate-200 hover:border-[#E91E7B] active:scale-[0.98] shadow-xs hover:shadow-md transition text-left flex flex-col justify-between min-h-[140px]"
              >
                <div>
                  <span className="text-[11px] font-bold text-[#12B39A] uppercase tracking-wider">
                    {item.foodType}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-lg leading-tight mt-1">
                    {item.name}
                  </h3>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xl font-black text-[#0B1F4B]">
                    ₹{item.variants[0].price}
                  </span>
                  <span className="w-9 h-9 rounded-xl bg-[#EBF0FF] text-[#3B4FE0] flex items-center justify-center font-bold">
                    <Plus className="w-5 h-5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Sticky Order Tray */}
        <aside className="w-96 bg-white border-l border-slate-200 flex flex-col justify-between p-6 shadow-xl">
          <div>
            <h3 className="font-black text-xl text-slate-900 pb-4 border-b border-slate-200">
              Your Tray ({tray.reduce((a, b) => a + b.qty, 0)})
            </h3>

            <div className="py-4 space-y-3 max-h-[50vh] overflow-y-auto">
              {tray.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">Your tray is empty.</p>
              ) : (
                tray.map((i) => (
                  <div key={i.name} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex-1 pr-2">
                      <span className="font-extrabold text-slate-800 text-sm block">{i.name}</span>
                      <span className="text-xs text-slate-500 font-bold">₹{i.price * i.qty}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(i.name, -1)} className="w-8 h-8 rounded-lg bg-white border text-slate-700 flex items-center justify-center">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-black text-sm w-4 text-center">{i.qty}</span>
                      <button onClick={() => updateQty(i.name, 1)} className="w-8 h-8 rounded-lg bg-white border text-slate-700 flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex justify-between text-xl font-black text-slate-900">
              <span>Total to Pay</span>
              <span className="text-[#E91E7B]">₹{total}</span>
            </div>

            <button
              onClick={handlePay}
              disabled={tray.length === 0}
              className="w-full min-h-[56px] bg-[#E91E7B] hover:bg-[#D0156B] disabled:opacity-50 text-white font-black text-lg rounded-2xl flex items-center justify-center gap-2 shadow-lg"
            >
              <QrCode className="w-6 h-6" />
              Pay with UPI & Print Token
            </button>
          </div>
        </aside>
      </main>

      {/* Token Modal */}
      {tokenGenerated && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Payment Successful!</h3>
            <p className="text-xs text-slate-500">Please collect your receipt and wait for your token on screen:</p>
            <div className="py-6 bg-[#0B1F4B] text-[#12B39A] font-mono text-6xl font-black rounded-2xl shadow-inner">
              Token #{tokenGenerated}
            </div>
            <button
              onClick={() => {
                setTokenGenerated(null);
                setTray([]);
              }}
              className="w-full py-3 bg-[#E91E7B] text-white font-extrabold rounded-xl"
            >
              Order More
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

