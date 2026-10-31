'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { outletsApi } from '../lib/api';

export interface OutletItem {
  id: string;
  code: string;
  name: string;
  area: string;
  city: string;
  stateCode?: string;
  status: 'Online' | 'Offline';
}

const DEFAULT_OUTLETS: OutletItem[] = [
  { id: '22222222-2222-2222-2222-222222222222', code: 'BLR01', name: 'Indiranagar (BLR01)', area: 'Bengaluru, KA', city: 'Bengaluru', status: 'Online' },
  { id: '33333333-3333-3333-3333-333333333333', code: 'BLR02', name: 'Koramangala (BLR02)', area: 'Bengaluru, KA', city: 'Bengaluru', status: 'Online' },
  { id: '44444444-4444-4444-4444-444444444444', code: 'DEL01', name: 'Connaught Place (DEL01)', area: 'New Delhi, DL', city: 'New Delhi', status: 'Online' },
  { id: '55555555-5555-5555-5555-555555555555', code: 'MUM01', name: 'Bandra West (MUM01)', area: 'Mumbai, MH', city: 'Mumbai', status: 'Online' },
];

interface OutletContextType {
  outlets: OutletItem[];
  selectedOutlet: OutletItem;
  setSelectedOutlet: (outlet: OutletItem) => void;
  selectOutletByCode: (code: string) => void;
}

const OutletContext = createContext<OutletContextType | undefined>(undefined);

export function OutletProvider({ children }: { children: React.ReactNode }) {
  const [outlets, setOutlets] = useState<OutletItem[]>(DEFAULT_OUTLETS);
  const [selectedOutlet, setSelectedOutletState] = useState<OutletItem>(DEFAULT_OUTLETS[0]);

  useEffect(() => {
    // Fetch live outlets using enterprise API client
    outletsApi.list()
      .then((data) => {
        if (data && data.length > 0) {
          const mapped: OutletItem[] = data.map((o) => {
            const cleanName = o.name.replace(/Brew Street\s*[-–]\s*/i, '').trim();
            const locationArea = o.code === 'MUM01' ? 'Mumbai, MH' : o.code === 'DEL01' ? 'New Delhi, DL' : 'Bengaluru, KA';
            return {
              id: o.id,
              code: o.code || 'BLR01',
              name: `${cleanName} (${o.code})`,
              area: o.city ? `${o.city}, IN` : locationArea,
              city: o.city || 'Bengaluru',
              status: 'Online',
            };
          });
          setOutlets(mapped);

          // Restore previously stored selection or match first
          const savedCode = typeof window !== 'undefined' ? localStorage.getItem('bizbox_active_outlet_code') : null;
          if (savedCode) {
            const found = mapped.find((m) => m.code.toUpperCase() === savedCode.toUpperCase());
            if (found) setSelectedOutletState(found);
          }
        }
      })
      .catch((e) => console.warn('Using default outlets:', e));
  }, []);

  const setSelectedOutlet = (outlet: OutletItem) => {
    setSelectedOutletState(outlet);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizbox_active_outlet_code', outlet.code);
      localStorage.setItem('bizbox_active_outlet_name', outlet.name);
      localStorage.setItem('bizbox_pos_outlet', outlet.code);
      window.dispatchEvent(new CustomEvent('bizbox_outlet_changed', { detail: outlet }));
    }
  };

  const selectOutletByCode = (code: string) => {
    const found = outlets.find((o) => o.code.toUpperCase() === code.toUpperCase());
    if (found) {
      setSelectedOutlet(found);
    }
  };

  return (
    <OutletContext.Provider
      value={{
        outlets,
        selectedOutlet,
        setSelectedOutlet,
        selectOutletByCode,
      }}
    >
      {children}
    </OutletContext.Provider>
  );
}

export function useOutlet() {
  const context = useContext(OutletContext);
  if (!context) {
    throw new Error('useOutlet must be used within an OutletProvider');
  }
  return context;
}

