'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCartStore, OUTLETS, OutletInfo } from '../../store/useCartStore';
import { getApiBaseUrl, getWebBaseUrl } from '../../lib/config';
import { OrderType } from '@bizbox/pos-core';
import {
  Store,
  Layers,
  ShoppingBag,
  Clock,
  ChefHat,
  Lock,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronDown,
  Monitor,
  Check,
  User,
  ShieldCheck,
  ExternalLink,
  LogOut,
  Sparkles,
  X,
} from 'lucide-react';

interface StaffOption {
  id: string;
  name: string;
  role: string;
  email?: string;
}

const DEFAULT_REAL_STAFF: StaffOption[] = [
  { id: '6d95b754-9232-4ec6-84aa-3f3435f22037', name: 'suman', role: 'Owner & Admin', email: 'sumanqaj9876@gmail.com' },
  { id: '44444444-0000-0000-0000-000000000001', name: 'Riya (Cashier)', role: 'Cashier' },
  { id: '65eaf870-7f32-4219-b01b-f2a9405c9c30', name: 'Karan Mehra', role: 'Manager' },
];

export default function TerminalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    serviceType,
    setServiceType,
    orderChannel,
    setOrderChannel,
    syncStatus,
    pendingSyncCount,
    initSyncListener,
    activeOutlet,
    setOutlet,
  } = useCartStore();
  const [isOnline, setIsOnline] = useState(true);
  const [activeStaff, setActiveStaff] = useState<string>('suman');
  const [showOutletDropdown, setShowOutletDropdown] = useState(false);
  const [staffDropdownAnchor, setStaffDropdownAnchor] = useState<'left' | 'right' | null>(null);
  const [staffList, setStaffList] = useState<StaffOption[]>(DEFAULT_REAL_STAFF);

  // PIN Pad Modal State for Staff Switch
  const [pendingStaffForPin, setPendingStaffForPin] = useState<StaffOption | null>(null);
  const [switchPinInput, setSwitchPinInput] = useState<string>('');
  const [switchPinError, setSwitchPinError] = useState<string>('');
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const outletParam = urlParams.get('outlet');
      if (outletParam) {
        setOutlet(outletParam);
      }
    }
  }, [setOutlet]);

  // Load real staff from Backend API
  useEffect(() => {
    fetch(`${getApiBaseUrl()}/auth/staff`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.data) && data.data.length > 0) {
          const mapped: StaffOption[] = data.data.map((u: any) => ({
            id: u.id,
            name: u.name,
            role: u.role_name === 'owner' ? 'Owner & Admin' : u.role_name === 'cashier' ? 'Cashier' : 'Staff',
            email: u.email,
          }));
          setStaffList(mapped);
        }
      })
      .catch((e) => console.warn('Offline staff fetch fallback', e));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pos_active_staff');
      if (stored) {
        setActiveStaff(stored);
      } else {
        localStorage.setItem('pos_active_staff', 'suman');
        setActiveStaff('suman');
      }
    }
  }, [router]);

  const handleLock = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pos_active_staff');
    }
    router.push('/pin');
  };

  const applyStaffSwitch = useCallback((staff: StaffOption) => {
    const displayName = staff.name;
    setActiveStaff(displayName);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_active_staff', displayName);
      window.dispatchEvent(new CustomEvent('pos_staff_changed', { detail: staff }));
    }
    setPendingStaffForPin(null);
    setSwitchPinInput('');
    setSwitchPinError('');
    setIsVerifyingPin(false);
  }, []);

  const handleVerifyAndSwitch = useCallback(async (enteredPin: string) => {
    if (!pendingStaffForPin) return;
    if (enteredPin.length < 4) {
      setSwitchPinError('Please enter a 4-digit PIN');
      return;
    }

    setIsVerifyingPin(true);
    setSwitchPinError('');

    try {
      // 1. Backend verification attempt
      const res = await fetch(`${getApiBaseUrl()}/auth/pin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pendingStaffForPin.id, pin: enteredPin }),
      });

      if (res.ok) {
        applyStaffSwitch(pendingStaffForPin);
        return;
      }
    } catch (err) {
      console.warn('Backend PIN check failed, falling back to local verification:', err);
    }

    // 2. Offline fallback PIN check:
    // Suman: 3210, Riya: 1234, Karan: 5678
    const lowerName = pendingStaffForPin.name.toLowerCase();
    const validOfflinePin = lowerName.includes('suman') ? '3210' : lowerName.includes('karan') ? '5678' : '1234';

    if (enteredPin === validOfflinePin) {
      applyStaffSwitch(pendingStaffForPin);
    } else {
      setSwitchPinError('Incorrect PIN. Access Denied.');
      setSwitchPinInput('');
      setIsVerifyingPin(false);
    }
  }, [pendingStaffForPin, applyStaffSwitch]);

  // Physical Keyboard Listener for PIN Pad Modal
  useEffect(() => {
    if (!pendingStaffForPin) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (switchPinInput.length < 4) {
          const next = switchPinInput + e.key;
          setSwitchPinInput(next);
          setSwitchPinError('');
          if (next.length === 4) {
            handleVerifyAndSwitch(next);
          }
        }
      } else if (e.key === 'Backspace') {
        setSwitchPinInput((prev) => prev.slice(0, -1));
        setSwitchPinError('');
      } else if (e.key === 'Escape') {
        setPendingStaffForPin(null);
        setSwitchPinInput('');
        setSwitchPinError('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingStaffForPin, switchPinInput, handleVerifyAndSwitch]);

  const onStaffItemClick = (st: StaffOption) => {
    const isCurrent = activeStaff.toLowerCase().includes(st.name.toLowerCase());
    if (isCurrent) {
      setStaffDropdownAnchor(null);
      return;
    }
    // Prompt PIN before switching!
    setPendingStaffForPin(st);
    setSwitchPinInput('');
    setSwitchPinError('');
    setStaffDropdownAnchor(null);
  };

  useEffect(() => {
    initSyncListener();
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [initSyncListener]);

  const channels: Array<{
    label: string;
    channel: 'pos' | 'swiggy' | 'zomato';
    serviceType?: OrderType;
    badgeColor?: string;
  }> = [
    { label: 'Dine-in', channel: 'pos', serviceType: 'dine_in' },
    { label: 'Takeaway', channel: 'pos', serviceType: 'takeaway' },
    { label: 'Delivery', channel: 'pos', serviceType: 'delivery' },
    { label: 'Swiggy', channel: 'swiggy', badgeColor: 'bg-amber-600 text-white' },
    { label: 'Zomato', channel: 'zomato', badgeColor: 'bg-rose-600 text-white' },
  ];

  const navLinks = [
    { label: 'Billing', href: '/billing', icon: ShoppingBag },
    { label: 'Tables', href: '/tables', icon: Layers },
    { label: 'Orders', href: '/orders', icon: Store },
    { label: 'Shift', href: '/shift', icon: Clock },
    { label: 'KDS', href: '/kds/hot-kitchen', icon: ChefHat },
  ];

  const renderStaffDropdownMenu = () => {
    const activeFirstWord = activeStaff.split(' ')[0].toLowerCase();

    return (
      <div className="w-76 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
        {/* Active Staff Header Card */}
        <div className="flex items-center gap-3 p-3 bg-slate-800/90 rounded-xl border border-slate-700 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-base shadow-md">
            {activeStaff.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-white capitalize truncate">{activeStaff.split(' ')[0]}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div className="text-[11px] font-semibold text-indigo-300">
              {activeFirstWord === 'suman' ? 'Store Owner & Admin' : activeFirstWord.includes('riya') ? 'Cashier' : 'Shift Manager'}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {activeOutlet?.name || 'Indiranagar (BLR01)'}
            </div>
          </div>
        </div>

        {/* Real Staff List */}
        <div className="mb-3">
          <div className="px-1 mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Switch Cashier / Staff</span>
            <span className="text-slate-500 font-normal">PIN Protected</span>
          </div>

          <div className="space-y-1">
            {staffList.map((st) => {
              const isCurrent = activeStaff.toLowerCase().includes(st.name.toLowerCase());
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onStaffItemClick(st)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                    isCurrent
                      ? 'bg-indigo-600/30 border border-indigo-500/50 text-white font-bold'
                      : 'hover:bg-slate-800 text-slate-300 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center border border-slate-700">
                      {st.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-100 capitalize">{st.name}</div>
                      <div className="text-[10px] text-slate-400">{st.role}</div>
                    </div>
                  </div>

                  {isCurrent ? (
                    <span className="text-[10px] font-black uppercase text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-700/60 flex items-center gap-1">
                      <Check className="w-3 h-3 text-indigo-400" />
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-indigo-400 font-bold bg-indigo-950/40 border border-indigo-800/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      Switch
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Actions Footer */}
        <div className="pt-2 border-t border-slate-800 space-y-1">
          <Link
            href="/shift"
            onClick={() => setStaffDropdownAnchor(null)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Shift Register & Totals</span>
          </Link>

          <a
            href={`${getWebBaseUrl()}/dashboard`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <div className="flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5 text-emerald-400" />
              <span>Admin Web Dashboard</span>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <button
            type="button"
            onClick={handleLock}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>Lock Terminal (PIN Pad)</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-900 font-sans antialiased text-slate-100 select-none">
      {/* Click-away backdrop overlay */}
      {(staffDropdownAnchor !== null || showOutletDropdown) && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => {
            setStaffDropdownAnchor(null);
            setShowOutletDropdown(false);
          }}
        />
      )}

      {/* PIN Pad Modal for Switching Staff (Password Protection) */}
      {pendingStaffForPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0B1F4B] border border-slate-700/90 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-150 relative">
            <button
              type="button"
              onClick={() => {
                setPendingStaffForPin(null);
                setSwitchPinInput('');
                setSwitchPinError('');
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Avatar & Name of target staff */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-xl mb-3 shadow-lg shadow-indigo-500/20">
              {pendingStaffForPin.name.charAt(0).toUpperCase()}
            </div>

            <h3 className="text-lg font-black text-white tracking-tight">
              Switch to {pendingStaffForPin.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter 4-digit PIN for {pendingStaffForPin.role}
            </p>

            {/* PIN Dots Indicator */}
            <div className="flex items-center gap-3.5 my-5">
              {[0, 1, 2, 3].map((idx) => {
                const filled = switchPinInput.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                      filled
                        ? 'bg-indigo-400 scale-125 shadow-sm shadow-indigo-400/50'
                        : 'border-2 border-slate-600 bg-transparent'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Message */}
            {switchPinError && (
              <div className="text-xs text-rose-300 font-semibold mb-3 flex items-center gap-1.5 bg-rose-950/70 border border-rose-800 px-3 py-1.5 rounded-xl">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{switchPinError}</span>
              </div>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => {
                    if (switchPinInput.length < 4) {
                      const next = switchPinInput + digit;
                      setSwitchPinInput(next);
                      setSwitchPinError('');
                      if (next.length === 4) {
                        handleVerifyAndSwitch(next);
                      }
                    }
                  }}
                  className="h-12 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-lg border border-slate-700/80 transition active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setSwitchPinInput('');
                  setSwitchPinError('');
                }}
                className="h-12 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 font-bold text-xs border border-slate-700/80 transition flex items-center justify-center cursor-pointer"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => {
                  if (switchPinInput.length < 4) {
                    const next = switchPinInput + '0';
                    setSwitchPinInput(next);
                    setSwitchPinError('');
                    if (next.length === 4) {
                      handleVerifyAndSwitch(next);
                    }
                  }
                }}
                className="h-12 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-lg border border-slate-700/80 transition active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
              >
                0
              </button>

              <button
                type="button"
                onClick={() => {
                  setSwitchPinInput((prev) => prev.slice(0, -1));
                  setSwitchPinError('');
                }}
                className="h-12 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 font-bold text-sm border border-slate-700/80 transition flex items-center justify-center cursor-pointer"
              >
                ⌫
              </button>
            </div>

            {/* Hint for PINs */}
            <div className="text-[10px] text-slate-400 font-medium mb-4 text-center">
              Default PINs: Suman (3210) · Riya (1234) · Karan (5678)
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => {
                setPendingStaffForPin(null);
                setSwitchPinInput('');
                setSwitchPinError('');
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="h-16 bg-[#0B132B] text-white flex items-center justify-between px-5 select-none shrink-0 border-b border-slate-800 shadow-md relative z-40">
        {/* Left: Brand & Outlet Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
              <Store className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 leading-none">
                <span className="font-bold text-base tracking-tight text-white">BizBox POS</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Terminal 01
                </span>
              </div>
              <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mt-0.5">
                {/* Outlet Selector Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOutletDropdown((prev) => !prev);
                      setStaffDropdownAnchor(null);
                    }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 transition cursor-pointer"
                    title="Change location / outlet"
                  >
                    <span className="font-semibold text-indigo-300">{activeOutlet?.name?.split(' ')[0] || 'Indiranagar'}</span>
                    <span className="text-[10px] text-slate-400">({activeOutlet?.code || 'BLR01'})</span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showOutletDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showOutletDropdown && (
                    <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                        Switch Store Location
                      </div>
                      {OUTLETS.map((otl) => (
                        <button
                          key={otl.code}
                          type="button"
                          onClick={() => {
                            setOutlet(otl);
                            setShowOutletDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800/80 transition ${
                            activeOutlet?.code === otl.code
                              ? 'text-indigo-400 bg-indigo-950/40 font-bold'
                              : 'text-slate-300 font-normal'
                          }`}
                        >
                          <div>
                            <div className="font-semibold">{otl.name}</div>
                            <div className="text-[10px] text-slate-400">{otl.city}</div>
                          </div>
                          {activeOutlet?.code === otl.code && (
                            <Check className="w-3.5 h-3.5 text-indigo-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-slate-600">·</span>

                {/* Top-Left Cashier Dropdown Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setStaffDropdownAnchor((prev) => (prev === 'left' ? null : 'left'));
                      setShowOutletDropdown(false);
                    }}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                      staffDropdownAnchor === 'left'
                        ? 'bg-indigo-900/60 border-indigo-500 text-white'
                        : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white border-slate-700/80'
                    }`}
                    title="Click to view profile or switch staff"
                  >
                    <div className="w-4 h-4 rounded-full bg-indigo-500/40 text-indigo-300 font-black text-[9px] flex items-center justify-center">
                      {activeStaff.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-slate-400">Cashier:</span>
                    <span className="font-bold text-indigo-300 capitalize">{activeStaff.split(' ')[0]}</span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${staffDropdownAnchor === 'left' ? 'rotate-180' : ''}`} />
                  </button>

                  {staffDropdownAnchor === 'left' && (
                    <div className="absolute left-0 top-full mt-2 z-50">
                      {renderStaffDropdownMenu()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Service Channel & Mode Tabs (Dine-in / Takeaway / Delivery / Swiggy / Zomato) */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          {channels.map((ch) => {
            const isChannelActive =
              ch.channel === 'pos'
                ? orderChannel === 'pos' && serviceType === ch.serviceType
                : orderChannel === ch.channel;

            return (
              <button
                key={ch.label}
                type="button"
                onClick={() => {
                  if (ch.channel === 'pos' && ch.serviceType) {
                    setOrderChannel('pos');
                    setServiceType(ch.serviceType);
                  } else {
                    setOrderChannel(ch.channel);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition duration-150 flex items-center gap-1.5 ${
                  isChannelActive
                    ? ch.channel === 'swiggy'
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : ch.channel === 'zomato'
                      ? 'bg-rose-600 text-white font-bold shadow-xs'
                      : 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {ch.label}
              </button>
            );
          })}
        </div>

        {/* Right: Quick Nav, Network Status & Staff Profile */}
        <div className="flex items-center gap-3">
          {/* Main Module Nav links */}
          <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition duration-150 ${
                    active
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sync / Online Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              !isOnline || syncStatus === 'offline'
                ? 'bg-rose-950/60 text-rose-300 border border-rose-800'
                : syncStatus === 'syncing'
                ? 'bg-amber-950/60 text-amber-300 border border-amber-800'
                : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/80'
            }`}
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Offline {pendingSyncCount > 0 ? `(${pendingSyncCount})` : ''}</span>
              </>
            ) : syncStatus === 'syncing' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Syncing ({pendingSyncCount})</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Synced</span>
              </>
            )}
          </div>

          {/* Staff Cashier Pill (Top Right) */}
          <div className="relative flex items-center gap-2 pl-2 border-l border-slate-800">
            <button
              type="button"
              onClick={() => {
                setStaffDropdownAnchor((prev) => (prev === 'right' ? null : 'right'));
                setShowOutletDropdown(false);
              }}
              className={`flex items-center gap-2 text-xs font-medium transition cursor-pointer px-2.5 py-1.5 rounded-lg border ${
                staffDropdownAnchor === 'right'
                  ? 'bg-indigo-900/60 border-indigo-500 text-white'
                  : 'text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-800 border-slate-700'
              }`}
              title="Staff Profile & Switcher"
            >
              <div className="w-5 h-5 rounded bg-indigo-500/30 text-indigo-300 font-bold text-[10px] flex items-center justify-center">
                {activeStaff.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold capitalize">{activeStaff.split(' ')[0]}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${staffDropdownAnchor === 'right' ? 'rotate-180' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleLock}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Lock terminal to PIN pad"
            >
              <Lock className="w-4 h-4" />
            </button>

            {staffDropdownAnchor === 'right' && (
              <div className="absolute right-0 top-full mt-2 z-50">
                {renderStaffDropdownMenu()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 overflow-hidden relative bg-slate-900">{children}</main>
    </div>
  );
}
