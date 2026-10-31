'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ConsoleLayout } from '../../components/ConsoleLayout';
import { useOutlet } from '../../context/OutletContext';
import { exportToCsv, exportToPdf, exportToTallyXml } from '../../lib/exportUtils';
import { getApiBaseUrl } from '../../lib/config';
import { Skeleton, TableRowSkeleton } from '../../components/ui/Skeleton';
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  FileCode,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle,
  FileText,
  Printer,
  Layers,
  ShoppingBag,
  CreditCard,
  Package,
} from 'lucide-react';

interface HsnItem {
  hsn: string;
  description: string;
  gstRate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  grossValue: number;
}

export default function ReportsAdminPage() {
  const { selectedOutlet } = useOutlet();
  const [activeReport, setActiveReport] = useState<'gst' | 'sales' | 'items' | 'payments' | 'foodcost'>('gst');
  const [isLoading, setIsLoading] = useState(true);

  // Live state per report type
  const [gstData, setGstData] = useState<any>(null);
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [itemSales, setItemSales] = useState<any[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<any[]>([]);
  const [inventoryStock, setInventoryStock] = useState<any[]>([]);

  const outletCode = selectedOutlet?.code?.toUpperCase() || 'BLR01';

  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    const base = getApiBaseUrl();

    try {
      if (activeReport === 'gst') {
        const res = await fetch(`${base}/reports/gst-summary?outletCode=${outletCode}`);
        if (res.ok) {
          const json = await res.json();
          setGstData(json);
        }
      } else if (activeReport === 'sales') {
        const res = await fetch(`${base}/reports/daily-sales?outletCode=${outletCode}`);
        if (res.ok) {
          const json = await res.json();
          setDailySales(json.data || []);
        }
      } else if (activeReport === 'items') {
        const res = await fetch(`${base}/reports/item-sales?outletCode=${outletCode}`);
        if (res.ok) {
          const json = await res.json();
          setItemSales(json.data || []);
        }
      } else if (activeReport === 'payments') {
        const res = await fetch(`${base}/reports/payment-summary?outletCode=${outletCode}`);
        if (res.ok) {
          const json = await res.json();
          setPaymentSummary(json.data || []);
        }
      } else if (activeReport === 'foodcost') {
        const res = await fetch(`${base}/inventory`);
        if (res.ok) {
          const json = await res.json();
          setInventoryStock(json.data || []);
        }
      }
    } catch (err) {
      console.warn('Failed to load live reports data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeReport, outletCode]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Derived GST summary
  const hsnSummary: HsnItem[] = useMemo(() => {
    if (!gstData?.hsnSummary || !Array.isArray(gstData.hsnSummary)) return [];
    return gstData.hsnSummary.map((r: any) => ({
      hsn: r.hsn || '996331',
      description: r.description || (r.hsn === '210690' ? 'Confectionery & Bakery' : 'Restaurant food services'),
      gstRate: parseFloat(r.tax_rate) || 5,
      taxableValue: parseFloat(r.taxable_value) || 0,
      cgst: parseFloat(r.cgst) || 0,
      sgst: parseFloat(r.sgst) || 0,
      igst: parseFloat(r.igst) || 0,
      totalGst: (parseFloat(r.cgst) || 0) + (parseFloat(r.sgst) || 0) + (parseFloat(r.igst) || 0),
      grossValue: parseFloat(r.gross_value) || 0,
    }));
  }, [gstData]);

  const totalTaxable = hsnSummary.reduce((acc: number, r: HsnItem) => acc + r.taxableValue, 0);
  const totalCgst = hsnSummary.reduce((acc: number, r: HsnItem) => acc + r.cgst, 0);
  const totalSgst = hsnSummary.reduce((acc: number, r: HsnItem) => acc + r.sgst, 0);
  const totalGst = hsnSummary.reduce((acc: number, r: HsnItem) => acc + r.totalGst, 0);
  const totalGross = hsnSummary.reduce((acc: number, r: HsnItem) => acc + r.grossValue, 0);

  const gstinMap: Record<string, { gstin: string; state: string }> = {
    BLR01: { gstin: '29AABCU9603R1ZM', state: 'Karnataka (29)' },
    BLR02: { gstin: '29AABCU9603R1ZM', state: 'Karnataka (29)' },
    DEL01: { gstin: '07AABCU9603R1ZM', state: 'Delhi (07)' },
    MUM01: { gstin: '27AABCU9603R1ZM', state: 'Maharashtra (27)' },
  };
  const currentBranchGst = gstinMap[outletCode] || gstinMap['BLR01'];

  const handleExport = (format: 'csv' | 'xlsx' | 'pdf' | 'tally') => {
    let headers: string[] = [];
    let rows: any[] = [];
    let reportTitle = 'Live Report';

    if (activeReport === 'gst') {
      reportTitle = 'GSTR-1 Tax Summary';
      headers = ['HSN/SAC', 'Description', 'GST Rate (%)', 'Taxable (₹)', 'CGST (₹)', 'SGST (₹)', 'Total GST (₹)', 'Gross (₹)'];
      rows = hsnSummary.map((r: HsnItem) => [
        r.hsn,
        r.description,
        `${r.gstRate}%`,
        r.taxableValue.toFixed(2),
        r.cgst.toFixed(2),
        r.sgst.toFixed(2),
        r.totalGst.toFixed(2),
        r.grossValue.toFixed(2),
      ]);
    } else if (activeReport === 'sales') {
      reportTitle = 'Daily Sales by Channel';
      headers = ['Channel', 'Bills Closed', 'Subtotal (₹)', 'Tax Total (₹)', 'Grand Total (₹)'];
      rows = dailySales.map((s) => [
        s.channel.toUpperCase(),
        s.bills_count,
        parseFloat(s.subtotal || 0).toFixed(2),
        parseFloat(s.tax_total || 0).toFixed(2),
        parseFloat(s.grand_total || 0).toFixed(2),
      ]);
    } else if (activeReport === 'items') {
      reportTitle = 'Item Sales Revenue';
      headers = ['Item Name', 'Category', 'Units Sold', 'Avg Price (₹)', 'Tax (₹)', 'Total Sales (₹)'];
      rows = itemSales.map((it) => [
        it.name,
        it.category,
        it.units_sold,
        parseFloat(it.avg_price || 0).toFixed(2),
        parseFloat(it.tax_amount || 0).toFixed(2),
        parseFloat(it.total_sales || 0).toFixed(2),
      ]);
    } else if (activeReport === 'payments') {
      reportTitle = 'Payment Mode Reconciliation';
      headers = ['Payment Mode', 'Transaction Count', 'Total Settled (₹)'];
      rows = paymentSummary.map((p) => [
        p.mode?.toUpperCase() || 'CASH',
        p.count,
        parseFloat(p.total_amount || 0).toFixed(2),
      ]);
    } else if (activeReport === 'foodcost') {
      reportTitle = 'Inventory Valuation Report';
      headers = ['Stock Item', 'Category', 'On-Hand Qty', 'Unit', 'Unit Cost (₹)', 'Total Valuation (₹)'];
      rows = inventoryStock.map((i) => [
        i.name,
        i.kind,
        parseFloat(i.on_hand_qty || 0).toFixed(2),
        i.unit,
        parseFloat(i.avg_cost || 0).toFixed(2),
        ((parseFloat(i.on_hand_qty) || 0) * (parseFloat(i.avg_cost) || 0)).toFixed(2),
      ]);
    }

    if (format === 'csv' || format === 'xlsx') {
      exportToCsv(`${reportTitle}_${outletCode}`, headers, rows);
    } else if (format === 'pdf') {
      exportToPdf({
        title: reportTitle,
        subtitle: `Generated from PostgreSQL Database for ${selectedOutlet?.name || 'Indiranagar'} (${outletCode})`,
        outlet: `${selectedOutlet?.name || 'Indiranagar'} (${outletCode})`,
        headers,
        rows,
        summary: [
          { label: 'Total Gross Value', value: `₹${totalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
          { label: 'Total Tax Collected', value: `₹${totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
        ],
      });
    } else if (format === 'tally') {
      exportToTallyXml(
        `Tally_GSTR1_${outletCode}`,
        hsnSummary.map((h: HsnItem) => ({
          hsnCode: h.hsn,
          description: h.description,
          gstRate: h.gstRate,
          taxableValue: h.taxableValue,
          cgst: h.cgst,
          sgst: h.sgst,
          totalGst: h.totalGst,
          grossValue: h.grossValue,
        }))
      );
    }
  };

  return (
    <ConsoleLayout
      title="Reports & Compliance"
      subtitle={`Statutory GST filing, channel sales & inventory analytics for ${selectedOutlet?.name || 'Indiranagar'} (${outletCode})`}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
            title="Download CSV Spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition cursor-pointer"
            title="Download or Print PDF Report"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => handleExport('tally')}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#3B4FE0] hover:bg-[#2E3FC6] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            title="Export for Tally ERP9 / Prime"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Tally XML</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          {[
            { id: 'gst', label: 'GST GSTR-1 Summary' },
            { id: 'sales', label: 'Daily Sales & Channels' },
            { id: 'items', label: 'Item Sales & Revenue' },
            { id: 'payments', label: 'Payment Reconciliation' },
            { id: 'foodcost', label: 'Stock & Valuation' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                activeReport === tab.id
                  ? 'bg-[#3B4FE0] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 1. GSTR-1 Tab */}
        {activeReport === 'gst' && (
          <div className="space-y-4">
            <div className="bg-[#EBF0FF] border border-[#3B4FE0]/30 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3B4FE0] text-white flex items-center justify-center font-bold text-sm">
                  GST
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    GSTR-1 Return Filing Summary · {selectedOutlet?.name || 'Indiranagar'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    GSTIN: <strong>{currentBranchGst.gstin}</strong> ({currentBranchGst.state}). Intra-state split 50/50 into CGST & SGST.
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Total GST Collected</span>
                {isLoading ? (
                  <Skeleton className="h-7 w-24 ml-auto mt-1 rounded" />
                ) : (
                  <div className="text-xl font-black text-[#3B4FE0] font-mono">
                    ₹{totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">HSN / SAC Wise Tax Breakdown</h4>
                  <p className="text-xs text-slate-400">Live order taxes aggregated from pos.orders & pos.order_items</p>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Gross Sales: <strong className="text-slate-900 font-mono">₹{totalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">HSN/SAC</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-center">GST Rate</th>
                      <th className="py-3 px-4 text-right">Taxable Value</th>
                      <th className="py-3 px-4 text-right">CGST (₹)</th>
                      <th className="py-3 px-4 text-right">SGST (₹)</th>
                      <th className="py-3 px-4 text-right">IGST (₹)</th>
                      <th className="py-3 px-4 text-right">Total Tax (₹)</th>
                      <th className="py-3 px-4 text-right">Gross Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {isLoading ? (
                      <TableRowSkeleton columns={9} rows={3} />
                    ) : hsnSummary.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          No billed orders recorded yet for GST calculation.
                        </td>
                      </tr>
                    ) : (
                      hsnSummary.map((row: HsnItem) => (
                        <tr key={row.hsn} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{row.hsn}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-700">{row.description}</td>
                          <td className="py-3.5 px-4 text-center font-bold">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">{row.gstRate}%</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold">
                            ₹{row.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                            ₹{row.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                            ₹{row.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-600">₹0.00</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-[#3B4FE0]">
                            ₹{row.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                            ₹{row.grossValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. Channel Sales Tab */}
        {activeReport === 'sales' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-800 text-sm">Channel Sales & Settlement Breakdown</h4>
              <p className="text-xs text-slate-400">Total volume and revenue across POS counter, Swiggy, Zomato, and ONDC</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4 text-center">Bills Closed</th>
                    <th className="py-3 px-4 text-right">Net Subtotal (₹)</th>
                    <th className="py-3 px-4 text-right">GST Total (₹)</th>
                    <th className="py-3 px-4 text-right">Grand Total Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {isLoading ? (
                    <TableRowSkeleton columns={5} rows={3} />
                  ) : dailySales.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No channel sales recorded for this outlet today.
                      </td>
                    </tr>
                  ) : (
                    dailySales.map((ch: any) => (
                      <tr key={ch.channel} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-bold uppercase text-slate-900">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono text-xs">
                            {ch.channel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold font-mono">{ch.bills_count}</td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          ₹{parseFloat(ch.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                          ₹{parseFloat(ch.tax_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                          ₹{parseFloat(ch.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Item Sales Tab */}
        {activeReport === 'items' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-800 text-sm">Product Sales Performance</h4>
              <p className="text-xs text-slate-400">Units sold and gross revenue per menu item</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Units Sold</th>
                    <th className="py-3 px-4 text-right">Avg Unit Price</th>
                    <th className="py-3 px-4 text-right">GST (₹)</th>
                    <th className="py-3 px-4 text-right">Total Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {isLoading ? (
                    <TableRowSkeleton columns={6} rows={5} />
                  ) : itemSales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No product sales recorded yet.
                      </td>
                    </tr>
                  ) : (
                    itemSales.map((item: any) => (
                      <tr key={item.name} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{item.name}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-500">{item.category}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold">{Math.round(parseFloat(item.units_sold) || 0)}</td>
                        <td className="py-3.5 px-4 text-right font-mono">₹{parseFloat(item.avg_price || 0).toFixed(2)}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-500">₹{parseFloat(item.tax_amount || 0).toFixed(2)}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                          ₹{parseFloat(item.total_sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Payment Modes Tab */}
        {activeReport === 'payments' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-800 text-sm">Tender / Payment Mode Reconciliation</h4>
              <p className="text-xs text-slate-400">Total cash collected in drawer vs online UPI and card transactions</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4 text-center">Transactions Count</th>
                    <th className="py-3 px-4 text-right">Total Settled Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {isLoading ? (
                    <TableRowSkeleton columns={3} rows={3} />
                  ) : paymentSummary.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-slate-400">
                        No payments recorded for this outlet yet.
                      </td>
                    </tr>
                  ) : (
                    paymentSummary.map((p: any) => (
                      <tr key={p.mode} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900 uppercase">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono text-xs">
                            {p.mode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold font-mono">{p.count}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-base">
                          ₹{parseFloat(p.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. Food Cost / Inventory Tab */}
        {activeReport === 'foodcost' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-800 text-sm">Stock Valuation & Material Consumption</h4>
              <p className="text-xs text-slate-400">Real-time inventory levels from raw material ledger</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Raw Material / Item</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">On-Hand Stock</th>
                    <th className="py-3 px-4 text-right">Reorder Threshold</th>
                    <th className="py-3 px-4 text-right">Avg Unit Cost</th>
                    <th className="py-3 px-4 text-right">Total Valuation (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {isLoading ? (
                    <TableRowSkeleton columns={6} rows={3} />
                  ) : inventoryStock.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No inventory items found.
                      </td>
                    </tr>
                  ) : (
                    inventoryStock.map((it: any) => {
                      const onHand = parseFloat(it.on_hand_qty) || 0;
                      const cost = parseFloat(it.avg_cost) || 0;
                      return (
                        <tr key={it.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{it.name}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-500">{it.kind}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                            {onHand} {it.unit}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                            {parseFloat(it.reorder_level) || 0} {it.unit}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">₹{cost.toFixed(2)}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                            ₹{(onHand * cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ConsoleLayout>
  );
}
