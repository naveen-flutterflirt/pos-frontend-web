'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ConsoleLayout } from '../../components/ConsoleLayout';
import { useOutlet } from '../../context/OutletContext';
import { exportToCsv, exportToPdf } from '../../lib/exportUtils';
import { getApiBaseUrl } from '../../lib/config';
import { Skeleton, TableRowSkeleton } from '../../components/ui/Skeleton';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ArrowRightLeft,
  Trash,
  Truck,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  FileText,
  Boxes,
} from 'lucide-react';

interface StockItem {
  id: string;
  name: string;
  category: string;
  onHand: number;
  unit: string;
  reorderLevel: number;
  unitCost: number;
  supplier: string;
}

export default function InventoryAdminPage() {
  const { selectedOutlet } = useOutlet();
  const [activeTab, setActiveTab] = useState<'stock' | 'bom' | 'po' | 'suppliers'>('stock');
  const [search, setSearch] = useState('');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const outletCode = selectedOutlet?.code?.toUpperCase() || 'BLR01';

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/inventory`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: StockItem[] = json.data.map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.kind === 'raw_material' ? 'Raw Materials' : item.kind || 'Raw Materials',
            onHand: parseFloat(item.on_hand_qty) || 0,
            unit: item.unit || 'kg',
            reorderLevel: parseFloat(item.reorder_level) || 10,
            unitCost: parseFloat(item.avg_cost) || 1.0,
            supplier: `${selectedOutlet?.name || 'Indiranagar'} Hub Depot`,
          }));
          setStockItems(mapped);
        } else {
          setStockItems([]);
        }
      }
    } catch (e) {
      console.warn('Backend not reached in inventory admin', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOutlet]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const filteredItems = stockItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalValuation = useMemo(() => {
    return filteredItems.reduce((acc, i) => acc + i.onHand * i.unitCost, 0);
  }, [filteredItems]);

  const lowStockCount = useMemo(() => {
    return filteredItems.filter((i) => i.onHand <= i.reorderLevel).length;
  }, [filteredItems]);

  return (
    <ConsoleLayout
      title="Inventory & Stock Control"
      actions={
        <div className="flex items-center gap-2">
          {/* Export Buttons */}
          <button
            type="button"
            onClick={() => {
              const headers = [
                'Material / SKU',
                'Category',
                'On-Hand Stock',
                'Unit',
                'Reorder Level',
                'Unit Cost (₹)',
                'Valuation (₹)',
                'Supplier',
                'Status',
              ];
              const rows = filteredItems.map((item) => {
                const isLow = item.onHand <= item.reorderLevel;
                const valuation = item.onHand * item.unitCost;
                return [
                  item.name,
                  item.category,
                  item.onHand.toString(),
                  item.unit,
                  item.reorderLevel.toString(),
                  item.unitCost.toFixed(2),
                  valuation.toFixed(2),
                  item.supplier,
                  isLow ? 'LOW STOCK' : 'IN STOCK',
                ];
              });
              exportToCsv(`Inventory_Stock_${selectedOutlet?.code || 'BLR01'}`, headers, rows);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer"
            title="Download Inventory Stock CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const headers = [
                'Material / SKU',
                'Category',
                'Stock Qty',
                'Unit Cost',
                'Total Value',
                'Supplier',
                'Status',
              ];
              const rows = filteredItems.map((item) => {
                const isLow = item.onHand <= item.reorderLevel;
                const valuation = item.onHand * item.unitCost;
                return [
                  item.name,
                  item.category,
                  `${item.onHand} ${item.unit}`,
                  `₹${item.unitCost.toFixed(2)}`,
                  `₹${valuation.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
                  item.supplier,
                  isLow ? '⚠️ Low Stock' : '✅ In Stock',
                ];
              });
              exportToPdf({
                title: 'Live Inventory Valuation & Stock On-Hand',
                subtitle: `Warehouse audit for ${selectedOutlet?.name || 'Indiranagar'}`,
                outlet: selectedOutlet?.name || 'Indiranagar (BLR01)',
                headers,
                rows,
                summary: [
                  { label: 'Total Tracked SKUs', value: String(filteredItems.length) },
                  {
                    label: 'Total Valuation',
                    value: `₹${totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
                  },
                  { label: 'Low Stock Alerts', value: String(lowStockCount) },
                ],
              });
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-700 transition cursor-pointer"
            title="Download or Print PDF Report"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export PDF</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          {[
            { id: 'stock', label: 'Stock Items & Raw Materials' },
            { id: 'bom', label: 'Recipes (BOM)' },
            { id: 'po', label: 'Purchase Orders (PO)' },
            { id: 'suppliers', label: 'Suppliers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === tab.id
                  ? 'bg-[#3B4FE0] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar & Summary Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search raw materials, coffee, packaging..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#3B4FE0] focus:bg-white transition"
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Stock Value</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {isLoading ? (
                  <Skeleton className="h-6 w-24 mt-1" />
                ) : (
                  `₹${totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                )}
              </div>
            </div>
            <Package className="w-8 h-8 text-[#3B4FE0] p-1.5 bg-[#EBF0FF] rounded-xl" />
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Low Stock Alerts</span>
              <div className="text-xl font-black text-amber-600 mt-0.5">
                {isLoading ? (
                  <Skeleton className="h-6 w-16 mt-1" />
                ) : (
                  `${lowStockCount} Items`
                )}
              </div>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-600 p-1.5 bg-amber-50 rounded-xl" />
          </div>
        </div>

        {/* Stock Items Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Material / SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">On-Hand Stock</th>
                  <th className="py-3 px-4 text-right">Reorder Level</th>
                  <th className="py-3 px-4 text-right">Avg Unit Cost</th>
                  <th className="py-3 px-4 text-right">Stock Valuation</th>
                  <th className="py-3 px-4">Primary Supplier</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {isLoading ? (
                  <TableRowSkeleton columns={8} rows={5} />
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Boxes className="w-8 h-8 text-slate-300" />
                        <p className="font-bold text-slate-700 text-sm">No inventory items found</p>
                        <p className="text-xs text-slate-400">Raw materials and inventory tracked in warehouse will appear here.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isLow = item.onHand <= item.reorderLevel;
                    const valuation = item.onHand * item.unitCost;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-semibold">
                          {item.category}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-sm">
                          {item.onHand} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-500 font-semibold">
                          {item.reorderLevel} {item.unit}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700">
                          ₹{item.unitCost.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900">
                          ₹{valuation.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          {item.supplier}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                              <AlertTriangle className="w-3 h-3" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ConsoleLayout>
  );
}
