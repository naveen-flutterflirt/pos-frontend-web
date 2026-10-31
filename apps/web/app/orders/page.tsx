'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ConsoleLayout } from '../../components/ConsoleLayout';
import { useOutlet } from '../../context/OutletContext';
import { exportToCsv, exportToPdf } from '../../lib/exportUtils';
import { getApiBaseUrl } from '../../lib/config';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import {
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  RotateCcw,
  Receipt,
  X,
  CreditCard,
  QrCode,
  Banknote,
  Printer,
  FileText,
  RefreshCw,
  Radio,
} from 'lucide-react';

interface OrderRecord {
  id: string;
  orderNo: string;
  invoiceNo: string;
  channel: 'pos' | 'swiggy' | 'zomato' | 'ondc';
  tableOrToken: string;
  customerName: string;
  phone: string;
  itemsCount: number;
  itemsSummary: string;
  subtotal: number;
  gstTotal: number;
  grandTotal: number;
  paymentMode: 'upi' | 'cash' | 'card';
  status: 'settled' | 'preparing' | 'voided' | 'refunded';
  time: string;
  items?: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    notes?: string;
  }>;
}

export default function OrdersAdminPage() {
  const { selectedOutlet } = useOutlet();
  const outletCode = selectedOutlet?.code?.toUpperCase() || 'BLR01';
  const [search, setSearch] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'pos' | 'swiggy' | 'zomato' | 'ondc'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'settled' | 'preparing' | 'refunded'>('all');
  const [inspectingOrder, setInspectingOrder] = useState<OrderRecord | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOrdersFromApi = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/orders`);
      if (res.ok) {
        const json = await res.json();
        setIsLiveConnected(true);
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          const apiRecords: OrderRecord[] = json.data.map((item: any) => {
            const ch = (item.channel || 'pos').toLowerCase();
            const validCh = (['pos', 'swiggy', 'zomato', 'ondc'].includes(ch) ? ch : 'pos') as OrderRecord['channel'];

            let st: OrderRecord['status'] = 'preparing';
            if (item.status === 'settled') st = 'settled';
            else if (item.status === 'fired') st = 'preparing';

            const itemsArr = Array.isArray(item.items) ? item.items : [];
            const itemsSummary = itemsArr.length > 0
              ? itemsArr.map((it: any) => `${it.qty}x ${it.name}`).join(', ')
              : 'Counter items';

            const formattedTime = item.created_at
              ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '12:00 PM';

            const outletPrefix = selectedOutlet?.code || 'BLR01';
            const invNo = `${outletPrefix}-${item.order_no || 'T2-0000'}`;

            return {
              id: item.id,
              orderNo: item.order_no || `ORD-${item.id.slice(-4)}`,
              invoiceNo: invNo,
              channel: validCh,
              tableOrToken: item.table_label ? `Table ${item.table_label}` : (validCh !== 'pos' ? `Token #${(item.order_no || '').slice(-4)}` : 'Counter'),
              customerName: item.customer_name || 'Walk-in Guest',
              phone: item.customer_phone || '—',
              itemsCount: parseInt(item.item_count) || (itemsArr.length > 0 ? itemsArr.length : 1),
              itemsSummary,
              subtotal: parseFloat(item.subtotal) || 0,
              gstTotal: parseFloat(item.tax_total) || 0,
              grandTotal: parseFloat(item.grand_total) || 0,
              paymentMode: 'upi',
              status: st,
              time: formattedTime,
              items: itemsArr,
            };
          });

          // Local settled fallback from POS
          let localSettled: OrderRecord[] = [];
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem('bizbox_settled_orders');
              if (raw) {
                const parsed = JSON.parse(raw);
                localSettled = parsed.map((o: any) => ({
                  id: o.id || `loc-${o.orderNo}`,
                  orderNo: o.orderNo,
                  invoiceNo: o.invoiceNo || `${selectedOutlet?.code || 'BLR01'}-${o.orderNo}`,
                  channel: (o.channel || 'pos') as OrderRecord['channel'],
                  tableOrToken: o.tableOrToken || 'Counter',
                  customerName: o.customerName || 'Walk-in Guest',
                  phone: o.phone || '—',
                  itemsCount: o.itemsCount || 1,
                  itemsSummary: o.itemsSummary || 'Counter items',
                  subtotal: parseFloat(o.subtotal) || 0,
                  gstTotal: parseFloat(o.gstTotal) || 0,
                  grandTotal: parseFloat(o.grandTotal) || 0,
                  paymentMode: (o.paymentMode || 'upi') as OrderRecord['paymentMode'],
                  status: 'settled' as const,
                  time: o.time || 'Just now',
                }));
              }
            } catch (err) {
              console.warn('Error reading local settled orders:', err);
            }
          }

          // Deduplicate
          const map = new Map<string, OrderRecord>();
          apiRecords.forEach((r) => map.set(r.orderNo, r));
          localSettled.forEach((r) => {
            if (!map.has(r.orderNo)) map.set(r.orderNo, r);
          });
          

          setOrders(Array.from(map.values()));
        }
      } else {
        setIsLiveConnected(false);
      }
    } catch (e) {
      setIsLiveConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedOutlet]);

  useEffect(() => {
    setIsLoading(true);
    fetchOrdersFromApi();
    const interval = setInterval(fetchOrdersFromApi, 6000);

    const onKot = () => fetchOrdersFromApi();
    const onSettled = () => fetchOrdersFromApi();

    window.addEventListener('bizbox_kot_fired', onKot);
    window.addEventListener('bizbox_order_settled', onSettled);

    return () => {
      clearInterval(interval);
      window.removeEventListener('bizbox_kot_fired', onKot);
      window.removeEventListener('bizbox_order_settled', onSettled);
    };
  }, [fetchOrdersFromApi]);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNo.toLowerCase().includes(search.toLowerCase()) ||
      o.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.phone.includes(search);

    const matchesChannel = selectedChannel === 'all' || o.channel === selectedChannel;
    const matchesStatus = selectedStatus === 'all' || o.status === selectedStatus;

    return matchesSearch && matchesChannel && matchesStatus;
  });

  return (
    <ConsoleLayout title="Orders & Invoices">
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full md:w-auto flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by order #, invoice #, customer name, or phone..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#3B4FE0] focus:bg-white transition"
              />
            </div>

            {/* Channel filter tabs */}
            <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              {(['all', 'pos', 'swiggy', 'zomato', 'ondc'] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setSelectedChannel(ch)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition ${
                    selectedChannel === ch
                      ? 'bg-white text-[#3B4FE0] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ch === 'all' ? 'All Channels' : ch}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Live Status indicator */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLiveConnected ? 'bg-[#12B39A]' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isLiveConnected ? 'bg-[#12B39A]' : 'bg-amber-500'}`}></span>
              </span>
              <span>{isLiveConnected ? 'API Live (PostgreSQL)' : 'Offline Local Cache'}</span>
            </div>

            <button
              onClick={fetchOrdersFromApi}
              className={`p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition ${isRefreshing ? 'animate-spin' : ''}`}
              title="Refresh Orders List"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                const headers = ['Order No', 'Invoice No', 'Time', 'Channel', 'Table / Token', 'Customer', 'Phone', 'Items', 'Grand Total (₹)', 'Payment', 'Status'];
                const rows = orders.map((o) => [
                  o.orderNo,
                  o.invoiceNo,
                  o.time,
                  o.channel.toUpperCase(),
                  o.tableOrToken,
                  o.customerName,
                  o.phone,
                  o.itemsSummary,
                  o.grandTotal.toFixed(2),
                  o.paymentMode.toUpperCase(),
                  o.status.toUpperCase(),
                ]);
                exportToCsv(`Orders_Register_${selectedOutlet?.code || 'BLR01'}`, headers, rows);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
              title="Download Orders CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => {
                const headers = ['Order No', 'Time', 'Channel', 'Table', 'Customer', 'Grand Total (₹)', 'Payment', 'Status'];
                const rows = orders.map((o) => [
                  o.orderNo,
                  o.time,
                  o.channel.toUpperCase(),
                  o.tableOrToken,
                  o.customerName,
                  `₹${o.grandTotal.toFixed(2)}`,
                  o.paymentMode.toUpperCase(),
                  o.status.toUpperCase(),
                ]);
                const totalRev = orders.reduce((acc, curr) => acc + curr.grandTotal, 0);
                exportToPdf({
                  title: 'Daily Store Orders Register',
                  subtitle: `Transaction log for ${selectedOutlet?.name || 'Indiranagar'}`,
                  outlet: selectedOutlet?.name || 'Indiranagar (BLR01)',
                  headers,
                  rows,
                  summary: [
                    { label: 'Total Orders', value: String(orders.length) },
                    { label: 'Gross Revenue', value: `₹${totalRev.toFixed(2)}` },
                    { label: 'Average Order Value', value: `₹${(totalRev / (orders.length || 1)).toFixed(2)}` },
                  ],
                });
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition cursor-pointer"
              title="Download or Print Orders PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Time & Order #</th>
                  <th className="py-3 px-4">Invoice No</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Source / Table</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {isLoading ? (
                  <TableRowSkeleton columns={9} rows={6} />
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Receipt className="w-8 h-8 text-slate-300" />
                        <p className="font-bold text-slate-700 text-sm">No orders found</p>
                        <p className="text-xs text-slate-400">Orders placed on POS terminal or online aggregators will appear here live.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60 transition group">
                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-bold text-slate-900 block">{o.orderNo}</span>
                      <span className="text-[11px] text-slate-400">{o.time}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                      {o.invoiceNo}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          o.channel === 'swiggy'
                            ? 'bg-amber-100 text-amber-800'
                            : o.channel === 'zomato'
                            ? 'bg-rose-100 text-rose-800'
                            : o.channel === 'ondc'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {o.channel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {o.tableOrToken}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800 block">{o.customerName}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{o.phone}</span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                      <span className="font-bold text-slate-800 mr-1.5">{o.itemsCount} items:</span>
                      {o.itemsSummary}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-bold uppercase text-[11px]">
                        {o.paymentMode === 'upi' ? (
                          <QrCode className="w-3.5 h-3.5 text-[#3B4FE0]" />
                        ) : o.paymentMode === 'cash' ? (
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                        )}
                        <span>{o.paymentMode}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-extrabold text-slate-900 block text-sm">
                        ₹{o.grandTotal.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        GST: ₹{o.gstTotal.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setInspectingOrder(o)}
                        className="p-1.5 bg-slate-100 hover:bg-[#3B4FE0] hover:text-white rounded-lg text-slate-600 transition"
                        title="View Full Bill Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slide-over Order Details Drawer */}
      {inspectingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end backdrop-blur-xs">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-black text-lg text-slate-900">
                  Invoice {inspectingOrder.invoiceNo}
                </h3>
                <p className="text-xs text-slate-500">Order ID: {inspectingOrder.orderNo}</p>
              </div>
              <button
                onClick={() => setInspectingOrder(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 flex-1">
              {/* Order Meta Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Channel / Table</span>
                  <span className="font-bold text-slate-800">
                    {inspectingOrder.channel.toUpperCase()} · {inspectingOrder.tableOrToken}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer</span>
                  <span className="font-bold text-slate-800">
                    {inspectingOrder.customerName} ({inspectingOrder.phone})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Status</span>
                  <span className="font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">
                    PAID ({inspectingOrder.paymentMode})
                  </span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Purchased Items
                </h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                  {inspectingOrder.items && inspectingOrder.items.length > 0 ? (
                    inspectingOrder.items.map((it, idx) => (
                      <div key={idx} className="p-3 bg-white flex justify-between">
                        <div>
                          <span className="font-bold text-slate-800">
                            {it.qty}x {it.name}
                          </span>
                          {it.notes && (
                            <span className="text-[11px] text-slate-400 block">{it.notes}</span>
                          )}
                        </div>
                        <span className="font-extrabold text-slate-900">
                          ₹{Number(it.lineTotal || (it.unitPrice * it.qty) || 0).toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-white">
                      <span className="font-bold text-slate-800">{inspectingOrder.itemsSummary}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tax & Bill Math */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Value</span>
                  <span className="font-semibold">₹{inspectingOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (2.5%)</span>
                  <span>₹{(inspectingOrder.gstTotal / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST (2.5%)</span>
                  <span>₹{(inspectingOrder.gstTotal / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span className="text-[#E91E7B]">₹{inspectingOrder.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => alert(`Reprinting invoice ${inspectingOrder.invoiceNo}`)}
                className="flex-1 py-3 bg-[#3B4FE0] hover:bg-[#2E3FC6] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Reprint Bill
              </button>
              <button
                onClick={() => alert(`Issuing credit note for ${inspectingOrder.invoiceNo}`)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-rose-600 font-bold text-xs rounded-xl border border-slate-300"
              >
                Issue Credit Note
              </button>
            </div>
          </div>
        </div>
      )}
    </ConsoleLayout>
  );
}
