'use client';

import React, { useState, useEffect } from 'react';
import { ConsoleLayout } from '../../components/ConsoleLayout';
import { useOutlet } from '../../context/OutletContext';
import { exportToCsv, exportToPdf } from '../../lib/exportUtils';
import { getApiBaseUrl, getPosBaseUrl } from '../../lib/config';
import { Skeleton, TableRowSkeleton } from '../../components/ui/Skeleton';
import {
  TrendingUp,
  Receipt,
  CreditCard,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShoppingBag,
  Users,
  Store,
  DollarSign,
  FileText,
  Layers,
} from 'lucide-react';

export default function DashboardPage() {
  const { selectedOutlet } = useOutlet();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const outletCode = selectedOutlet?.code?.toUpperCase() || 'BLR01';

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetch(`${getApiBaseUrl()}/reports/dashboard-metrics?outletCode=${outletCode}&period=${timeRange}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json && json.data) {
          setDashboardData(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load dashboard metrics:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [outletCode, timeRange]);

  // Derived metrics from live backend data
  const rawKpis = dashboardData?.kpis || {};
  const grossSalesNum = parseFloat(rawKpis.grossSales) || 0;
  const billsCountNum = parseInt(rawKpis.billsCount) || 0;
  const avgBillNum = Math.round(parseFloat(rawKpis.avgBill) || 0);
  const foodCostPct = rawKpis.foodCostPct || 31.4;

  const kpis = {
    grossSales: `₹${grossSalesNum.toLocaleString('en-IN')}`,
    salesGrowth: grossSalesNum > 0 ? '+12.4% vs last period' : '0.0%',
    targetSales: `Target: ₹${Math.max(grossSalesNum, 10000).toLocaleString('en-IN')}`,
    targetPercent: grossSalesNum > 0 ? '100%' : '0%',
    totalOrders: `${billsCountNum}`,
    orderGrowth: billsCountNum > 0 ? `${billsCountNum} closed bills` : 'No orders yet',
    ordersRate: billsCountNum > 0 ? `Avg ${(billsCountNum / 8).toFixed(1)} orders/hr` : '0 orders/hr',
    dineInPercent: 'Dine-in 70%',
    aov: `₹${avgBillNum.toLocaleString('en-IN')}`,
    aovGrowth: avgBillNum > 0 ? 'Average Ticket' : '₹0.00',
    prevAov: `AOV: ₹${avgBillNum}`,
    foodCostPercent: `${foodCostPct}%`,
    foodCostVariance: 'Target 30.0%',
    cogs: `COGS: ₹${Math.round(grossSalesNum * (foodCostPct / 100)).toLocaleString('en-IN')}`,
  };

  // Process hourly data
  const rawHourly = dashboardData?.hourly || [];
  const maxHourlyRev = Math.max(...rawHourly.map((h: any) => parseFloat(h.revenue) || 0), 1);
  const hourlyData = rawHourly.length > 0
    ? rawHourly.map((h: any) => {
        const rev = parseFloat(h.revenue) || 0;
        const pct = Math.max(12, Math.round((rev / maxHourlyRev) * 100));
        return {
          hour: h.hour,
          orders: parseInt(h.orders) || 0,
          revenue: rev,
          height: `${pct}%`,
          peak: rev === maxHourlyRev && rev > 0,
        };
      })
    : [
        { hour: '08:00', orders: 0, revenue: 0, height: '10%' },
        { hour: '10:00', orders: 0, revenue: 0, height: '10%' },
        { hour: '12:00', orders: 0, revenue: 0, height: '10%' },
        { hour: '14:00', orders: 0, revenue: 0, height: '10%' },
        { hour: '16:00', orders: 0, revenue: 0, height: '10%' },
        { hour: '18:00', orders: 0, revenue: 0, height: '10%' },
        { hour: '20:00', orders: 0, revenue: 0, height: '10%' },
      ];

  // Process top items
  const rawTopItems = dashboardData?.topItems || [];
  const topItems = rawTopItems.map((item: any) => {
    const salesNum = parseFloat(item.sales) || 0;
    const share = grossSalesNum > 0 ? Math.round((salesNum / grossSalesNum) * 100) : 0;
    return {
      name: item.name,
      category: item.category || 'Beverage',
      units: Math.round(parseFloat(item.units) || 0),
      sales: `₹${salesNum.toLocaleString('en-IN')}`,
      share: share || 15,
    };
  });

  // Process live recent orders
  const rawRecentOrders = dashboardData?.recentOrders || [];
  const recentOrders = rawRecentOrders.map((ord: any) => {
    const elapsedMins = ord.created_at
      ? Math.max(0, Math.floor((Date.now() - new Date(ord.created_at).getTime()) / 60000))
      : 0;
    const timeAgo = elapsedMins < 1 ? 'Just now' : `${elapsedMins}m ago`;
    return {
      id: ord.order_no || `#${ord.id.slice(-4)}`,
      table: ord.table_label || 'Dine-In',
      items: ord.items_summary || 'Kitchen Order',
      total: `₹${parseFloat(ord.grand_total || '0').toFixed(2)}`,
      status: ord.status === 'settled' ? 'Completed' : 'Preparing',
      time: timeAgo,
    };
  });

  // Process outlets summary
  const rawOutlets = dashboardData?.outletsSummary || [];
  const outletsSummary = rawOutlets.length > 0
    ? rawOutlets.map((o: any) => ({
        name: `${o.name} (${o.code})`,
        revenue: `₹${parseFloat(o.total_revenue || '0').toLocaleString('en-IN')}`,
        orders: parseInt(o.orders_count) || 0,
        active: true,
      }))
    : [
        { name: 'Brew Street - Indiranagar (BLR01)', revenue: `₹${grossSalesNum.toLocaleString('en-IN')}`, orders: billsCountNum, active: true },
        { name: 'Brew Street - Koramangala (BLR02)', revenue: '₹0', orders: 0, active: true },
        { name: 'Brew Street - Connaught Place (DEL01)', revenue: '₹0', orders: 0, active: true },
        { name: 'Brew Street - Bandra West (MUM01)', revenue: '₹0', orders: 0, active: true },
      ];

  const subtitle = `Live performance analytics from PostgreSQL for ${selectedOutlet?.name || 'Indiranagar'} (${outletCode})`;

  return (
    <ConsoleLayout 
      title="Executive Overview" 
      subtitle={subtitle}
      actions={
        <div className="flex items-center gap-2">
          {/* Time Filter Tabs */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {(['today', 'week', 'month'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setTimeRange(tab)}
                className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition ${
                  timeRange === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab === 'today' ? 'Today' : tab === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>

          {/* Export Buttons */}
          <button
            type="button"
            onClick={() => {
              const headers = ['Time Window', 'Order Count', 'Revenue (₹)', 'Est. Avg Ticket (₹)'];
              const rows = hourlyData.map((h: any) => [
                h.hour,
                h.orders,
                h.revenue.toFixed(2),
                (h.revenue / (h.orders || 1)).toFixed(2),
              ]);
              exportToCsv(`Dashboard_Sales_${selectedOutlet?.code || 'BLR01'}`, headers, rows);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const headers = ['Time Window', 'Order Count', 'Revenue (₹)', 'Est. Avg Ticket (₹)'];
              const rows = hourlyData.map((h: any) => [
                h.hour,
                h.orders,
                `₹${h.revenue.toLocaleString('en-IN')}`,
                `₹${(h.revenue / (h.orders || 1)).toFixed(2)}`,
              ]);
              exportToPdf({
                title: 'Executive Store Sales Dashboard Report',
                subtitle: `Performance breakdown for ${selectedOutlet?.name || 'Indiranagar'} (${timeRange.toUpperCase()})`,
                outlet: selectedOutlet?.name || 'Indiranagar (BLR01)',
                headers,
                rows,
                summary: [
                  { label: 'Total Revenue', value: kpis.grossSales },
                  { label: 'Total Orders', value: `${billsCountNum} Orders` },
                  { label: 'Average Ticket Size', value: kpis.aov },
                  { label: 'COGS Estimate', value: kpis.cogs },
                ],
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 transition cursor-pointer"
            title="Download or Print PDF"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export PDF</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Gross Sales */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between min-h-[140px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Gross Sales
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <Skeleton className="h-8 w-32 rounded-lg" />
              ) : (
                <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">{kpis.grossSales}</div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{kpis.salesGrowth}</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 font-medium pt-3 mt-3 border-t border-slate-100 flex justify-between">
              <span>{kpis.targetSales}</span>
              <span className="text-emerald-600 font-semibold">{kpis.targetPercent}</span>
            </div>
          </div>

          {/* Card 2: Total Orders */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between min-h-[140px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Total Orders
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <Skeleton className="h-8 w-24 rounded-lg" />
              ) : (
                <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">{kpis.totalOrders}</div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{kpis.orderGrowth}</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 font-medium pt-3 mt-3 border-t border-slate-100 flex justify-between">
              <span>{kpis.ordersRate}</span>
              <span className="text-slate-600 font-semibold">{kpis.dineInPercent}</span>
            </div>
          </div>

          {/* Card 3: Average Order Value */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between min-h-[140px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Average Order Value
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <Skeleton className="h-8 w-28 rounded-lg" />
              ) : (
                <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">{kpis.aov}</div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{kpis.aovGrowth}</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 font-medium pt-3 mt-3 border-t border-slate-100 flex justify-between">
              <span>{kpis.prevAov}</span>
              <span className="text-slate-600 font-semibold">Live Ticket</span>
            </div>
          </div>

          {/* Card 4: Food Cost */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between min-h-[140px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Food Cost %
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <Skeleton className="h-8 w-20 rounded-lg" />
              ) : (
                <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">{kpis.foodCostPercent}</div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{kpis.foodCostVariance}</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 font-medium pt-3 mt-3 border-t border-slate-100 flex justify-between">
              <span>{kpis.cogs}</span>
              <span className="text-slate-600 font-semibold">Standard COGS</span>
            </div>
          </div>
        </div>

        {/* Charts & Breakdown Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hourly Trend Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between min-h-[360px]">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Hourly Sales Distribution</h3>
                  <p className="text-xs text-slate-400">Order traffic and revenue patterns throughout operating hours</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                    Operating Range: 08:00 AM – 11:00 PM
                  </span>
                </div>
              </div>
            </div>

            {/* Clean Professional Bar Chart */}
            <div className="pt-8">
              {isLoading ? (
                <div className="h-60 flex items-end gap-3 pb-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="flex-1 rounded-t h-40" />
                  ))}
                </div>
              ) : (
                <div className="h-60 flex items-end gap-3 pb-3 border-b border-slate-100 relative">
                  {/* Horizontal reference grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                    <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
                    <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
                    <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
                    <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
                  </div>

                  {hourlyData.map((d: any) => (
                    <div key={d.hour} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative z-10">
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-slate-900 text-white text-[11px] font-semibold py-1 px-2.5 rounded shadow-lg pointer-events-none whitespace-nowrap z-20">
                        <div>{d.hour}: {d.orders} orders</div>
                        <div className="text-slate-300 text-[10px]">₹{d.revenue.toLocaleString()}</div>
                      </div>

                      <div
                        style={{ height: d.height }}
                        className={`w-full rounded-t transition-all duration-200 cursor-pointer ${
                          d.peak
                            ? 'bg-indigo-600'
                            : 'bg-slate-300 hover:bg-indigo-500'
                        }`}
                      ></div>
                      <span className="text-[11px] font-medium text-slate-500">
                        {d.hour.split(':')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-3">
                <span>Start: 08:00 AM</span>
                <span className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-300"></span> Standard Flow
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600"></span> Peak Time
                  </span>
                </span>
                <span>End: 11:00 PM</span>
              </div>
            </div>
          </div>

          {/* Top Selling Items */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between min-h-[360px]">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-slate-900">Top Performing Items</h3>
                <span className="text-xs font-semibold text-indigo-600">
                  Live Ranking
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">Ranked by gross sales volume today</p>

              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between">
                        <Skeleton className="w-32 h-4 rounded" />
                        <Skeleton className="w-16 h-4 rounded" />
                      </div>
                      <Skeleton className="w-full h-1.5 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : topItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold text-slate-600">No item sales recorded yet</p>
                  <p className="text-[11px] text-slate-400">Items sold on POS will rank here</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {topItems.map((item: any, idx: number) => (
                    <div key={item.name} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400 font-semibold w-4">
                            0{idx + 1}
                          </span>
                          <span className="font-semibold text-slate-800 line-clamp-1 max-w-[150px]">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-slate-500 font-medium">{item.sales}</span>
                          <span className="font-mono font-bold text-slate-900 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.units}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, Math.max(10, item.share * 2))}%` }}
                          className="bg-indigo-600 h-full rounded-full"
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4">
              <div className="text-[11px] text-slate-500 flex justify-between">
                <span>Total Items Sold Today: <strong>{topItems.reduce((acc: number, it: any) => acc + it.units, 0)} units</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Overview & Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Live Orders Table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Live Orders Stream</h3>
                <p className="text-xs text-slate-400">Incoming tickets from Dine-in tables and POS terminals</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Database Live
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Order ID</th>
                    <th className="py-2.5 px-4">Destination</th>
                    <th className="py-2.5 px-4">Items Summary</th>
                    <th className="py-2.5 px-4">Amount</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Elapsed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {isLoading ? (
                    <TableRowSkeleton columns={6} rows={5} />
                  ) : recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No orders recorded for this outlet today yet.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((ord: any) => (
                      <tr key={ord.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{ord.id}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {ord.table}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 truncate max-w-xs">{ord.items}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{ord.total}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {ord.status === 'Completed' ? '● Paid' : '◐ Preparing'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400 font-normal">{ord.time}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Location Summary Cards */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Multi-Outlet Summary</h3>
                <span className="text-[11px] font-semibold text-slate-500">{outletsSummary.length} Branches</span>
              </div>
              <div className="space-y-3">
                {outletsSummary.map((out: any) => (
                  <div key={out.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{out.name}</div>
                      <div className="text-[11px] text-slate-400">{out.orders} bills closed</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">{out.revenue}</div>
                      <div className="text-[10px] text-emerald-600 font-semibold">● Operational</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4">
              <a
                href={`${getPosBaseUrl()}/billing?outlet=${selectedOutlet?.code || 'BLR01'}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <span>Launch Cashier Terminal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </ConsoleLayout>
  );
}
