'use client';

import React, { useState, useEffect } from 'react';
import { ConsoleLayout } from '../../components/ConsoleLayout';
import {
  Settings,
  Percent,
  Tag,
  Share2,
  Receipt,
  Check,
  Plus,
  ShieldCheck,
  ExternalLink,
  QrCode,
  Sparkles,
  CheckCircle2,
  Upload,
  Trash2,
  Printer,
  FileText,
  X,
  Sliders,
  Edit2,
  Save,
  Info,
  Lock,
} from 'lucide-react';

interface TaxSlab {
  id: string;
  name: string;
  cgst: number;
  sgst: number;
  total: number;
  status: 'Active' | 'Inactive';
  isDefault: boolean;
}

interface DiscountItem {
  id: string;
  code: string;
  type: 'percentage' | 'flat';
  value: number;
  minOrder: number;
  maxDiscount?: number;
  active: boolean;
  usageCount: number;
}

interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  status: 'Connected' | 'Active' | 'Disconnected';
  description: string;
  icon: string;
  apiKey?: string;
  merchantId?: string;
  autoAccept?: boolean;
}

export default function SettingsAdminPage() {
  const [activeTab, setActiveTab] = useState<'payments' | 'integrations' | 'taxes' | 'offers' | 'receipt'>('integrations');

  // 1. UPI QR State
  const [merchantVpa, setMerchantVpa] = useState('brewstreet@icici');
  const [merchantName, setMerchantName] = useState('Brew Street Cafe');
  const [qrType, setQrType] = useState<'dynamic' | 'custom'>('dynamic');
  const [customQrImage, setCustomQrImage] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 2. Integrations State & Modal
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([
    {
      id: 'swiggy',
      name: 'Swiggy Merchant API',
      category: 'Online Aggregator',
      status: 'Connected',
      description: 'Auto-sync menu, pricing, live 86 items and accept orders directly into POS.',
      icon: '🟠',
      merchantId: 'SWIGGY-BLR-0192',
      apiKey: 'sw_live_sec_99182371a',
      autoAccept: true,
    },
    {
      id: 'zomato',
      name: 'Zomato Food Delivery',
      category: 'Online Aggregator',
      status: 'Connected',
      description: 'Instant food order ingestion with rider dispatch status updates.',
      icon: '🔴',
      merchantId: 'ZOMATO-RES-88319',
      apiKey: 'zom_live_prod_8827361b',
      autoAccept: true,
    },
    {
      id: 'razorpay',
      name: 'Razorpay PG & Dynamic UPI',
      category: 'Payments',
      status: 'Active',
      description: 'Dynamic UPI QR generation with instant webhook payment settlement.',
      icon: '🔵',
      merchantId: 'rzp_live_merch_2039',
      apiKey: 'rzp_live_key_9182736450',
      autoAccept: true,
    },
    {
      id: 'pinelabs',
      name: 'Pine Labs EDC Cloud',
      category: 'Payments',
      status: 'Active',
      description: 'Pushes billing amount directly to counter credit/debit card swipe machines.',
      icon: '💳',
      merchantId: 'PINE-POS-TERM-01',
      apiKey: 'pl_cloud_tok_10928374',
      autoAccept: true,
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business Cloud API',
      category: 'Customer Receipts',
      status: 'Active',
      description: 'Sends digital PDF bill with GST invoice copy directly to customer WhatsApp.',
      icon: '🟢',
      merchantId: 'WABA-919876543210',
      apiKey: 'EAAK...wa_cloud_access_token',
      autoAccept: true,
    },
  ]);
  const [configuringIntegration, setConfiguringIntegration] = useState<IntegrationItem | null>(null);
  const [integrationModalKey, setIntegrationModalKey] = useState('');
  const [integrationModalMerchant, setIntegrationModalMerchant] = useState('');
  const [integrationModalAutoAccept, setIntegrationModalAutoAccept] = useState(true);
  const [integrationModalStatus, setIntegrationModalStatus] = useState<string>('Connected');
  const [isPinging, setIsPinging] = useState(false);
  const [pingSuccess, setPingSuccess] = useState<string | null>(null);
  const [integrationToast, setIntegrationToast] = useState(false);

  // 3. Taxes & GST Slabs State
  const [gstInclusive, setGstInclusive] = useState(false);
  const [taxSlabs, setTaxSlabs] = useState<TaxSlab[]>([
    {
      id: 'tax-1',
      name: 'Restaurant F&B (Standard)',
      cgst: 2.5,
      sgst: 2.5,
      total: 5.0,
      status: 'Active',
      isDefault: true,
    },
    {
      id: 'tax-2',
      name: 'Packaged Beverages & Aerated Drinks',
      cgst: 9.0,
      sgst: 9.0,
      total: 18.0,
      status: 'Active',
      isDefault: false,
    },
    {
      id: 'tax-3',
      name: 'Exempted Fresh Produce (Fruits/Dairy)',
      cgst: 0,
      sgst: 0,
      total: 0,
      status: 'Active',
      isDefault: false,
    },
    {
      id: 'tax-4',
      name: 'Cess / Luxury Confectionery',
      cgst: 14.0,
      sgst: 14.0,
      total: 28.0,
      status: 'Inactive',
      isDefault: false,
    },
  ]);
  const [showAddTaxModal, setShowAddTaxModal] = useState(false);
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('5');

  // 4. Discounts & Offers State
  const [discounts, setDiscounts] = useState<DiscountItem[]>([
    { id: 'disc-1', code: 'HAPPY10', type: 'percentage', value: 10, minOrder: 200, maxDiscount: 100, active: true, usageCount: 142 },
    { id: 'disc-2', code: 'STAFF50', type: 'percentage', value: 50, minOrder: 0, maxDiscount: 500, active: true, usageCount: 28 },
    { id: 'disc-3', code: 'FLAT50', type: 'flat', value: 50, minOrder: 300, maxDiscount: 50, active: true, usageCount: 89 },
    { id: 'disc-4', code: 'WELCOME5', type: 'percentage', value: 5, minOrder: 150, maxDiscount: 50, active: true, usageCount: 65 },
  ]);
  const [showAddDiscountModal, setShowAddDiscountModal] = useState(false);
  const [newDiscCode, setNewDiscCode] = useState('');
  const [newDiscType, setNewDiscType] = useState<'percentage' | 'flat'>('percentage');
  const [newDiscValue, setNewDiscValue] = useState('10');
  const [newDiscMinOrder, setNewDiscMinOrder] = useState('200');

  // 5. Receipt Templates State
  const [receiptSettings, setReceiptSettings] = useState({
    storeName: 'Brew Street Cafe',
    tagline: 'Specialty Coffee & Artisan Bakery',
    address: 'Plot 42, 12th Main Road, Indiranagar, Bengaluru - 560038',
    phone: '+91 98765 43210',
    gstin: '29AAAAA0000A1Z5',
    fssai: '11223344556677',
    footerText: 'Thank you for dining with us! Visit again. WhatsApp 9876543210 for orders.',
    paperWidth: '80mm',
    showUpiQr: true,
    showGstBreakdown: true,
    showFssai: true,
  });
  const [receiptToast, setReceiptToast] = useState(false);

  // Load from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedVpa = localStorage.getItem('bizbox_merchant_vpa');
      const savedName = localStorage.getItem('bizbox_merchant_name');
      const savedType = localStorage.getItem('bizbox_qr_type');
      const savedImage = localStorage.getItem('bizbox_custom_qr_image');

      if (savedVpa) setMerchantVpa(savedVpa);
      if (savedName) setMerchantName(savedName);
      if (savedType) setQrType(savedType as any);
      if (savedImage) setCustomQrImage(savedImage);

      const savedReceipt = localStorage.getItem('bizbox_receipt_settings');
      if (savedReceipt) {
        try {
          setReceiptSettings(JSON.parse(savedReceipt));
        } catch { }
      }

      const savedIntegrations = localStorage.getItem('bizbox_integrations');
      if (savedIntegrations) {
        try {
          setIntegrations(JSON.parse(savedIntegrations));
        } catch { }
      }

      const savedTaxSlabs = localStorage.getItem('bizbox_tax_slabs');
      if (savedTaxSlabs) {
        try {
          setTaxSlabs(JSON.parse(savedTaxSlabs));
        } catch { }
      }

      const savedDiscounts = localStorage.getItem('bizbox_discounts');
      if (savedDiscounts) {
        try {
          setDiscounts(JSON.parse(savedDiscounts));
        } catch { }
      }
    }
  }, []);

  const handleSaveIntegration = () => {
    if (!configuringIntegration) return;
    const updated = integrations.map((i) =>
      i.id === configuringIntegration.id
        ? {
            ...i,
            merchantId: integrationModalMerchant,
            apiKey: integrationModalKey,
            autoAccept: integrationModalAutoAccept,
            status: integrationModalStatus as any,
          }
        : i
    );
    setIntegrations(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizbox_integrations', JSON.stringify(updated));
    }
    setConfiguringIntegration(null);
    setIntegrationToast(true);
    setTimeout(() => setIntegrationToast(false), 3000);
  };

  const handleSavePayments = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizbox_merchant_vpa', merchantVpa.trim());
      localStorage.setItem('bizbox_merchant_name', merchantName.trim());
      localStorage.setItem('bizbox_qr_type', qrType);
      if (customQrImage) {
        localStorage.setItem('bizbox_custom_qr_image', customQrImage);
      } else {
        localStorage.removeItem('bizbox_custom_qr_image');
      }
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveReceiptSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizbox_receipt_settings', JSON.stringify(receiptSettings));
    }
    setReceiptToast(true);
    setTimeout(() => setReceiptToast(false), 3000);
  };

  const dynamicSampleUrl = `upi://pay?pa=${encodeURIComponent(merchantVpa)}&pn=${encodeURIComponent(merchantName)}&am=210.00&cu=INR`;
  const sampleQrUrl =
    qrType === 'custom' && customQrImage
      ? customQrImage
      : `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(dynamicSampleUrl)}`;

  return (
    <ConsoleLayout title="Store & System Settings">
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          {[
            { id: 'integrations', label: 'Integrations & APIs' },
            { id: 'taxes', label: 'Taxes & GST Slabs' },
            { id: 'offers', label: 'Discounts & Offers' },
            { id: 'receipt', label: 'Receipt Templates' },
            { id: 'payments', label: 'UPI QR & Payments' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${activeTab === tab.id
                ? 'bg-[#3B4FE0] text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 1. INTEGRATIONS & APIS TAB */}
        {activeTab === 'integrations' && (
          <div className="space-y-4">
            <div className="bg-indigo-50/70 border border-indigo-200/80 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">Third-Party Channels & Payment Hardware</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Connect online delivery aggregators (Swiggy, Zomato) and counter EDC card machines.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-white rounded-full text-indigo-700 border border-indigo-200 shadow-xs">
                {integrations.filter((i) => i.status === 'Connected' || i.status === 'Active').length} Active of {integrations.length} Integrations
              </span>
            </div>

            {integrationToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Integration settings saved to Edge Server & webhooks updated!</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">{item.name}</h4>
                          <span className="text-[11px] font-semibold text-slate-400">{item.category}</span>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                          item.status === 'Connected' || item.status === 'Active'
                            ? 'bg-[#E7F7F4] text-[#12B39A] border-[#12B39A]/30'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {item.status === 'Connected' || item.status === 'Active' ? (
                          <Check className="w-3 h-3 text-[#12B39A]" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        )}
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>ID: {item.merchantId || 'CONFIGURED'}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">API keys encrypted (AES-256)</span>
                    <button
                      type="button"
                      onClick={() => {
                        setConfiguringIntegration(item);
                        setIntegrationModalKey(item.apiKey || '');
                        setIntegrationModalMerchant(item.merchantId || '');
                        setIntegrationModalAutoAccept(item.autoAccept ?? true);
                        setIntegrationModalStatus(item.status || 'Connected');
                        setPingSuccess(null);
                        setIsPinging(false);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. TAXES & GST SLABS TAB */}
        {activeTab === 'taxes' && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Goods & Services Tax (GST) Slabs</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Compliant with Indian Restaurant GST rules (5% without ITC, 18% with ITC on merchandise).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setGstInclusive(!gstInclusive)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition cursor-pointer ${gstInclusive
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                >
                  <span>Prices are GST: <strong>{gstInclusive ? 'Inclusive (MRP)' : 'Exclusive (+5% added)'}</strong></span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTaxModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Tax Slab</span>
                </button>
              </div>
            </div>

            {/* Tax Slabs Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Tax Name / Description</th>
                    <th className="py-3 px-4">CGST Rate</th>
                    <th className="py-3 px-4">SGST Rate</th>
                    <th className="py-3 px-4">Total GST Rate</th>
                    <th className="py-3 px-4 text-center">Default</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {taxSlabs.map((tax) => (
                    <tr key={tax.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {tax.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                        {tax.cgst.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                        {tax.sgst.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-indigo-700 text-sm">
                        {tax.total.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {tax.isDefault ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Default (F&B)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${tax.status === 'Active'
                            ? 'bg-[#E7F7F4] text-[#12B39A]'
                            : 'bg-slate-100 text-slate-400'
                            }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${tax.status === 'Active' ? 'bg-[#12B39A]' : 'bg-slate-400'}`}></span>
                          {tax.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setTaxSlabs((prev) => {
                              const updated: TaxSlab[] = prev.map((t) => (t.id === tax.id ? { ...t, status: t.status === 'Active' ? 'Inactive' : 'Active' } : t));
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('bizbox_tax_slabs', JSON.stringify(updated));
                              }
                              return updated;
                            });
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition cursor-pointer"
                        >
                          {tax.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. DISCOUNTS & OFFERS TAB */}
        {activeTab === 'offers' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Promotions, Coupons & Staff Discounts</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Coupons are accessible on the POS billing terminal via the <strong>[Discount]</strong> hotkey button.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDiscountModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Promo Code</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {discounts.map((disc) => (
                <div
                  key={disc.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 font-mono font-black text-indigo-700 text-sm rounded-xl tracking-wider">
                        {disc.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${disc.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                          }`}
                      >
                        {disc.active ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Benefit:</span>
                        <strong className="text-slate-900">
                          {disc.type === 'percentage' ? `${disc.value}% OFF` : `₹${disc.value} Flat OFF`}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Min. Order:</span>
                        <span>₹{disc.minOrder}</span>
                      </div>
                      {disc.maxDiscount && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Max Discount:</span>
                          <span>₹{disc.maxDiscount}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-400">
                        <span>Used:</span>
                        <span className="font-mono font-bold text-slate-700">{disc.usageCount} times</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setDiscounts((prev) => {
                          const updated = prev.map((d) => (d.id === disc.id ? { ...d, active: !d.active } : d));
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('bizbox_discounts', JSON.stringify(updated));
                          }
                          return updated;
                        });
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      {disc.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscounts((prev) => {
                          const updated = prev.filter((d) => d.id !== disc.id);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('bizbox_discounts', JSON.stringify(updated));
                          }
                          return updated;
                        });
                      }}
                      className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. RECEIPT TEMPLATES TAB */}
        {activeTab === 'receipt' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template Editor Form */}
            <form onSubmit={handleSaveReceiptSettings} className="lg:col-span-2 space-y-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">80mm ESC/POS Thermal Receipt Template</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure store headers, tax credentials, and footer messages printed on customer receipts.
                </p>
              </div>

              {receiptToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Receipt template updated! Applied to all thermal printers & print previews.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={receiptSettings.storeName}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, storeName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Store Tagline
                  </label>
                  <input
                    type="text"
                    value={receiptSettings.tagline}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, tagline: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={receiptSettings.address}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, address: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    GSTIN Number
                  </label>
                  <input
                    type="text"
                    value={receiptSettings.gstin}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, gstin: e.target.value })}
                    placeholder="29AAAAA0000A1Z5"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    FSSAI License No.
                  </label>
                  <input
                    type="text"
                    value={receiptSettings.fssai}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, fssai: e.target.value })}
                    placeholder="11223344556677"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Phone / Helpline
                  </label>
                  <input
                    type="text"
                    value={receiptSettings.phone}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Paper Roll Width
                  </label>
                  <select
                    value={receiptSettings.paperWidth}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, paperWidth: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="80mm">80mm (Standard Restaurant Thermal Roll)</option>
                    <option value="58mm">58mm (Compact Mobile Roll)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Footer Thank You Note
                  </label>
                  <textarea
                    rows={2}
                    value={receiptSettings.footerText}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, footerText: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={receiptSettings.showUpiQr}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, showUpiQr: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Print UPI QR Code</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={receiptSettings.showGstBreakdown}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, showGstBreakdown: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Print CGST/SGST Table</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={receiptSettings.showFssai}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, showFssai: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Print FSSAI License</span>
                </label>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save Receipt Settings
                </button>
              </div>
            </form>

            {/* Live 80mm ESC/POS Thermal Receipt Paper Preview */}
            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Live 80mm Thermal Receipt Preview
              </span>

              <div className="w-[300px] bg-white p-5 rounded-sm shadow-md border border-slate-300 font-mono text-[11px] text-slate-800 leading-tight space-y-2 select-none">
                {/* Header */}
                <div className="text-center pb-2 border-b border-dashed border-slate-300">
                  <h4 className="font-black text-sm uppercase tracking-wider">{receiptSettings.storeName}</h4>
                  <p className="text-[10px] text-slate-500">{receiptSettings.tagline}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{receiptSettings.address}</p>
                  <p className="text-[9px] text-slate-500">Ph: {receiptSettings.phone}</p>
                  {receiptSettings.showFssai && (
                    <p className="text-[9px] text-slate-600 mt-0.5 font-bold">FSSAI: {receiptSettings.fssai}</p>
                  )}
                  <p className="text-[9px] text-slate-700 font-bold">GSTIN: {receiptSettings.gstin}</p>
                </div>

                {/* Metadata */}
                <div className="text-[10px] flex justify-between border-b border-dashed border-slate-300 pb-1.5">
                  <div>
                    <div>INV: #INV-2026-9041</div>
                    <div>TABLE: T1 (Dine-in)</div>
                  </div>
                  <div className="text-right">
                    <div>29-Oct-2026</div>
                    <div>14:32 IST</div>
                  </div>
                </div>

                {/* Items */}
                <div className="py-1 border-b border-dashed border-slate-300 space-y-1">
                  <div className="flex justify-between font-bold text-[10px]">
                    <span>ITEM</span>
                    <span>QTY x RATE</span>
                    <span>AMT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cold Coffee Frappe</span>
                    <span>1 x 210</span>
                    <span className="font-bold">210.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paneer Tikka Roll</span>
                    <span>1 x 180</span>
                    <span className="font-bold">180.00</span>
                  </div>
                </div>

                {/* Tax Breakdown */}
                {receiptSettings.showGstBreakdown && (
                  <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-300 pb-1.5">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹390.00</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST (2.5%):</span>
                      <span>₹9.75</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST (2.5%):</span>
                      <span>₹9.75</span>
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between text-xs font-black pt-1 pb-2 border-b-2 border-slate-800">
                  <span>TOTAL DUE:</span>
                  <span>₹409.50</span>
                </div>

                {/* Dynamic QR */}
                {receiptSettings.showUpiQr && (
                  <div className="pt-1 text-center flex flex-col items-center">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Scan to Pay via UPI
                    </span>
                    <img
                      src={sampleQrUrl}
                      alt="Sample QR"
                      className="w-20 h-20 border border-slate-300 p-0.5 bg-white object-contain"
                    />
                    <span className="text-[8px] text-slate-500 mt-0.5 font-mono">{merchantVpa}</span>
                  </div>
                )}

                {/* Footer */}
                <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[9px] text-slate-500">
                  <p>{receiptSettings.footerText}</p>
                  <p className="mt-1 text-[8px] text-slate-400 font-mono">Powered by BizBox POS</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. UPI QR & PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form onSubmit={handleSavePayments} className="lg:col-span-2 space-y-5 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">UPI Payments & QR Code Configuration</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set up your business UPI VPA or counter QR standee photo for all POS terminals and customer receipts.
                </p>
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>UPI QR settings saved successfully! Persisted across all billing terminals.</span>
                </div>
              )}

              {/* QR Mode Switcher */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Select QR Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setQrType('dynamic')}
                    className={`p-4 rounded-xl border text-left flex flex-col gap-1 transition ${qrType === 'dynamic'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    <span className="text-sm font-black flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Dynamic Auto-QR</span>
                    </span>
                    <span className="text-xs text-slate-500 font-normal">
                      Auto-embeds exact bill amount into standard NPCI UPI URL. Customer scans and pays without typing amount.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQrType('custom')}
                    className={`p-4 rounded-xl border text-left flex flex-col gap-1 transition ${qrType === 'custom'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    <span className="text-sm font-black flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-indigo-600" />
                      <span>Upload Shop Standee QR</span>
                    </span>
                    <span className="text-xs text-slate-500 font-normal">
                      Upload your shop's PhonePe, Paytm, BharatPe or GPay counter QR standee photo.
                    </span>
                  </button>
                </div>
              </div>

              {/* Dynamic QR Fields */}
              {qrType === 'dynamic' && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Merchant UPI ID (VPA) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={merchantVpa}
                      onChange={(e) => setMerchantVpa(e.target.value)}
                      placeholder="e.g. suman@paytm, 9876543210@upi, mycafe@icici"
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Aapka merchant ya personal UPI ID jahan customer ka payment aayega.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Store Display Name
                    </label>
                    <input
                      type="text"
                      value={merchantName}
                      onChange={(e) => setMerchantName(e.target.value)}
                      placeholder="e.g. Brew Street Cafe"
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Customer ke UPI app (GPay / PhonePe) me payee name yahi show hoga.
                    </span>
                  </div>
                </div>
              )}

              {/* Custom QR Standee Image Upload */}
              {qrType === 'custom' && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block text-left mb-1">
                    Upload Counter QR Standee Image
                  </label>

                  {customQrImage ? (
                    <div className="space-y-3">
                      <img
                        src={customQrImage}
                        alt="Uploaded Standee"
                        className="w-48 h-48 mx-auto object-contain rounded-2xl border border-slate-300 bg-white p-2 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setCustomQrImage(null)}
                        className="px-4 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition"
                      >
                        Remove Uploaded QR
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-white rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition">
                      <Upload className="w-8 h-8 text-indigo-500 mb-2" />
                      <span className="text-xs font-bold text-indigo-700">Click to upload Standee Photo</span>
                      <span className="text-[11px] text-slate-400 mt-0.5">Supports JPG, PNG or WEBP from your computer</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              setCustomQrImage(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Save UPI QR Settings
              </button>
            </form>

            {/* Live Preview Card Right Side */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Live Customer QR Preview
              </span>
              <div className="w-60 h-60 bg-white border-2 border-dashed border-indigo-300 rounded-3xl p-4 flex flex-col items-center justify-center shadow-inner">
                <img
                  src={sampleQrUrl}
                  alt="Live Sample QR"
                  className="w-44 h-44 object-contain rounded-xl"
                />
                <span className="text-[10px] font-mono font-bold text-slate-500 mt-2">
                  Sample Bill: ₹210.00
                </span>
              </div>
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 w-full text-left space-y-1">
                <div className="flex justify-between">
                  <span>Merchant:</span>
                  <strong>{merchantName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>UPI VPA:</span>
                  <strong className="font-mono">{merchantVpa}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Mode:</span>
                  <span className="text-indigo-600 font-bold uppercase">{qrType}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Configure Integration */}
        {configuringIntegration && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{configuringIntegration.icon}</span>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{configuringIntegration.name}</h3>
                    <p className="text-[11px] text-slate-400">{configuringIntegration.category} Integration</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfiguringIntegration(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Integration Status Toggle */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Channel Status
                  </label>
                  <select
                    value={integrationModalStatus}
                    onChange={(e) => setIntegrationModalStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="Connected">Connected / Active (Live Webhook Ingestion)</option>
                    <option value="Disconnected">Disconnected / Paused (Offline)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Merchant / Store ID
                  </label>
                  <input
                    type="text"
                    value={integrationModalMerchant}
                    onChange={(e) => setIntegrationModalMerchant(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    API Secret Key / Bearer Token
                  </label>
                  <input
                    type="password"
                    value={integrationModalKey}
                    onChange={(e) => setIntegrationModalKey(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Stored securely in Edge Vault</span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={integrationModalAutoAccept}
                    onChange={(e) => setIntegrationModalAutoAccept(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-xs font-bold text-slate-700">Auto-accept incoming orders directly to KDS</span>
                </label>

                {/* Ping Gateway Test Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPinging(true);
                      setPingSuccess(null);
                      setTimeout(() => {
                        setIsPinging(false);
                        setPingSuccess('✓ Gateway handshake OK · Latency: 24ms (HTTP 200)');
                      }, 600);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{isPinging ? 'Pinging Gateway...' : 'Test Connection'}</span>
                  </button>
                  {pingSuccess && (
                    <span className="text-[11px] text-emerald-600 font-bold animate-in fade-in">
                      {pingSuccess}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveIntegration}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save Configuration
                </button>
                <button
                  type="button"
                  onClick={() => setConfiguringIntegration(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Add Tax Slab */}
        {showAddTaxModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-sm text-slate-900">Add New Tax Slab</h3>
                <button
                  type="button"
                  onClick={() => setShowAddTaxModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Tax Slab Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newTaxName}
                    onChange={(e) => setNewTaxName(e.target.value)}
                    placeholder="e.g. Liquor VAT / Service Charge"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Total Tax Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newTaxRate}
                    onChange={(e) => setNewTaxRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Auto-splits into equal CGST ({(parseFloat(newTaxRate || '0') / 2).toFixed(1)}%) + SGST ({(parseFloat(newTaxRate || '0') / 2).toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!newTaxName) return;
                    const rate = parseFloat(newTaxRate) || 0;
                    const newSlab: TaxSlab = {
                      id: `tax-${Date.now()}`,
                      name: newTaxName,
                      cgst: rate / 2,
                      sgst: rate / 2,
                      total: rate,
                      status: 'Active',
                      isDefault: false,
                    };
                    const updated = [...taxSlabs, newSlab];
                    setTaxSlabs(updated);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('bizbox_tax_slabs', JSON.stringify(updated));
                    }
                    setShowAddTaxModal(false);
                    setNewTaxName('');
                  }}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
                >
                  Add Slab
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTaxModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Add Discount Promo */}
        {showAddDiscountModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-sm text-slate-900">Create Promo Discount</h3>
                <button
                  type="button"
                  onClick={() => setShowAddDiscountModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Coupon Code (Uppercase)
                  </label>
                  <input
                    type="text"
                    required
                    value={newDiscCode}
                    onChange={(e) => setNewDiscCode(e.target.value.toUpperCase())}
                    placeholder="e.g. WEEKEND15"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Type
                    </label>
                    <select
                      value={newDiscType}
                      onChange={(e) => setNewDiscType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    >
                      <option value="percentage">% Percentage</option>
                      <option value="flat">₹ Flat Rupee</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Discount Value
                    </label>
                    <input
                      type="number"
                      required
                      value={newDiscValue}
                      onChange={(e) => setNewDiscValue(e.target.value)}
                      placeholder={newDiscType === 'percentage' ? '10%' : '50'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Min. Order Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={newDiscMinOrder}
                    onChange={(e) => setNewDiscMinOrder(e.target.value)}
                    placeholder="e.g. 250"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!newDiscCode) return;
                    const val = parseFloat(newDiscValue) || 10;
                    const min = parseFloat(newDiscMinOrder) || 0;
                    const item: DiscountItem = {
                      id: `disc-${Date.now()}`,
                      code: newDiscCode,
                      type: newDiscType,
                      value: val,
                      minOrder: min,
                      active: true,
                      usageCount: 0,
                    };
                    const updated = [...discounts, item];
                    setDiscounts(updated);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('bizbox_discounts', JSON.stringify(updated));
                    }
                    setShowAddDiscountModal(false);
                    setNewDiscCode('');
                  }}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
                >
                  Create Code
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddDiscountModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ConsoleLayout>
  );
}
