'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useOutlet, OutletItem } from '../context/OutletContext';
import { getPosBaseUrl } from '../lib/config';
import {
  LayoutDashboard,
  ShoppingBag,
  MenuSquare,
  Package,
  Users,
  BarChart3,
  UserCheck,
  Cpu,
  Settings,
  ChevronDown,
  ExternalLink,
  Store,
  Calendar,
  Bell,
  Search,
  CheckCircle2,
  X,
  AlertTriangle,
  Flame,
  Check,
  CheckCheck,
  CreditCard,
  Trash2,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'order' | 'inventory' | 'kitchen' | 'payment';
  read: boolean;
  link?: string;
}

interface ConsoleLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'New Online Order #SW-8812',
    message: 'Swiggy order received (₹420) · Auto-assigned to Hot Kitchen KDS.',
    time: '2m ago',
    type: 'order',
    read: false,
    link: '/orders',
  },
  {
    id: 'notif-2',
    title: 'Low Inventory Alert: Oat Milk',
    message: 'Only 2 cartons remaining at Indiranagar. Reorder required.',
    time: '14m ago',
    type: 'inventory',
    read: false,
    link: '/inventory',
  },
  {
    id: 'notif-3',
    title: 'Kitchen KOT Delayed (>12m)',
    message: 'Table T4 order has been cooking for 13 mins. Priority attention.',
    time: '25m ago',
    type: 'kitchen',
    read: false,
    link: '/devices',
  },
  {
    id: 'notif-4',
    title: 'UPI Payment Confirmed: ₹231.00',
    message: 'Table T1 bill paid via ICICI Bharat UPI QR (Cappuccino).',
    time: '42m ago',
    type: 'payment',
    read: true,
    link: '/orders',
  },
  {
    id: 'notif-5',
    title: 'Daily Sales Milestone Reached',
    message: '₹42,500 sales achieved today across outlets! Target exceeded.',
    time: '1h ago',
    type: 'payment',
    read: true,
    link: '/dashboard',
  },
];

export function ConsoleLayout({ children, title, subtitle, actions }: ConsoleLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { outlets, selectedOutlet, setSelectedOutlet } = useOutlet();
  const [showOutletDropdown, setShowOutletDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showUserProfileDropdown, setShowUserProfileDropdown] = useState(false);
  const [selectedDate, setSelectedDate] = useState('Today, 29 Oct 2026');

  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bizbox_admin_notifications');
        if (saved) {
          setNotifications(JSON.parse(saved));
        }
      } catch (err) {
        console.warn('Failed to parse notifications from localStorage', err);
      }
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizbox_admin_notifications', JSON.stringify(updated));
    }
  };

  const markSingleRead = (id: string, link?: string) => {
    const updated = notifications.map((item) => (item.id === id ? { ...item, read: true } : item));
    setNotifications(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizbox_admin_notifications', JSON.stringify(updated));
    }
    setShowNotificationDropdown(false);
    if (link) router.push(link);
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizbox_admin_notifications', JSON.stringify([]));
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Orders', href: '/orders', icon: ShoppingBag, badge: 'Live' },
    { label: 'Menu', href: '/menu', icon: MenuSquare },
    { label: 'Inventory', href: '/inventory', icon: Package },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Reports & GST', href: '/reports', icon: BarChart3 },
    { label: 'Staff & Roles', href: '/staff', icon: UserCheck },
    { label: 'Devices / KDS', href: '/devices', icon: Cpu },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] overflow-hidden text-slate-900 select-none antialiased">
      {/* 1. SIDEBAR */}
      <aside className="w-64 bg-[#0F172A] text-slate-300 flex flex-col shrink-0 border-r border-slate-800 shadow-xl z-30">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-md shadow-indigo-500/20">
              B
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">BizBox</span>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                POS
              </span>
            </div>
          </Link>
        </div>



        {/* Navigation List */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${isActive
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* POS Quick Launcher */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          <a
            href={`${getPosBaseUrl()}/billing?outlet=${selectedOutlet?.code || selectedOutlet?.id || 'BLR01'}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-2.5 bg-slate-900 hover:bg-slate-800/90 text-xs text-white rounded-lg border border-slate-700/80 transition group"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-semibold text-slate-200">Open Billing POS</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition" />
          </a>

          {/* User Profile */}
          <div className="relative">
            <div
              onClick={() => setShowUserProfileDropdown(!showUserProfileDropdown)}
              className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-900 transition cursor-pointer border border-transparent hover:border-slate-800"
              title="Store Owner Profile"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-xs shadow-md">
                  S
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-slate-100 leading-tight">Suman</span>
                  <span className="text-[10px] text-indigo-400 font-semibold">Store Owner & Admin</span>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showUserProfileDropdown ? 'rotate-180' : ''}`} />
            </div>

            {showUserProfileDropdown && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-sm shadow">
                      S
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">Suman</div>
                      <div className="text-[10px] text-indigo-300">sumanqaj9876@gmail.com</div>
                      <div className="text-[9px] text-emerald-400 font-bold uppercase mt-0.5">● Super Admin Session</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <Link
                    href="/settings"
                    onClick={() => setShowUserProfileDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
                  >
                    <Settings className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Store Settings & APIs</span>
                  </Link>

                  <Link
                    href="/staff"
                    onClick={() => setShowUserProfileDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Staff & Role Access</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
        {/* Top Header Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 z-20">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              {title || 'Dashboard'}
            </h1>
            {subtitle && (
              <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
            )}
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-3">
            {actions}

            {/* Notification Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className={`relative p-2 rounded-xl border transition cursor-pointer ${
                  showNotificationDropdown
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                }`}
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotificationDropdown && (
                <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  {/* Header */}
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900">Notifications</h4>
                      {unreadCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700">
                          {unreadCount} New
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                          All caught up
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark read</span>
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markSingleRead(n.id, n.link)}
                        className={`p-3.5 flex items-start gap-3 transition cursor-pointer hover:bg-slate-50 ${
                          !n.read ? 'bg-indigo-50/40' : 'bg-white'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            n.type === 'order'
                              ? 'bg-amber-100 text-amber-700'
                              : n.type === 'inventory'
                              ? 'bg-rose-100 text-rose-700'
                              : n.type === 'kitchen'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {n.type === 'order' ? (
                            <ShoppingBag className="w-4 h-4" />
                          ) : n.type === 'inventory' ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : n.type === 'kitchen' ? (
                            <Flame className="w-4 h-4" />
                          ) : (
                            <CreditCard className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs text-slate-900 truncate">{n.title}</span>
                            <span className="text-[10px] font-medium text-slate-400 shrink-0">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{n.message}</p>
                        </div>

                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5"></span>
                        )}
                      </div>
                    ))}

                    {notifications.length === 0 && (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                        <span>No new notifications</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={clearAllNotifications}
                        className="text-[11px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear all</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNotificationDropdown(false)}
                        className="text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date filter button */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{selectedDate}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>

            {/* Outlet selector dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowOutletDropdown(!showOutletDropdown);
                  setShowNotificationDropdown(false);
                  setShowUserProfileDropdown(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 transition cursor-pointer shadow-xs"
              >
                <Store className="w-3.5 h-3.5 text-indigo-600" />
                <span>{selectedOutlet.name}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showOutletDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showOutletDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
                    <span>Select Store Location</span>
                    <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-black">All Active</span>
                  </div>
                  {outlets.map((outlet: OutletItem) => {
                    const isSelected = selectedOutlet.code === outlet.code;
                    return (
                      <button
                        key={outlet.id}
                        type="button"
                        onClick={() => {
                          setSelectedOutlet(outlet);
                          setShowOutletDropdown(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${
                          isSelected ? 'text-indigo-600 bg-indigo-50/70 font-bold' : 'text-slate-700 font-normal'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{outlet.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{outlet.area}</div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Backdrop for open dropdowns */}
        {(showOutletDropdown || showNotificationDropdown || showUserProfileDropdown) && (
          <div
            className="fixed inset-0 z-10 bg-transparent"
            onClick={() => {
              setShowOutletDropdown(false);
              setShowNotificationDropdown(false);
              setShowUserProfileDropdown(false);
            }}
          />
        )}

        {/* Scrollable View Container */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
          {children}
        </div>
      </main>
    </div>
  );
}
