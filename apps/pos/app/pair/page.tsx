'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tablet, ArrowRight, ShieldCheck } from 'lucide-react';

export default function PairDevicePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handlePair = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.replace(/\D/g, '').length >= 6) {
      router.push('/pin');
    } else {
      setError('Please enter a valid 6-digit outlet code');
    }
  };

  return (
    <div className="min-h-screen bg-[#071533] flex flex-col items-center justify-center p-4 text-white select-none">
      <div className="w-full max-w-sm bg-[#0B1F4B] border border-slate-700 rounded-3xl p-6 shadow-2xl text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#3B4FE0] flex items-center justify-center text-white mx-auto shadow-lg">
          <Tablet className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-black">Register This Device</h2>
          <p className="text-xs text-slate-400 mt-1">
            Enter the 6-digit device pairing code from your BizBox Admin Console:
          </p>
        </div>

        <form onSubmit={handlePair} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError('');
            }}
            placeholder="e.g. 749-102"
            maxLength={7}
            className="w-full text-center tracking-widest text-2xl font-black font-mono py-3 bg-slate-900 border-2 border-slate-700 rounded-xl text-white focus:outline-none focus:border-[#E91E7B]"
          />

          {error && <p className="text-xs text-rose-400 font-bold">{error}</p>}

          <button
            type="submit"
            className="w-full min-h-[48px] bg-[#E91E7B] hover:bg-[#D0156B] text-white font-extrabold rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            <span>Pair & Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

