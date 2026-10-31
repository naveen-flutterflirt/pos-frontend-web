'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Utensils, ShoppingBag, Plus, Check } from 'lucide-react';

export default function CustomerQrOrderPage() {
  const params = useParams();
  const outletCode = params?.outletCode || 'BLR01';
  const tableToken = params?.tableToken || 'T7';

  const [cart, setCart] = useState<{ name: string; price: number; qty: number }[]>([]);

  const menu = [
    { id: '1', name: 'Cappuccino', price: 180, desc: 'Espresso with silky steamed milk & thick foam' },
    { id: '2', name: 'Latte', price: 190, desc: 'Smooth espresso with lightly frothed milk' },
    { id: '3', name: 'Chicken Club Sandwich', price: 260, desc: 'Triple-decker toasted bread with grilled chicken' },
    { id: '4', name: 'Brownie with Ice Cream', price: 190, desc: 'Warm fudge brownie served with vanilla ice cream' },
  ];

  const addToCart = (item: (typeof menu)[0]) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.name === item.name);
      if (existing) {
        return prev.map((i) => (i.name === item.name ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { name: item.name, price: item.price, qty: 1 }];
    });
  };

  const total = cart.reduce((acc, i) => acc + i.price * i.qty, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto w-full border-x border-slate-200">
      {/* Table Greeting Header */}
      <header className="p-4 bg-[#0B1F4B] text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-black text-lg">Brew Street Indiranagar</h1>
            <p className="text-xs text-slate-300">Ordering for Table {String(tableToken).toUpperCase()}</p>
          </div>
          <span className="w-8 h-8 rounded-full bg-[#E91E7B] flex items-center justify-center font-bold text-xs">
            {tableToken}
          </span>
        </div>
      </header>

      {/* Menu List */}
      <main className="flex-1 p-4 space-y-3 overflow-y-auto">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Popular Items</h2>
        {menu.map((item) => (
          <div key={item.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="pr-3">
              <h3 className="font-bold text-slate-900 text-sm">{item.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.desc}</p>
              <span className="text-sm font-extrabold text-[#0B1F4B] mt-1 inline-block">₹{item.price}</span>
            </div>

            <button
              onClick={() => addToCart(item)}
              className="px-3.5 py-1.5 bg-[#E91E7B] hover:bg-[#D0156B] text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
        ))}
      </main>

      {/* Bottom Sticky Floating Cart */}
      {cart.length > 0 && (
        <div className="p-4 bg-white border-t border-slate-200 shadow-lg">
          <div className="flex items-center justify-between mb-2 text-xs font-bold text-slate-700">
            <span>{cart.reduce((a, b) => a + b.qty, 0)} items in tray</span>
            <span className="text-sm font-black text-[#0B1F4B]">₹{total}</span>
          </div>
          <button
            onClick={() => alert(`Order sent directly to Kitchen for Table ${tableToken}!`)}
            className="w-full py-3 bg-[#12B39A] hover:bg-[#0E937E] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-md"
          >
            <Check className="w-4 h-4" />
            Place Order to Kitchen
          </button>
        </div>
      )}
    </div>
  );
}

