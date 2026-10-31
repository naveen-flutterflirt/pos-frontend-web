'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useCartStore } from '../../../store/useCartStore';
import { customersApi, Customer } from '../../../lib/api';
import { getApiBaseUrl } from '../../../lib/config';
import { MenuItem, MenuItemVariant, SelectedModifier } from '@bizbox/pos-core';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Check,
  CreditCard,
  QrCode,
  Banknote,
  Printer,
  UtensilsCrossed,
  Tag,
  User,
  PauseCircle,
  PlayCircle,
  Scissors,
  Repeat,
  FileText,
  X,
  CheckCircle2,
  Clock,
  Edit2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Split,
  Layers,
} from 'lucide-react';

export default function BillingPage() {
  const {
    order,
    serviceType,
    orderChannel,
    selectedTable,
    selectedCustomer,
    appliedDiscount,
    setCustomer,
    setTable,
    addItem,
    updateItemQty,
    removeItem,
    applyDiscount,
    removeDiscount,
    fireKOT,
    settleBill,
    clearCart,
    activeOutlet,
    setOutlet,
  } = useCartStore();

  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<MenuItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Customer selection modal state - Connected to Senior Enterprise API Client
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [showNewCustForm, setShowNewCustForm] = useState(false);

  const fetchPosCustomers = async (query?: string) => {
    setIsLoadingCustomers(true);
    try {
      const list = await customersApi.list(query);
      setCustomersList(list);
    } catch (e) {
      console.warn('[POS] Error loading customers from API client:', e);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchPosCustomers();

    const handleOutletChanged = (e: any) => {
      if (e.detail) {
        setOutlet(e.detail);
      }
    };
    window.addEventListener('bizbox_outlet_changed', handleOutletChanged);
    return () => window.removeEventListener('bizbox_outlet_changed', handleOutletChanged);
  }, [setOutlet]);

  const branchReceiptDetails = useMemo(() => {
    const code = activeOutlet?.code?.toUpperCase() || 'BLR01';
    if (code === 'BLR02') {
      return {
        name: 'Brew Street Cafe (Koramangala)',
        address: '80 Feet Rd, 4th Block, Koramangala, Bengaluru, KA',
        gstin: '29AABCU9603R1ZM',
        fssai: '11223334000129',
        phone: '+91 98765 43211',
      };
    } else if (code === 'DEL01') {
      return {
        name: 'Brew Street Cafe (Connaught Place)',
        address: 'Block C, Inner Circle, Connaught Place, New Delhi, DL',
        gstin: '07AABCU9603R1ZM',
        fssai: '11223334000130',
        phone: '+91 98765 43212',
      };
    } else if (code === 'MUM01') {
      return {
        name: 'Brew Street Cafe (Bandra West)',
        address: 'Hill Road, Bandra West, Mumbai, MH',
        gstin: '27AABCU9603R1ZM',
        fssai: '11223334000131',
        phone: '+91 98765 43213',
      };
    }
    return {
      name: 'Brew Street Cafe (Indiranagar)',
      address: '100 Feet Rd, Indiranagar, Bengaluru, KA',
      gstin: '29AABCU9603R1ZM',
      fssai: '11223334000129',
      phone: '+91 98765 43210',
    };
  }, [activeOutlet?.code]);

  // Fetch dynamic catalog from backend API for active branch
  useEffect(() => {
    setIsLoadingCatalog(true);
    const targetOutletId = activeOutlet?.id || activeOutlet?.code || '22222222-2222-2222-2222-222222222222';
    fetch(`${getApiBaseUrl()}/catalog/${targetOutletId}/menu`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.categories && data.categories.length > 0) {
          const mappedCats = data.categories.map((c: any) => ({
            id: c.id,
            name: c.name,
            color: c.color || '#3B4FE0',
          }));
          setCategoriesList(mappedCats);
          setActiveCategoryId(mappedCats[0].id);
        }

        if (data && data.items && data.items.length > 0) {
          const mappedItems: MenuItem[] = data.items.map((it: any) => ({
            id: it.id,
            categoryId: it.category_id,
            name: it.name,
            shortName: it.short_name || it.name,
            hsnSac: it.hsn_sac || '996331',
            foodType: it.food_type === 'N' ? 'non_veg' : 'veg',
            variants: (it.variants || []).map((v: any) => ({
              id: v.id,
              name: v.name,
              sku: v.sku,
              price: parseFloat(v.price),
              unit: v.unit || 'pcs',
            })),
            modifierGroups: (data.modifierGroups || []).map((mg: any) => {
              const opts = (mg.modifiers || mg.options || [])
                .filter((m: any) => m && m.id)
                .map((m: any) => ({
                  id: m.id,
                  name: m.name,
                  priceDelta: parseFloat(m.priceDelta || m.price_delta || 0),
                }));
              return {
                id: mg.id,
                name: mg.name,
                minSelect: mg.min_select ?? mg.minSelect ?? 0,
                maxSelect: mg.max_select ?? mg.maxSelect ?? 1,
                options: opts,
                modifiers: opts,
              };
            }),
          }));
          setItemsList(mappedItems);
        }
      })
      .catch((e) => console.warn('Failed to load menu from backend:', e))
      .finally(() => {
        setIsLoadingCatalog(false);
      });
  }, [activeOutlet?.id, activeOutlet?.code]);

  // Modifier dialog state
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
  const [prepNotes, setPrepNotes] = useState('');

  // Payment settle modal state
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleSuccess, setSettleSuccess] = useState<{ invoiceNo: string; amount: number } | null>(null);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card'>('upi');
  const [upiStatus, setUpiStatus] = useState<'waiting' | 'paid'>('waiting');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Held orders state
  const [heldOrders, setHeldOrders] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('bizbox_pos_held_orders') || '[]');
      } catch {
        return [];
      }
    }
    return [];
  });
  const [showRecallModal, setShowRecallModal] = useState(false);

  // Discount modal state
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [customDiscountPercent, setCustomDiscountPercent] = useState('');
  const [discountReason, setDiscountReason] = useState('Happy Hour Promo');

  // Notes modal state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');

  // Split bill modal state
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitCount, setSplitCount] = useState(2);

  // Transfer table modal state
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Thermal bill preview modal state
  const [showPrintBillModal, setShowPrintBillModal] = useState(false);

  // Reprint last bill modal state
  const [showReprintModal, setShowReprintModal] = useState(false);
  const [lastSettledBill, setLastSettledBill] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('bizbox_last_settled_bill') || 'null');
      } catch {
        return null;
      }
    }
    return null;
  });

  // Cash tender calculations
  const [cashTendered, setCashTendered] = useState<string>('');

  // Card payment state
  const [cardType, setCardType] = useState('Visa');
  const [cardAuthCode, setCardAuthCode] = useState('');

  // Merchant UPI ID & QR configuration
  const [merchantVpa, setMerchantVpa] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bizbox_merchant_vpa') || 'brewstreet@icici';
    }
    return 'brewstreet@icici';
  });
  const [merchantName, setMerchantName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bizbox_merchant_name') || 'Brew Street Cafe';
    }
    return 'Brew Street Cafe';
  });
  const [qrType, setQrType] = useState<'dynamic' | 'custom'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('bizbox_qr_type') as any) || 'dynamic';
    }
    return 'dynamic';
  });
  const [customQrImage, setCustomQrImage] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bizbox_custom_qr_image') || null;
    }
    return null;
  });
  const [showUpiConfigModal, setShowUpiConfigModal] = useState(false);
  const [vpaInput, setVpaInput] = useState(merchantVpa);
  const [nameInput, setNameInput] = useState(merchantName);

  // Dynamic NPCI standard Bharat UPI deeplink
  const dynamicUpiUrl = useMemo(() => {
    const amt = order.totals.grandTotal.toFixed(2);
    const storeName = merchantName || activeOutlet?.name?.split(' ')[0] || 'BrewStreet';
    const orderRef = order.orderNo || `ORD-${Date.now().toString().slice(-4)}`;
    return `upi://pay?pa=${encodeURIComponent(merchantVpa)}&pn=${encodeURIComponent(storeName)}&am=${amt}&tr=${encodeURIComponent(orderRef)}&tn=${encodeURIComponent('Bill ' + orderRef)}&cu=INR`;
  }, [merchantVpa, merchantName, order.totals.grandTotal, order.orderNo, activeOutlet]);

  const qrImageUrl = useMemo(() => {
    if (qrType === 'custom' && customQrImage) {
      return customQrImage;
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(dynamicUpiUrl)}`;
  }, [qrType, customQrImage, dynamicUpiUrl]);

  // Hotkey handlers
  const handleHoldOrder = () => {
    if (order.items.length === 0) {
      showToast('⚠️ Cart is empty. Add items before putting order on hold.');
      return;
    }
    const holdEntry = {
      id: `HOLD-${Date.now().toString().slice(-4)}`,
      order: { ...order },
      selectedTable,
      selectedCustomer,
      appliedDiscount,
      orderNotes,
      heldAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const nextList = [holdEntry, ...heldOrders];
    setHeldOrders(nextList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizbox_pos_held_orders', JSON.stringify(nextList));
    }
    clearCart();
    setOrderNotes('');
    showToast(`Order #${holdEntry.id} held on ${selectedTable?.label || 'T1'}! Cart cleared.`);
  };

  const handleRecallOrder = (holdEntry: any) => {
    const remaining = heldOrders.filter((h) => h.id !== holdEntry.id);
    setHeldOrders(remaining);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizbox_pos_held_orders', JSON.stringify(remaining));
    }
    useCartStore.setState({
      order: holdEntry.order,
      selectedTable: holdEntry.selectedTable,
      selectedCustomer: holdEntry.selectedCustomer,
      appliedDiscount: holdEntry.appliedDiscount,
    });
    if (holdEntry.orderNotes) {
      setOrderNotes(holdEntry.orderNotes);
    }
    setShowRecallModal(false);
    showToast(`Restored order ${holdEntry.id} back to active cart!`);
  };

  const handleDiscardHeldOrder = (holdId: string) => {
    const remaining = heldOrders.filter((h) => h.id !== holdId);
    setHeldOrders(remaining);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizbox_pos_held_orders', JSON.stringify(remaining));
    }
    showToast(`Held order ${holdId} discarded.`);
  };

  const handleFireKotAction = async () => {
    if (order.items.length === 0) {
      showToast('⚠️ No items in cart to fire KOT.');
      return;
    }
    await fireKOT();
    showToast(`🔥 KOT Fired to Kitchen KDS for Table ${selectedTable?.label || 'T1'}!`);
  };

  const handleSaveVpa = () => {
    if (!vpaInput.trim() || !vpaInput.includes('@')) {
      showToast('⚠️ Please enter a valid UPI ID (e.g. merchant@icici or 9876543210@paytm)');
      return;
    }
    setMerchantVpa(vpaInput.trim());
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizbox_merchant_vpa', vpaInput.trim());
    }
    setShowUpiConfigModal(false);
    showToast(`Merchant UPI ID set to: ${vpaInput.trim()}`);
  };

  // Barcode / Scanner simulation & POS Hotkeys listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Fire KOT
      if (e.key === 'F2') {
        e.preventDefault();
        handleFireKotAction();
      }
      // F4: Open payment modal
      if (e.key === 'F4') {
        e.preventDefault();
        if (order.items.length > 0) {
          setShowSettleModal(true);
        } else {
          showToast('⚠️ Cart is empty.');
        }
      }
      // F7: Hold current order
      if (e.key === 'F7') {
        e.preventDefault();
        handleHoldOrder();
      }
      // F8: Recall held order
      if (e.key === 'F8') {
        e.preventDefault();
        setShowRecallModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [order, heldOrders, selectedTable]);

  // Filter items by category and search term
  const filteredItems = useMemo(() => {
    return itemsList.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.shortName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.hsnSac.includes(searchQuery);

      if (searchQuery.trim() !== '') {
        return matchesSearch;
      }
      return matchesSearch && item.categoryId === activeCategoryId;
    });
  }, [activeCategoryId, searchQuery]);

  const handleItemClick = (item: MenuItem) => {
    if (item.variants.length > 1 || (item.modifierGroups && item.modifierGroups.length > 0)) {
      setCustomizingItem(item);
      setSelectedVariant(item.variants[0]);
      setSelectedModifiers([]);
      setPrepNotes('');
    } else {
      addItem(item, item.variants[0], [], '');
    }
  };

  const handleAddCustomizedItem = () => {
    if (!customizingItem || !selectedVariant) return;
    addItem(customizingItem, selectedVariant, selectedModifiers, prepNotes);
    setCustomizingItem(null);
  };

  const toggleModifier = (mod: { id: string; name: string; priceDelta: number }) => {
    const exists = selectedModifiers.find((m) => m.modifierId === mod.id);
    if (exists) {
      setSelectedModifiers(selectedModifiers.filter((m) => m.modifierId !== mod.id));
    } else {
      setSelectedModifiers([
        ...selectedModifiers,
        { modifierId: mod.id, nameSnapshot: mod.name, priceDelta: mod.priceDelta, qty: 1 },
      ]);
    }
  };

  const handleFinalPayment = async (mode: 'cash' | 'upi' | 'card') => {
    const result = await settleBill(mode);
    const settledData = {
      invoiceNo: result.invoiceNo,
      amount: result.grandTotal,
      mode,
      date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      items: [...order.items],
      totals: { ...order.totals },
      table: selectedTable?.label || 'T1',
      customer: selectedCustomer?.name || 'Walk-in Guest',
      customerPhone: selectedCustomer?.phone || '—',
      outlet: activeOutlet?.name || 'Indiranagar (BLR01)',
      cashier: (typeof window !== 'undefined' ? (localStorage.getItem('pos_active_staff')?.split(' ')[0] || 'suman') : 'suman'),
      vpa: merchantVpa,
      notes: orderNotes,
    };
    setSettleSuccess({ invoiceNo: result.invoiceNo, amount: result.grandTotal });
    setLastSettledBill(settledData);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizbox_last_settled_bill', JSON.stringify(settledData));
    }
  };

  const handleSelectWalkIn = () => {
    setCustomer({ name: 'Walk-in Guest', phone: '—', points: 0 });
    setShowCustomerModal(false);
  };

  const handleSelectCustomer = (c: Customer | { id?: string; name: string; phone: string; loyaltyPoints?: number; points?: number }) => {
    setCustomer({
      id: c.id,
      name: c.name || 'Valued Customer',
      phone: c.phone,
      points: Number((c as any).loyaltyPoints ?? (c as any).points ?? 0),
    });
    setShowCustomerModal(false);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustPhone.trim()) return;
    try {
      const created = await customersApi.create({
        name: newCustName.trim() || 'Guest Customer',
        phone: newCustPhone.trim(),
      });
      handleSelectCustomer(created);
      setNewCustName('');
      setNewCustPhone('');
      setShowNewCustForm(false);
      await fetchPosCustomers();
    } catch (err) {
      console.error('[POS] Failed to create customer via API:', err);
    }
  };

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.toLowerCase().trim();
    if (!term) return customersList;
    return customersList.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.phone && c.phone.includes(term))
    );
  }, [customersList, customerSearch]);

  return (
    <div className="flex h-full w-full bg-[#0F172A] text-slate-100 select-none overflow-hidden font-sans">
      {/* ======================================================== */}
      {/* 1. LEFT COLUMN: Categories (Vertical Navigation)         */}
      {/* ======================================================== */}
      <aside className="w-52 bg-[#0B132B] border-r border-slate-800 flex flex-col shrink-0 z-10">
        <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Categories
          </span>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            {categoriesList.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoadingCatalog ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-slate-800/60 animate-pulse" />
            ))
          ) : (
            categoriesList.map((cat) => {
            const isActive = activeCategoryId === cat.id && searchQuery === '';
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategoryId(cat.id);
                  setSearchQuery('');
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center justify-between min-h-[44px] ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate">{cat.name}</span>
                </div>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                )}
              </button>
            );
          })
          )}
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MIDDLE COLUMN: Item Search, Grid & Quick Actions       */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#0F172A] border-r border-slate-800">
        {/* Search Bar & Barcode Lookup */}
        <div className="p-3 bg-[#0B132B] border-b border-slate-800 flex items-center gap-3 z-10">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu items, scan barcode (e.g. 890123...)"
              className="w-full pl-10 pr-9 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5 rounded-full hover:bg-slate-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="hidden lg:flex items-center gap-2 text-[11px] font-semibold text-slate-400 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{filteredItems.length} Products</span>
          </div>
        </div>

        {/* Item Tile Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingCatalog ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-[#1E293B]/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between animate-pulse min-h-[115px] space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-3.5 h-3.5 rounded bg-slate-700/80" />
                    <div className="w-12 h-4 rounded-full bg-slate-700/80" />
                  </div>
                  <div className="w-3/4 h-4 rounded bg-slate-700/80" />
                  <div className="flex justify-between items-end pt-2 border-t border-slate-800/50">
                    <div className="w-12 h-4 rounded bg-slate-700/80" />
                    <div className="w-6 h-6 rounded bg-slate-700/80" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredItems.map((item) => {
                const primaryVariant = item.variants[0] || { price: 0 };
                const isVeg = item.foodType === 'veg';

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="bg-[#1E293B] border border-slate-800 hover:border-indigo-500/80 active:scale-[0.98] rounded-xl p-3.5 flex flex-col justify-between text-left transition duration-150 shadow-sm hover:shadow-md min-h-[115px] group relative overflow-hidden"
                  >
                    {/* Top indicator & size tag */}
                    <div className="flex items-start justify-between w-full">
                      <div
                        className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center p-0.5 ${
                          isVeg ? 'border-emerald-500 bg-emerald-950/40' : 'border-rose-500 bg-rose-950/40'
                        }`}
                        title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            isVeg ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        ></div>
                      </div>

                      {item.variants.length > 1 ? (
                        <span className="text-[10px] bg-indigo-950/60 text-indigo-300 border border-indigo-800/80 px-2 py-0.5 rounded-full font-bold">
                          {item.variants.length} sizes
                        </span>
                      ) : item.modifierGroups && item.modifierGroups.length > 0 ? (
                        <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-bold">
                          Custom
                        </span>
                      ) : null}
                    </div>

                    {/* Title */}
                    <div className="my-2">
                      <h3 className="font-semibold text-slate-100 text-xs leading-snug group-hover:text-indigo-400 transition-colors line-clamp-2">
                        {item.name}
                      </h3>
                    </div>

                    {/* Price & Add button */}
                    <div className="flex items-center justify-between w-full pt-2 border-t border-slate-700/60">
                      <span className="text-xs font-bold text-white font-mono">
                        ₹{primaryVariant.price}
                      </span>
                      <div className="w-6 h-6 rounded bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-slate-400 transition">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!isLoadingCatalog && filteredItems.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500">
              <Search className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-400">No items found</p>
              <p className="text-xs text-slate-500 mt-0.5">Try searching with a different keyword</p>
            </div>
          )}
        </div>

        {/* Quick Actions Footer Bar */}
        <div className="p-2.5 bg-[#0B132B] border-t border-slate-800 shrink-0">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Terminal Hotkeys</span>
              {heldOrders.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[9px] font-bold animate-pulse">
                  {heldOrders.length} Held
                </span>
              )}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              F2: KOT · F4: Settle · F7: Hold · F8: Recall
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {/* 1. Hold Button */}
            <button
              type="button"
              onClick={handleHoldOrder}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
              title="Hold current order (F7)"
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Hold</span>
            </button>

            {/* 2. Recall Button */}
            <button
              type="button"
              onClick={() => setShowRecallModal(true)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg border transition cursor-pointer active:scale-95 ${
                heldOrders.length > 0
                  ? 'bg-amber-950/70 border-amber-600 text-amber-300 font-bold shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Recall held order (F8)"
            >
              <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recall {heldOrders.length > 0 ? `(${heldOrders.length})` : ''}</span>
            </button>

            {/* 3. Customer CRM */}
            <button
              type="button"
              onClick={() => setShowCustomerModal(true)}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
              title="Attach Customer Phone & Loyalty"
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Customer</span>
            </button>

            {/* 4. Discount */}
            <button
              type="button"
              onClick={() => setShowDiscountModal(true)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg border transition cursor-pointer active:scale-95 ${
                appliedDiscount
                  ? 'bg-pink-950/80 text-pink-300 border-pink-700 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Apply or Remove Discount"
            >
              <Tag className="w-3.5 h-3.5 text-pink-400" />
              <span>{appliedDiscount ? `${appliedDiscount.percent}% Off` : 'Discount'}</span>
            </button>

            {/* 5. Notes */}
            <button
              type="button"
              onClick={() => setShowNotesModal(true)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg border transition cursor-pointer active:scale-95 ${
                orderNotes
                  ? 'bg-sky-950/80 text-sky-300 border-sky-700 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Add Kitchen Cooking Notes"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Notes {orderNotes ? '●' : ''}</span>
            </button>

            {/* 6. Split Bill */}
            <button
              type="button"
              onClick={() => {
                if (order.items.length === 0) {
                  showToast('⚠️ Add items to cart before splitting bill.');
                  return;
                }
                setShowSplitModal(true);
              }}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
              title="Split bill between guests"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>Split</span>
            </button>

            {/* 7. Transfer Table */}
            <button
              type="button"
              onClick={() => setShowTransferModal(true)}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
              title="Transfer order to another dining table"
            >
              <Repeat className="w-3.5 h-3.5 text-emerald-400" />
              <span>Transfer</span>
            </button>

            {/* 8. Reprint Last Receipt */}
            <button
              type="button"
              onClick={() => {
                if (!lastSettledBill) {
                  showToast('ℹ️ No settled bill found in this session to reprint.');
                } else {
                  setShowReprintModal(true);
                }
              }}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
              title="Reprint last customer receipt"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              <span>Reprint</span>
            </button>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. RIGHT COLUMN: Live Cart, GST Summary & Checkout       */}
      {/* ======================================================== */}
      <aside className="w-[390px] bg-[#0B132B] flex flex-col shrink-0 border-l border-slate-800 z-20">
        {/* Order Header / Table info */}
        <div className="p-3.5 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  orderChannel === 'swiggy'
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                    : orderChannel === 'zomato'
                    ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40'
                    : 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-400'
                }`}
              >
                {orderChannel === 'swiggy'
                  ? 'SW'
                  : orderChannel === 'zomato'
                  ? 'ZM'
                  : serviceType === 'takeaway'
                  ? 'TA'
                  : selectedTable?.label || 'T1'}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-100 text-xs tracking-tight">
                  {orderChannel === 'swiggy'
                    ? 'Swiggy Online'
                    : orderChannel === 'zomato'
                    ? 'Zomato Online'
                    : serviceType === 'takeaway'
                    ? 'Takeaway Counter'
                    : `Table ${selectedTable?.label || 'T1'}`}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {orderChannel === 'swiggy'
                    ? 'Aggregator Delivery'
                    : orderChannel === 'zomato'
                    ? 'Aggregator Delivery'
                    : `${selectedTable?.guests || 2} Guests seated`}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700">
                #{order.orderNo || 'T2-0451'}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium mt-0.5">● Active Session</span>
            </div>
          </div>

          {/* Customer tag — Clickable to select or change customer */}
          <button
            type="button"
            onClick={() => setShowCustomerModal(true)}
            className="w-full mt-2.5 flex items-center justify-between text-xs bg-slate-800/70 hover:bg-slate-800 p-2 rounded-xl border border-slate-700/80 transition text-left group"
            title="Click to change customer"
          >
            <div className="flex items-center gap-2 text-slate-300 truncate">
              <User className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white transition" />
              <div className="truncate">
                <span className="font-bold text-slate-100">
                  {selectedCustomer?.name || 'Walk-in Guest'}
                </span>
                {selectedCustomer?.phone && selectedCustomer.phone !== '—' && (
                  <span className="text-slate-400 ml-1 font-mono text-[11px]">
                    · {selectedCustomer.phone}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {selectedCustomer?.points !== undefined && selectedCustomer.points > 0 ? (
                <span className="font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded text-[11px]">
                  {selectedCustomer.points} pts
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 bg-slate-700/60 hover:bg-slate-700 px-2 py-0.5 rounded font-medium">
                  Switch
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {order.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
              <UtensilsCrossed className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-400">Ticket is empty</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Select menu items to add</p>
            </div>
          ) : (
            order.items.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <div className="text-xs font-semibold text-slate-100">
                      {item.itemName} {item.variantName !== 'Standard' && (
                        <span className="text-indigo-400 font-medium">({item.variantName})</span>
                      )}
                    </div>
                    {item.modifiers.length > 0 && (
                      <div className="text-[10px] text-slate-400 mt-0.5 flex flex-wrap gap-1">
                        {item.modifiers.map((m) => (
                          <span key={m.modifierId} className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">
                            +{m.nameSnapshot}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-[10px] text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded mt-1 inline-block border border-amber-800/60">
                        {item.notes}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-100 font-mono">
                    ₹{item.lineTotal}
                  </span>
                </div>

                {/* Quantity Stepper & Void */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2 bg-slate-800 rounded p-0.5 border border-slate-700">
                    <button
                      onClick={() => updateItemQty(item.id, -1)}
                      className="w-5 h-5 flex items-center justify-center text-slate-300 hover:bg-slate-700 rounded transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center font-mono">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateItemQty(item.id, 1)}
                      className="w-5 h-5 flex items-center justify-center text-slate-300 hover:bg-slate-700 rounded transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Calculations (Subtotal, GST, Round off, Grand total) */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-1.5 text-xs text-slate-400">
          <div className="flex justify-between font-medium">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-200 font-mono">₹{order.totals.subtotal.toFixed(2)}</span>
          </div>

          {order.totals.discountTotal > 0 && (
            <div className="flex justify-between text-rose-400 font-semibold bg-rose-950/40 px-2 py-0.5 rounded">
              <span>Discount ({appliedDiscount?.code || 'Applied'})</span>
              <span className="font-mono">-₹{order.totals.discountTotal.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>CGST (2.5%)</span>
            <span className="font-mono">₹{order.totals.cgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>SGST (2.5%)</span>
            <span className="font-mono">₹{order.totals.sgst.toFixed(2)}</span>
          </div>

          {order.totals.roundOff !== 0 && (
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Round off</span>
              <span className="font-mono">
                {order.totals.roundOff > 0
                  ? `+₹${order.totals.roundOff.toFixed(2)}`
                  : `-₹${Math.abs(order.totals.roundOff).toFixed(2)}`}
              </span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-2 border-t border-slate-800">
            <div>
              <span className="text-sm font-bold text-slate-100 block">Total Due</span>
              <span className="text-[10px] text-slate-500">Includes all GST</span>
            </div>
            <span className="text-xl font-bold text-white font-mono">
              ₹{order.totals.grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Checkout Actions Buttons */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleFireKotAction}
              disabled={order.items.length === 0}
              className="min-h-[40px] py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
              title="Send items to Kitchen KDS (F2)"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Fire KOT (F2)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (order.items.length === 0) {
                  showToast('⚠️ Cart is empty. Add items to print bill preview.');
                  return;
                }
                setShowPrintBillModal(true);
              }}
              disabled={order.items.length === 0}
              className="min-h-[40px] py-1.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition border border-slate-700 cursor-pointer active:scale-95"
              title="Print Customer Bill Preview"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              <span>Print Bill</span>
            </button>
          </div>

          {/* Payment Mode Selector */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (order.items.length === 0) {
                  showToast('⚠️ Cart is empty.');
                  return;
                }
                setPaymentMode('cash');
                setShowSettleModal(true);
              }}
              disabled={order.items.length === 0}
              className="min-h-[38px] bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
            >
              <Banknote className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cash</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (order.items.length === 0) {
                  setVpaInput(merchantVpa);
                  setNameInput(merchantName);
                  setShowUpiConfigModal(true);
                  return;
                }
                setPaymentMode('upi');
                setShowSettleModal(true);
              }}
              title="Click to Pay with UPI or configure UPI ID"
              className="min-h-[38px] bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>UPI QR</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (order.items.length === 0) {
                  showToast('⚠️ Cart is empty.');
                  return;
                }
                setPaymentMode('card');
                setShowSettleModal(true);
              }}
              disabled={order.items.length === 0}
              className="min-h-[38px] bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-purple-400" />
              <span>Card</span>
            </button>
          </div>

          {/* Primary Settle & Pay Button */}
          <button
            type="button"
            onClick={() => {
              if (order.items.length === 0) {
                showToast('⚠️ Cart is empty.');
                return;
              }
              setPaymentMode('upi');
              setShowSettleModal(true);
            }}
            disabled={order.items.length === 0}
            className="w-full min-h-[46px] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition shadow-md shadow-emerald-900/30 cursor-pointer active:scale-98"
          >
            <Check className="w-4 h-4" />
            <span>Settle & Pay ₹{order.totals.grandTotal.toFixed(2)} (F4)</span>
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 4. MODAL: Customize Item & Modifiers                     */}
      {/* ======================================================== */}
      {customizingItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50 to-white">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {customizingItem.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Choose your size and add-ons</p>
              </div>
              <button
                onClick={() => setCustomizingItem(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Variants */}
              {customizingItem.variants.length > 1 && (
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2.5">
                    Size / Variant
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {customizingItem.variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition pos-touch-btn ${
                          selectedVariant?.id === v.id
                            ? 'border-[#3B4FE0] bg-indigo-50/70 text-[#3B4FE0] ring-1 ring-[#3B4FE0]'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span>{v.name}</span>
                        <span className="font-mono">₹{v.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modifier Groups */}
              {customizingItem.modifierGroups?.map((group) => {
                const optionsList = group.options || (group as any).modifiers || [];
                if (optionsList.length === 0) return null;
                return (
                  <div key={group.id}>
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2.5">
                      {group.name}
                    </label>
                    <div className="space-y-2">
                      {optionsList.map((option: any) => {
                        const isSelected = selectedModifiers.some((m) => m.modifierId === option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => toggleModifier(option)}
                            className={`w-full p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition pos-touch-btn ${
                              isSelected
                                ? 'border-[#E91E7B] bg-pink-50/70 text-[#E91E7B] ring-1 ring-[#E91E7B]'
                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                                  isSelected
                                    ? 'border-[#E91E7B] bg-[#E91E7B] text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span>{option.name}</span>
                            </div>
                            <span className="font-mono">
                              {option.priceDelta > 0 ? `+₹${option.priceDelta}` : 'Free'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Cooking Notes */}
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
                  Kitchen Notes
                </label>
                <input
                  type="text"
                  value={prepNotes}
                  onChange={(e) => setPrepNotes(e.target.value)}
                  placeholder="e.g. extra hot, no sugar, oat milk separated..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#3B4FE0]/30 focus:border-[#3B4FE0]"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setCustomizingItem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomizedItem}
                className="min-h-[44px] px-6 py-2 bg-gradient-to-r from-[#E91E7B] to-[#F43F5E] text-white font-extrabold text-xs rounded-xl shadow-md shadow-pink-500/20 pos-touch-btn"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL: Settle & Payment                               */}
      {/* ======================================================== */}
      {showSettleModal && (
        <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col border border-slate-200">
            {/* Header */}
            <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50 to-white">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {settleSuccess ? 'Payment Successful' : 'Settle & Payment'}
                </h3>
                {!settleSuccess && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    Order #{order.orderNo || 'T2-XXXX'} · Table {selectedTable?.label || 'T1'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSettleModal(false);
                  if (settleSuccess) {
                    clearCart();
                    setSettleSuccess(null);
                  }
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {settleSuccess ? (
                <div className="text-center py-2 space-y-4 w-full">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border-4 border-emerald-100 flex items-center justify-center mx-auto shadow-xs">
                    <Check className="w-9 h-9 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-xl font-extrabold text-slate-900">Payment Collected!</h4>
                    <p className="text-xs font-mono text-slate-500 font-bold mt-1">
                      Invoice: {settleSuccess.invoiceNo}
                    </p>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono py-1">
                    ₹{settleSuccess.amount.toFixed(2)}
                  </div>
                  <div className="bg-emerald-50 text-emerald-800 text-xs font-medium p-3 rounded-xl border border-emerald-200 text-left space-y-1">
                    <div className="flex justify-between">
                      <span>Payment Method:</span>
                      <strong className="uppercase font-bold">{paymentMode}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Outlet:</span>
                      <strong>{activeOutlet?.name || 'Indiranagar (BLR01)'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Customer:</span>
                      <strong>{selectedCustomer?.name || 'Walk-in Guest'}</strong>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettleModal(false);
                        setShowPrintBillModal(true);
                      }}
                      className="min-h-[44px] bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettleModal(false);
                        clearCart();
                        setSettleSuccess(null);
                        showToast('Ready for next order!');
                      }}
                      className="min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                    >
                      Start Next Order
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Total Due Banner */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Total Amount Due
                      </span>
                      <span className="text-[11px] text-slate-400">Includes all GST & taxes</span>
                    </div>
                    <span className="text-2xl font-black text-slate-900 font-mono">
                      ₹{order.totals.grandTotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Payment Mode Tabs inside Modal */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('cash')}
                      className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                        paymentMode === 'cash'
                          ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('upi')}
                      className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                        paymentMode === 'upi'
                          ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>UPI QR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('card')}
                      className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                        paymentMode === 'card'
                          ? 'bg-white text-purple-700 shadow-xs border border-slate-200/80'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Card</span>
                    </button>
                  </div>

                  {/* 1. CASH PAYMENT VIEW */}
                  {paymentMode === 'cash' && (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                          Quick Cash Tender
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            Math.round(order.totals.grandTotal),
                            Math.ceil(order.totals.grandTotal / 50) * 50,
                            Math.ceil(order.totals.grandTotal / 100) * 100,
                            500,
                          ].map((amt, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setCashTendered(String(amt))}
                              className="py-1.5 bg-slate-100 hover:bg-slate-200 font-mono text-xs font-bold text-slate-800 rounded-lg border border-slate-200 transition"
                            >
                              ₹{amt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          Cash Received From Customer (₹)
                        </label>
                        <input
                          type="number"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          placeholder={`Enter amount (e.g. ${order.totals.grandTotal})`}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {cashTendered && !isNaN(parseFloat(cashTendered)) && (
                        <div
                          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                            parseFloat(cashTendered) >= order.totals.grandTotal
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}
                        >
                          <span>
                            {parseFloat(cashTendered) >= order.totals.grandTotal
                              ? '💵 Change to Return:'
                              : '⚠️ Remaining Due:'}
                          </span>
                          <span className="text-base font-mono font-black">
                            ₹
                            {Math.abs(parseFloat(cashTendered) - order.totals.grandTotal).toFixed(2)}
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleFinalPayment('cash')}
                        className="w-full min-h-[46px] bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirm Cash & Settle Bill</span>
                      </button>
                    </div>
                  )}

                  {/* 2. DYNAMIC UPI QR PAYMENT VIEW */}
                  {paymentMode === 'upi' && (
                    <div className="space-y-3 pt-1 text-center">
                      {/* VPA Configuration Bar with Setup button */}
                      <div className="bg-indigo-50/90 p-2.5 rounded-xl border border-indigo-200 flex items-center justify-between text-left">
                        <div className="truncate pr-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                            {qrType === 'custom' ? 'Counter Standee QR' : 'Merchant UPI ID (VPA)'}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-800">
                            {qrType === 'custom' ? 'Uploaded Standee Photo Active' : merchantVpa}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setVpaInput(merchantVpa);
                            setNameInput(merchantName);
                            setShowUpiConfigModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer active:scale-95"
                          title="Change your UPI ID or Upload Shop Standee QR"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit VPA / Add QR</span>
                        </button>
                      </div>

                      {/* Dynamic UPI QR Code or Custom Standee */}
                      <div className="w-56 h-56 mx-auto bg-white border-2 border-dashed border-indigo-300 rounded-2xl flex flex-col items-center justify-center p-3 shadow-inner overflow-hidden">
                        <img
                          src={qrImageUrl}
                          alt="UPI QR Code"
                          className="w-44 h-44 object-contain rounded-lg"
                        />
                        <span className="text-[10px] font-mono font-bold text-slate-500 mt-1">
                          {qrType === 'custom' ? 'Scan Counter QR Standee' : 'Scan via GPay / PhonePe / Paytm / BHIM'}
                        </span>
                      </div>

                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50/60 py-2 px-3 rounded-xl border border-indigo-100">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-600 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                        </span>
                        <span>Pre-filled Amount ₹{order.totals.grandTotal.toFixed(2)} · Awaiting confirmation</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleFinalPayment('upi')}
                          className="min-h-[44px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer"
                        >
                          Verify & Confirm Paid
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMode('cash')}
                          className="min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
                        >
                          Switch to Cash
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. CARD PAYMENT VIEW */}
                  {paymentMode === 'card' && (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                          Card Network
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {['Visa', 'Mastercard', 'RuPay', 'Amex'].map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setCardType(type)}
                              className={`py-2 text-xs font-bold rounded-lg border transition ${
                                cardType === type
                                  ? 'bg-purple-50 border-purple-400 text-purple-700 font-extrabold'
                                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          EDC Machine Auth / RRN Code (Optional)
                        </label>
                        <input
                          type="text"
                          value={cardAuthCode}
                          onChange={(e) => setCardAuthCode(e.target.value)}
                          placeholder="e.g. AUTH-8821 or 6-digit RRN"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
                        Swipe or Tap customer card on PineLabs / Mosambee POS machine for <strong>₹{order.totals.grandTotal.toFixed(2)}</strong>.
                      </div>

                      <button
                        type="button"
                        onClick={() => handleFinalPayment('card')}
                        className="w-full min-h-[46px] bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Confirm Card Payment & Settle</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. CUSTOMER SELECTION & CRM MODAL                        */}
      {/* ======================================================== */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                    Customer & Loyalty
                  </h3>
                  <p className="text-[11px] text-slate-400">Attach customer to current order</p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="w-7 h-7 rounded-full bg-slate-200/80 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Quick Walk-in Guest Button */}
              <button
                type="button"
                onClick={handleSelectWalkIn}
                className="w-full p-2.5 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 flex items-center justify-between text-xs font-bold text-slate-700 transition"
              >
                <span>Default: Walk-in Guest</span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-semibold">
                  No Loyalty
                </span>
              </button>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search by customer name or phone..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#3B4FE0] focus:bg-white transition"
                />
              </div>

              {/* New Customer Toggle */}
              {!showNewCustForm ? (
                <button
                  type="button"
                  onClick={() => setShowNewCustForm(true)}
                  className="w-full py-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Customer</span>
                </button>
              ) : (
                <form onSubmit={handleCreateCustomer} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800">New Customer Quick-Add</div>
                  <input
                    type="text"
                    required
                    placeholder="Customer Name"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Phone (10 digits)"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg"
                    >
                      Save & Select
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewCustForm(false)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Customer List */}
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {isLoadingCustomers ? (
                  <div className="p-5 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>Loading customers...</span>
                  </div>
                ) : filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id || c.phone}
                      type="button"
                      onClick={() => handleSelectCustomer(c)}
                      className="w-full p-2.5 hover:bg-indigo-50/60 flex items-center justify-between text-left transition group cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                            {c.name || 'Customer'}
                          </span>
                          {c.tier && (
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                              c.tier === 'GOLD'
                                ? 'bg-amber-100 text-amber-800'
                                : c.tier === 'SILVER'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-orange-50 text-orange-700'
                            }`}>
                              {c.tier}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{c.phone}</div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {c.loyaltyPoints || 0} pts
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-5 text-center text-xs text-slate-400 space-y-1">
                    <p>No matching customer found</p>
                    <p className="text-[11px] text-slate-400">Click &quot;Add New Customer&quot; above to register</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5B. MODAL: UPI & QR Code Configuration                   */}
      {/* ======================================================== */}
      {showUpiConfigModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col text-slate-800 border border-slate-200">
            {/* Header */}
            <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-indigo-50/50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">UPI & QR Code Setup</h3>
                  <p className="text-[11px] text-slate-400">Configure your store UPI ID or Upload Standee Photo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpiConfigModal(false)}
                className="w-7 h-7 rounded-full bg-slate-200/80 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Mode Selection Tabs */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Choose QR Code Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQrType('dynamic')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                      qrType === 'dynamic'
                        ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-black flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Dynamic Auto QR</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Auto-embeds exact bill amount (₹{order.totals.grandTotal.toFixed(2)}). Customer does not type amount.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQrType('custom')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                      qrType === 'custom'
                        ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-black flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Upload Standee</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Upload your shop's PhonePe, Paytm, or GPay counter standee QR image.
                    </span>
                  </button>
                </div>
              </div>

              {/* DYNAMIC QR FIELDS */}
              {qrType === 'dynamic' && (
                <div className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Merchant UPI ID (VPA) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={vpaInput}
                      onChange={(e) => setVpaInput(e.target.value)}
                      placeholder="e.g. suman@paytm, 9876543210@upi, mycafe@icici"
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Aapka business UPI ID (GPay, PhonePe, Paytm ya ICICI/HDFC merchant VPA).
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Store Display Name
                    </label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="e.g. Brew Street Cafe"
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Customer ke UPI app me store ka naam yahi dikhega.
                    </span>
                  </div>
                </div>
              )}

              {/* CUSTOM QR STANDEE IMAGE UPLOAD */}
              {qrType === 'custom' && (
                <div className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block text-left mb-1">
                    Upload Counter Standee Photo
                  </label>

                  {customQrImage ? (
                    <div className="space-y-2">
                      <img
                        src={customQrImage}
                        alt="Uploaded Counter Standee"
                        className="w-36 h-36 mx-auto object-contain rounded-xl border border-slate-300 bg-white p-2 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCustomQrImage(null);
                          if (typeof window !== 'undefined') {
                            localStorage.removeItem('bizbox_custom_qr_image');
                          }
                          showToast('Custom QR image removed.');
                        }}
                        className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition"
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-white rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition">
                      <QrCode className="w-8 h-8 text-indigo-500 mb-2" />
                      <span className="text-xs font-bold text-indigo-700">Click to Select QR Image</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Supports PNG, JPG, JPEG from your device</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              const b64 = reader.result as string;
                              setCustomQrImage(b64);
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('bizbox_custom_qr_image', b64);
                              }
                              showToast('Custom Standee QR uploaded!');
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (qrType === 'dynamic' && (!vpaInput.trim() || !vpaInput.includes('@'))) {
                      showToast('⚠️ Please enter a valid UPI VPA (e.g. name@bank)');
                      return;
                    }
                    setMerchantVpa(vpaInput.trim());
                    setMerchantName(nameInput.trim() || 'Brew Street Cafe');
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('bizbox_merchant_vpa', vpaInput.trim());
                      localStorage.setItem('bizbox_merchant_name', nameInput.trim() || 'Brew Street Cafe');
                      localStorage.setItem('bizbox_qr_type', qrType);
                    }
                    setShowUpiConfigModal(false);
                    showToast('✅ UPI & QR Settings saved successfully!');
                  }}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save & Apply Changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpiConfigModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL: Recall Held Orders                             */}
      {/* ======================================================== */}
      {showRecallModal && (
        <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col text-slate-800 border border-slate-200">
            <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <PlayCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Held Orders / Parked Tickets</h3>
                  <p className="text-[11px] text-slate-400">Restore order back to active cart</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRecallModal(false)}
                className="w-7 h-7 rounded-full bg-slate-200/80 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto space-y-3">
              {heldOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <PauseCircle className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">No orders currently on hold</p>
                  <p className="text-[11px] text-slate-400">
                    Use the "Hold" hotkey (F7) while ringing up an order to park it here.
                  </p>
                </div>
              ) : (
                heldOrders.map((h) => (
                  <div
                    key={h.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between hover:border-indigo-300 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded-md border border-indigo-200">
                          {h.id}
                        </span>
                        <span className="font-bold text-xs text-slate-900">
                          {h.selectedTable?.label ? `Table ${h.selectedTable.label}` : 'Counter'}
                        </span>
                        <span className="text-[10px] text-slate-400">· {h.heldAt}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        {h.order.items.map((i: any) => `${i.itemName} (x${i.qty})`).join(', ')}
                      </div>
                      <div className="text-xs font-black text-slate-900 font-mono">
                        ₹{h.order.totals.grandTotal.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRecallOrder(h)}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                      >
                        Recall
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDiscardHeldOrder(h.id)}
                        className="p-1.5 hover:bg-rose-100 text-rose-500 rounded-lg transition cursor-pointer"
                        title="Discard held order"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. MODAL: Apply Discount                                 */}
      {/* ======================================================== */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col text-slate-800 border border-slate-200">
            <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Order Discount</h3>
                  <p className="text-[11px] text-slate-400">Apply percentage discount to bill</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDiscountModal(false)}
                className="w-7 h-7 rounded-full bg-slate-200/80 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Quick Discount Presets
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { label: '5%', val: 5, code: 'LOYALTY5' },
                    { label: '10%', val: 10, code: 'HAPPY10' },
                    { label: '15%', val: 15, code: 'WEEKEND15' },
                    { label: '20%', val: 20, code: 'FESTIVE20' },
                    { label: '50%', val: 50, code: 'STAFF50' },
                  ].map((d) => (
                    <button
                      key={d.val}
                      type="button"
                      onClick={() => {
                        applyDiscount(d.code, d.val);
                        setShowDiscountModal(false);
                        showToast(`Applied ${d.label} Discount (${d.code})`);
                      }}
                      className="py-2.5 bg-slate-100 hover:bg-pink-50 hover:text-pink-700 hover:border-pink-300 font-mono text-xs font-bold text-slate-800 rounded-xl border border-slate-200 transition text-center"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Custom Discount Percentage (%)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={customDiscountPercent}
                    onChange={(e) => setCustomDiscountPercent(e.target.value)}
                    placeholder="e.g. 25"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const p = parseFloat(customDiscountPercent);
                      if (p > 0 && p <= 100) {
                        applyDiscount(`CUSTOM${p}`, p);
                        setShowDiscountModal(false);
                        showToast(`Applied ${p}% Discount!`);
                      } else {
                        showToast('⚠️ Please enter between 1% and 100%');
                      }
                    }}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {appliedDiscount && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-rose-600 font-bold">
                    Active: {appliedDiscount.code} ({appliedDiscount.percent}% off)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      removeDiscount();
                      setShowDiscountModal(false);
                      showToast('Discount removed.');
                    }}
                    className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs rounded-lg transition"
                  >
                    Remove Discount
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. MODAL: Kitchen Notes                                  */}
      {/* ======================================================== */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col text-slate-800 border border-slate-200">
            <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Order Kitchen Notes</h3>
                  <p className="text-[11px] text-slate-400">Cooking instructions for Chef & KDS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="w-7 h-7 rounded-full bg-slate-200/80 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Quick Cooking Instructions
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Less Sweet / No Sugar',
                    'Extra Hot / Piping Hot',
                    'Pack for Takeaway',
                    'Serve Water First',
                    'VIP Guest / Fast-track',
                    'Less Spicy',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setOrderNotes((prev) => (prev ? `${prev}, ${chip}` : chip));
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-800 text-[11px] font-semibold text-slate-700 rounded-lg border border-slate-200 transition"
                    >
                      +{chip}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Custom Kitchen Note
                </label>
                <textarea
                  rows={3}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Bring food together, oat milk separated, extra hot water..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                {orderNotes && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderNotes('');
                      setShowNotesModal(false);
                      showToast('Kitchen notes cleared.');
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowNotesModal(false);
                    showToast('Kitchen notes saved to order!');
                  }}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. MODAL: Split Bill                                     */}
      {/* ======================================================== */}
      {showSplitModal && (
        <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col text-slate-800 border border-slate-200">
            <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Split Bill Calculator</h3>
                  <p className="text-[11px] text-slate-400">Calculate equal share among guests</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSplitModal(false)}
                className="w-7 h-7 rounded-full bg-slate-200/80 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Total Order Value
                  </span>
                  <span className="text-[11px] text-slate-400">{order.items.length} items on ticket</span>
                </div>
                <span className="text-2xl font-black text-slate-900 font-mono">
                  ₹{order.totals.grandTotal.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Split Between How Many Guests?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setSplitCount(cnt)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        splitCount === cnt
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                      }`}
                    >
                      {cnt} Persons
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 text-center space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500 block">
                  Amount To Pay Per Person
                </span>
                <div className="text-3xl font-black text-indigo-700 font-mono">
                  ₹{(order.totals.grandTotal / splitCount).toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-indigo-200/60">
                  <div className="flex justify-between">
                    <span>Base Food Share:</span>
                    <span className="font-mono">₹{(order.totals.subtotal / splitCount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (CGST + SGST):</span>
                    <span className="font-mono">
                      ₹{((order.totals.cgst + order.totals.sgst) / splitCount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSplitModal(false);
                  showToast(`Bill split into ${splitCount} parts of ₹${(order.totals.grandTotal / splitCount).toFixed(2)} each`);
                }}
                className="w-full min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 10. MODAL: Transfer Table                                */}
      {/* ======================================================== */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col text-slate-800 border border-slate-200">
            <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Repeat className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Transfer Dining Table</h3>
                  <p className="text-[11px] text-slate-400">Currently assigned: Table {selectedTable?.label || 'T1'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="w-7 h-7 rounded-full bg-slate-200/80 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Select Destination Table
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 't-1', label: 'T1', guests: 2 },
                  { id: 't-2', label: 'T2', guests: 2 },
                  { id: 't-3', label: 'T3', guests: 4 },
                  { id: 't-4', label: 'T4', guests: 4 },
                  { id: 't-5', label: 'T5', guests: 6 },
                  { id: 't-6', label: 'T6', guests: 6 },
                  { id: 't-7', label: 'T7', guests: 2 },
                  { id: 't-8', label: 'T8', guests: 8 },
                ].map((tbl) => (
                  <button
                    key={tbl.id}
                    type="button"
                    onClick={() => {
                      setTable(tbl);
                      setShowTransferModal(false);
                      showToast(`Order transferred to Table ${tbl.label}!`);
                    }}
                    className={`py-3 rounded-xl border flex flex-col items-center justify-center transition ${
                      selectedTable?.label === tbl.label
                        ? 'bg-emerald-600 text-white border-emerald-600 font-black shadow-xs'
                        : 'bg-slate-50 text-slate-800 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <span className="text-base font-black font-mono">{tbl.label}</span>
                    <span className="text-[10px] opacity-75">{tbl.guests} Seats</span>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTable({ id: 'takeaway', label: 'TA', guests: 1 });
                    setShowTransferModal(false);
                    showToast('Order converted to Takeaway Counter!');
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition"
                >
                  Convert to Takeaway Counter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 11. MODAL: Thermal Receipt Print Preview (80mm ESC/POS)   */}
      {/* ======================================================== */}
      {showPrintBillModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            <div className="p-3.5 px-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-600" />
                <span className="font-extrabold text-xs text-slate-800">
                  {settleSuccess ? '80mm Thermal Receipt (Paid)' : '80mm Thermal Slip Preview'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPrintBillModal(false);
                  if (settleSuccess) {
                    clearCart();
                    setSettleSuccess(null);
                    showToast('Payment recorded · Ready for next order!');
                  }
                }}
                className="w-6 h-6 rounded-full bg-slate-200/80 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Printable Slip Container */}
            <div className="p-4 max-h-[75vh] overflow-y-auto bg-slate-100 flex justify-center">
              <div
                id="printable-thermal-receipt"
                className="bg-white text-slate-900 p-5 rounded-xl shadow-md w-full font-mono text-[11px] leading-tight border border-slate-300 select-text"
              >
                {/* Header */}
                <div className="text-center pb-2.5 border-b-2 border-dashed border-slate-400">
                  <h2 className="text-sm font-black tracking-wider uppercase">BREW STREET CAFE</h2>
                  <p className="text-[10px] text-slate-600 font-bold mt-0.5">
                    {branchReceiptDetails.name}
                  </p>
                  <p className="text-[9px] text-slate-500">
                    GSTIN: {branchReceiptDetails.gstin} | FSSAI: {branchReceiptDetails.fssai}
                  </p>
                  <p className="text-[9px] text-slate-500">{branchReceiptDetails.address}</p>
                  <p className="text-[9px] text-slate-500">Phone: {branchReceiptDetails.phone}</p>
                  <div className="mt-1.5">
                    {settleSuccess ? (
                      <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-[9px] uppercase tracking-wider rounded">
                        TAX INVOICE · PAID
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[9px] uppercase tracking-wider rounded">
                        PROFORMA BILL · UNPAID
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div className="py-2 space-y-0.5 border-b border-dashed border-slate-300 text-[10px] text-slate-600">
                  <div className="flex justify-between">
                    <span>{settleSuccess ? 'Invoice:' : 'Bill:'} <strong>#{settleSuccess ? settleSuccess.invoiceNo : (order.orderNo || 'T2-XXXX')}</strong></span>
                    <span>Table: <strong>{selectedTable?.label || 'T1'}</strong></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
                    <span>Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Guest: {selectedCustomer?.name || 'Walk-in Guest'}</span>
                    <span>Cashier: {(typeof window !== 'undefined' ? (localStorage.getItem('pos_active_staff')?.split(' ')[0] || 'suman') : 'suman')}</span>
                  </div>
                </div>

                {/* Line Items */}
                <div className="py-2.5 border-b-2 border-dashed border-slate-400">
                  <div className="flex justify-between font-bold text-[9px] uppercase text-slate-500 pb-1 border-b border-slate-200">
                    <span className="w-1/2">Item</span>
                    <span className="w-1/6 text-center">Qty</span>
                    <span className="w-1/3 text-right">Amount</span>
                  </div>
                  <div className="space-y-1 pt-1">
                    {order.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-[10px]">
                        <div className="w-1/2 pr-1">
                          <span className="font-semibold block truncate">{it.itemName}</span>
                          {it.variantName && it.variantName !== 'Standard' && (
                            <span className="text-[9px] text-slate-500">({it.variantName})</span>
                          )}
                        </div>
                        <span className="w-1/6 text-center font-bold">{it.qty}</span>
                        <span className="w-1/3 text-right font-bold">₹{it.lineTotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="py-2 space-y-1 text-[10px] border-b-2 border-dashed border-slate-400">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>₹{order.totals.subtotal.toFixed(2)}</span>
                  </div>
                  {order.totals.discountTotal > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>Discount</span>
                      <span>-₹{order.totals.discountTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (2.5%)</span>
                    <span>₹{order.totals.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (2.5%)</span>
                    <span>₹{order.totals.sgst.toFixed(2)}</span>
                  </div>
                  {order.totals.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Round Off</span>
                      <span>
                        {order.totals.roundOff > 0
                          ? `+₹${order.totals.roundOff.toFixed(2)}`
                          : `-₹${Math.abs(order.totals.roundOff).toFixed(2)}`}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-xs pt-1.5 border-t border-slate-300 text-slate-900">
                    <span>GRAND TOTAL</span>
                    <span>₹{order.totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* AFTER PAY (Settled) vs. BEFORE PAY (Unpaid Table Check) */}
                {settleSuccess ? (
                  /* POST-PAYMENT RECEIPT: NO QR CODE! Renders Payment Settlement Receipt */
                  <div className="py-2.5 px-2.5 my-2 border-y-2 border-dashed border-slate-400 bg-slate-50 space-y-1">
                    <div className="text-center font-black text-[11px] text-emerald-800 tracking-wider uppercase">
                      ✓ BILL PAID IN FULL
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-700">
                      <span>Payment Method:</span>
                      <strong className="uppercase font-bold text-slate-900">{paymentMode}</strong>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-700">
                      <span>Amount Received:</span>
                      <strong className="font-bold text-slate-900">₹{settleSuccess.amount.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-[10px] text-emerald-700 font-semibold">
                      <span>Balance Due:</span>
                      <strong className="font-mono">₹0.00 (NIL)</strong>
                    </div>
                    <div className="text-[9px] text-slate-400 text-center pt-0.5 font-mono">
                      Invoice #{settleSuccess.invoiceNo} · Settled
                    </div>
                  </div>
                ) : (
                  /* PRE-PAYMENT UNPAID BILL: Show UPI QR so guest can scan & pay at table */
                  <div className="py-2.5 text-center flex flex-col items-center border-b border-dashed border-slate-300">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Scan to Pay via UPI (Table Check)
                    </p>
                    <img
                      src={qrImageUrl}
                      alt="Bill UPI QR"
                      className="w-24 h-24 border border-slate-300 p-0.5 bg-white object-contain"
                    />
                    <p className="text-[8px] text-slate-500 font-mono mt-1">UPI: {merchantVpa}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="text-center pt-2 text-[9px] text-slate-500 space-y-0.5">
                  <p className="font-bold text-slate-700">Thank you for dining with us!</p>
                  <p>Visit again · Have a wonderful day</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                  if (settleSuccess) {
                    clearCart();
                    setSettleSuccess(null);
                    showToast('Receipt printed · Cart cleared for next order!');
                  }
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip (ESC/POS)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPrintBillModal(false);
                  if (settleSuccess) {
                    clearCart();
                    setSettleSuccess(null);
                    showToast('Payment recorded · Ready for next order!');
                  }
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 12. MODAL: Reprint Last Settled Bill                     */}
      {/* ======================================================== */}
      {showReprintModal && lastSettledBill && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            <div className="p-3.5 px-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                <span className="font-extrabold text-xs text-slate-800">Reprint Settled Receipt</span>
              </div>
              <button
                type="button"
                onClick={() => setShowReprintModal(false)}
                className="w-6 h-6 rounded-full bg-slate-200/80 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 max-h-[75vh] overflow-y-auto bg-slate-100 flex justify-center">
              <div className="bg-white text-slate-900 p-5 rounded-xl shadow-md w-full font-mono text-[11px] leading-tight border border-slate-300 select-text relative">
                {/* Duplicate Watermark */}
                <div className="absolute right-3 top-3 px-2 py-0.5 border border-rose-300 text-rose-500 font-black text-[9px] uppercase tracking-wider rounded">
                  DUPLICATE COPY
                </div>

                <div className="text-center pb-2.5 border-b-2 border-dashed border-slate-400">
                  <h2 className="text-sm font-black tracking-wider uppercase">BREW STREET CAFE</h2>
                  <p className="text-[10px] text-slate-600 font-bold mt-0.5">{lastSettledBill.outlet || branchReceiptDetails.name}</p>
                  <p className="text-[9px] text-slate-500">GSTIN: {branchReceiptDetails.gstin} | FSSAI: {branchReceiptDetails.fssai}</p>
                  <p className="text-[9px] text-slate-500">{branchReceiptDetails.address}</p>
                </div>

                <div className="py-2 space-y-0.5 border-b border-dashed border-slate-300 text-[10px] text-slate-600">
                  <div className="flex justify-between">
                    <span>Invoice: <strong>{lastSettledBill.invoiceNo}</strong></span>
                    <span>Table: <strong>{lastSettledBill.table}</strong></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date: {lastSettledBill.date}</span>
                    <span>Mode: <strong className="uppercase">{lastSettledBill.mode}</strong></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer: {lastSettledBill.customer}</span>
                    <span>Cashier: {lastSettledBill.cashier}</span>
                  </div>
                </div>

                <div className="py-2.5 border-b-2 border-dashed border-slate-400">
                  <div className="flex justify-between font-bold text-[9px] uppercase text-slate-500 pb-1 border-b border-slate-200">
                    <span className="w-1/2">Item</span>
                    <span className="w-1/6 text-center">Qty</span>
                    <span className="w-1/3 text-right">Amount</span>
                  </div>
                  <div className="space-y-1 pt-1">
                    {lastSettledBill.items.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-[10px]">
                        <span className="w-1/2 truncate font-semibold">{it.itemName}</span>
                        <span className="w-1/6 text-center font-bold">{it.qty}</span>
                        <span className="w-1/3 text-right font-bold">
                          ₹{((it.unitPrice || 0) * it.qty).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="py-2 space-y-1 text-[10px] border-b-2 border-dashed border-slate-400">
                  <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300 text-slate-900">
                    <span>PAID TOTAL</span>
                    <span>₹{Number(lastSettledBill.amount).toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-center pt-2 text-[9px] text-slate-500">
                  <p className="font-bold text-slate-700">Thank you for dining with us!</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Duplicate Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReprintModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 13. FLOATING TOAST NOTIFICATION                          */}
      {/* ======================================================== */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl border border-indigo-500/50 shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

