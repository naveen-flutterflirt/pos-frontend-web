'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../../../store/useCartStore';
import { DiningTable, TableStatus } from '@bizbox/pos-core';
import { Users, Clock, Receipt, CheckCircle2, Calendar } from 'lucide-react';
import { getApiBaseUrl } from '../../../lib/config';
import { Skeleton } from '../../../components/ui/Skeleton';

export default function TablesPage() {
  const router = useRouter();
  const { setTable } = useCartStore();
  const [selectedArea, setSelectedArea] = useState<'All' | 'Ground' | 'Terrace' | 'AC Hall'>('Ground');
  const [tablesList, setTablesList] = useState<DiningTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic fetch from live backend
  useEffect(() => {
    setIsLoading(true);
    fetch(`${getApiBaseUrl()}/floor/22222222-2222-2222-2222-222222222222/tables`)
      .then((res) => res.json())
      .then((json) => {
        if (json && Array.isArray(json.data)) {
          const mapped: DiningTable[] = json.data.map((t: any) => ({
            id: t.id,
            areaName: t.label?.startsWith('B') ? 'Terrace' : 'Ground',
            label: t.label,
            seats: t.seats || 4,
            status: (t.status || 'free') as TableStatus,
            currentBillAmount: t.status === 'occupied' ? 640 : undefined,
            occupiedSince: t.status === 'occupied' ? '32m' : undefined,
          }));
          setTablesList(mapped);
        }
      })
      .catch((e) => console.warn('Backend not reached in tables:', e))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredTables = tablesList.filter((t) => {
    if (selectedArea === 'All') return true;
    return t.areaName === selectedArea;
  });

  const handleTableClick = (table: DiningTable) => {
    setTable({ id: table.id, label: table.label, guests: table.seats });
    router.push('/billing');
  };

  const getStatusStyles = (status: TableStatus) => {
    switch (status) {
      case 'occupied':
        return 'border-[#E91E7B]/40 bg-gradient-to-br from-pink-50/60 to-white text-[#0B1528] shadow-sm hover:border-[#E91E7B] hover:shadow-pink-500/10';
      case 'bill_printed':
        return 'border-amber-400/60 bg-gradient-to-br from-amber-50/60 to-white text-[#0B1528] shadow-sm hover:border-amber-500 hover:shadow-amber-500/10';
      case 'reserved':
        return 'border-[#12B39A]/40 bg-gradient-to-br from-teal-50/60 to-white text-[#0B1528] shadow-sm hover:border-[#12B39A] hover:shadow-teal-500/10';
      case 'free':
      default:
        return 'border-slate-200/90 bg-white text-slate-800 hover:border-indigo-400 hover:shadow-indigo-500/10';
    }
  };

  const stats = {
    total: tablesList.length,
    occupied: tablesList.filter((t) => t.status === 'occupied').length,
    billPrinted: tablesList.filter((t) => t.status === 'bill_printed').length,
    free: tablesList.filter((t) => t.status === 'free').length,
  };

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9] p-5 overflow-hidden select-none">
      {/* Top Bar: Section / Area Tabs & Status Legend */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mr-1">
            Section:
          </span>
          {(['Ground', 'Terrace', 'AC Hall'] as const).map((area) => (
            <button
              key={area}
              onClick={() => setSelectedArea(area)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-150 pos-touch-btn min-h-[40px] ${
                selectedArea === area
                  ? 'bg-gradient-to-r from-[#3B4FE0] to-[#4F46E5] text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70'
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-bold text-slate-600 flex-wrap">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Skeleton className="w-20 h-6 rounded-lg" />
              <Skeleton className="w-24 h-6 rounded-lg" />
              <Skeleton className="w-24 h-6 rounded-lg" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/70">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Free ({stats.free})</span>
              </div>
              <div className="flex items-center gap-1.5 bg-pink-50/60 px-2.5 py-1 rounded-lg border border-pink-200/70 text-[#E91E7B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E91E7B] inline-block animate-pulse"></span>
                <span>Occupied ({stats.occupied})</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50/60 px-2.5 py-1 rounded-lg border border-amber-200/70 text-amber-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                <span>Bill Printed ({stats.billPrinted})</span>
              </div>
              <div className="flex items-center gap-1.5 bg-teal-50/60 px-2.5 py-1 rounded-lg border border-teal-200/70 text-[#12B39A]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#12B39A] inline-block"></span>
                <span>Reserved</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grid of Tables */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div
                key={idx}
                className="border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between h-40 bg-white"
              >
                <div className="flex items-center justify-between w-full">
                  <Skeleton className="w-12 h-8 rounded-lg" />
                  <Skeleton className="w-8 h-5 rounded-full" />
                </div>
                <div className="mt-auto pt-3 border-t border-slate-100 w-full space-y-1.5">
                  <Skeleton className="w-16 h-4 rounded-md" />
                  <Skeleton className="w-20 h-3 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-8 bg-white rounded-2xl border border-slate-200/80">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No tables found</h3>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              No dining tables configured for the {selectedArea} section.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredTables.map((table) => {
              const isOccupied = table.status === 'occupied';
              const isBillPrinted = table.status === 'bill_printed';
              const isReserved = table.status === 'reserved';

              return (
                <button
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  className={`border rounded-2xl p-4 flex flex-col justify-between h-40 text-left transition duration-150 pos-touch-btn shadow-xs hover:shadow-lg group relative overflow-hidden ${getStatusStyles(
                    table.status
                  )}`}
                >
                  {/* Table Label & Capacity */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black tracking-tight text-slate-900 group-hover:text-[#3B4FE0] transition-colors">
                        {table.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-full border border-slate-200/60">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>{table.seats}</span>
                    </div>
                  </div>

                  {/* Table Status Details */}
                  <div className="mt-auto pt-3 border-t border-slate-100 w-full">
                    {isOccupied && (
                      <div className="space-y-1">
                        <div className="text-base font-extrabold text-[#E91E7B] font-mono">
                          ₹{table.currentBillAmount}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{table.occupiedSince} ago</span>
                        </div>
                      </div>
                    )}

                    {isBillPrinted && (
                      <div className="space-y-1">
                        <div className="text-base font-extrabold text-amber-600 font-mono">
                          ₹{table.currentBillAmount}
                        </div>
                        <div className="text-[11px] flex items-center gap-1 font-bold text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded">
                          <Receipt className="w-3 h-3" />
                          <span>Bill Printed</span>
                        </div>
                      </div>
                    )}

                    {isReserved && (
                      <div className="text-xs flex items-center gap-1.5 font-bold text-[#12B39A]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{table.reservedTime}</span>
                      </div>
                    )}

                    {table.status === 'free' && (
                      <div className="text-xs flex items-center gap-1.5 text-emerald-600 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready / Free</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
