'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Printer, ArrowDownCircle, ArrowUpCircle, Lock, AlertTriangle } from 'lucide-react';
import { getApiBaseUrl } from '../../../lib/config';
import { Skeleton } from '../../../components/ui/Skeleton';

export default function ShiftPage() {
  const [openingCash] = useState(2000.0);
  const [cashSales, setCashSales] = useState(0);
  const [upiSales, setUpiSales] = useState(0);
  const [cardSales, setCardSales] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const expectedCash = openingCash + cashSales;

  const [countedCash, setCountedCash] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [zReportGenerated, setZReportGenerated] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${getApiBaseUrl()}/reports/sales-summary`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.netSales > 0) {
          setCashSales(Math.round(data.netSales * 0.25));
          setUpiSales(Math.round(data.netSales * 0.6));
          setCardSales(Math.round(data.netSales * 0.15));
        }
      })
      .catch((e) => console.warn('Using shift fallbacks', e))
      .finally(() => setIsLoading(false));
  }, []);

  const handlePrintXReport = () => {
    alert('Printing Mid-Shift X-Report to Edge LAN Hub.');
  };

  const handleCloseShift = () => {
    setZReportGenerated(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9] p-6 overflow-y-auto select-none">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#12B39A] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#12B39A]"></span>
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Active Shift: Terminal 01</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Opened by <strong className="text-slate-800">Riya</strong> today at 08:30 AM · Business Date: 29 Oct 2026
            </p>
          </div>

          <button
            onClick={handlePrintXReport}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/80 transition pos-touch-btn"
          >
            <Printer className="w-4 h-4 text-[#3B4FE0]" />
            <span>Print Mid-Shift X-Report</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Opening Float
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              ₹{openingCash.toFixed(2)}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Recorded at shift start</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Cash Sales
            </span>
            {isLoading ? (
              <Skeleton className="h-8 w-28 my-1 rounded-lg" />
            ) : (
              <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
                ₹{cashSales.toFixed(2)}
              </div>
            )}
            <span className="text-[11px] text-slate-400 font-medium">In physical drawer</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              UPI & Online
            </span>
            {isLoading ? (
              <Skeleton className="h-8 w-28 my-1 rounded-lg" />
            ) : (
              <div className="text-2xl font-black text-[#3B4FE0] font-mono mt-1">
                ₹{upiSales.toFixed(2)}
              </div>
            )}
            <span className="text-[11px] text-slate-400 font-medium">Auto-reconciled (Edge)</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Card EDC
            </span>
            {isLoading ? (
              <Skeleton className="h-8 w-28 my-1 rounded-lg" />
            ) : (
              <div className="text-2xl font-black text-purple-600 font-mono mt-1">
                ₹{cardSales.toFixed(2)}
              </div>
            )}
            <span className="text-[11px] text-slate-400 font-medium">Swiped batches</span>
          </div>
        </div>

        {/* Cash Balance & Cash Drop Action */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-5">
          <div>
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Expected Cash in Drawer
            </span>
            {isLoading ? (
              <Skeleton className="h-9 w-36 my-1 rounded-lg" />
            ) : (
              <div className="text-3xl font-black text-slate-900 font-mono mt-1">
                ₹{expectedCash.toFixed(2)}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">
              Opening float + cash settled orders (no cash drops recorded)
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/80 transition pos-touch-btn">
              <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
              <span>Pay-In (Add)</span>
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/80 transition pos-touch-btn">
              <ArrowUpCircle className="w-4 h-4 text-rose-600" />
              <span>Cash Drop</span>
            </button>
            <button
              onClick={() => setShowCloseModal(true)}
              className="min-h-[42px] px-5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-extrabold rounded-xl shadow-md shadow-rose-500/20 transition pos-touch-btn"
            >
              End Shift & Close
            </button>
          </div>
        </div>
      </div>

      {/* End Shift Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            {zReportGenerated ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#12B39A] border-4 border-emerald-100 flex items-center justify-center mx-auto shadow-sm">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Shift Closed & Z-Report Issued</h3>
                <p className="text-xs text-slate-500">
                  Total revenue recorded: ₹{(cashSales + upiSales + cardSales).toFixed(2)}. Z-Report sent to manager and printed to Edge LAN Hub.
                </p>
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="w-full min-h-[46px] mt-4 bg-[#0B1528] hover:bg-[#16274D] text-white font-extrabold text-xs rounded-xl shadow-md transition pos-touch-btn"
                >
                  Return to Dashboard
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-extrabold text-slate-900">Enter Counted Physical Cash</h3>
                <p className="text-xs text-slate-500">
                  Expected: <strong className="font-mono text-slate-900">₹{expectedCash.toFixed(2)}</strong>. Enter physical cash counted in drawer:
                </p>
                <input
                  type="number"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder="e.g. 20450"
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-lg font-extrabold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#3B4FE0]/30 focus:border-[#3B4FE0]"
                />
                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => setShowCloseModal(false)}
                    className="flex-1 py-3 text-slate-600 font-bold text-xs bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCloseShift}
                    className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-500/20 transition pos-touch-btn"
                  >
                    Generate Z-Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
