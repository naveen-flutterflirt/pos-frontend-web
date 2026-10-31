'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PinPad } from '@bizbox/ui';
import { ShieldCheck, User } from 'lucide-react';
import { getApiBaseUrl } from '../../lib/config';

interface StaffOption {
  id: string;
  name: string;
  role: string;
}

export default function PinLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [staffList, setStaffList] = useState<StaffOption[]>([
    { id: '6d95b754-9232-4ec6-84aa-3f3435f22037', name: 'suman', role: 'Owner' },
    { id: '44444444-0000-0000-0000-000000000001', name: 'Riya (Cashier)', role: 'Cashier' },
    { id: '65eaf870-7f32-4219-b01b-f2a9405c9c30', name: 'Karan Mehra', role: 'Manager' },
  ]);
  const [selectedUser, setSelectedUser] = useState<StaffOption>(staffList[0]);
  const [terminalOutlet, setTerminalOutlet] = useState('Indiranagar');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bizbox_pos_outlet');
      if (saved) {
        if (saved.toLowerCase().includes('koramangala') || saved === 'BLR02') setTerminalOutlet('Koramangala');
        else if (saved.toLowerCase().includes('connaught') || saved === 'DEL01') setTerminalOutlet('Connaught Place');
        else if (saved.toLowerCase().includes('bandra') || saved === 'MUM01') setTerminalOutlet('Bandra West');
        else setTerminalOutlet('Indiranagar');
      }
    }
  }, []);

  useEffect(() => {
    fetch(`${getApiBaseUrl()}/auth/staff`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.data && data.data.length > 0) {
          const list: StaffOption[] = data.data.map((u: any) => ({
            id: u.id,
            name: u.name,
            role: u.role_name || 'Staff',
          }));
          setStaffList(list);
          setSelectedUser(list[0]);
        }
      })
      .catch((e) => console.warn('Using default staff list', e));
  }, []);

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setErrorMsg('');
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setErrorMsg('Please enter at least 4 digits');
      return;
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/pin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser?.id, pin }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        setErrorMsg(errJson?.message || 'Incorrect PIN. Access Denied.');
        setPin('');
        return;
      }

      if (typeof window !== 'undefined') {
        const staffDisplay = selectedUser
          ? `${selectedUser.name} (${selectedUser.role || 'Staff'})`
          : 'Staff';
        localStorage.setItem('pos_active_staff', staffDisplay);
      }
      router.push('/billing');
    } catch {
      setErrorMsg('Incorrect PIN or server unreachable.');
      setPin('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#071533] p-4 text-white select-none">
      <div className="w-full max-w-sm bg-[#0B1F4B] border border-slate-700/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center">
        {/* Brand Icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#E91E7B] flex items-center justify-center text-white mb-3 shadow-lg">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-extrabold tracking-tight">Staff PIN Login</h2>
        <p className="text-xs text-slate-400 mt-1">Terminal: {terminalOutlet} Counter 1</p>

        {/* Staff Switcher */}
        <div className="flex items-center gap-1.5 my-4 bg-slate-900/60 p-1.5 rounded-xl border border-slate-700 w-full justify-center overflow-x-auto">
          {staffList.map((user) => (
            <button
              key={user.id}
              onClick={() => {
                setSelectedUser(user);
                setPin('');
                setErrorMsg('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedUser?.id === user.id
                  ? 'bg-[#3B4FE0] text-white shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {user.name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* PIN Dots */}
        <div className="flex items-center justify-center gap-3 my-3">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                pin.length > idx
                  ? 'bg-[#E91E7B] border-[#E91E7B] scale-110'
                  : 'border-slate-500 bg-transparent'
              }`}
            ></div>
          ))}
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-300 font-bold mb-2 py-1 px-3 bg-rose-950/80 border border-rose-800 rounded-lg text-center animate-pulse">
            {errorMsg}
          </p>
        )}

        {/* 1-9 PIN Keypad */}
        <div className="w-full mt-2">
          <PinPad
            onDigit={handleDigit}
            onDelete={handleDelete}
            onClear={handleClear}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}

