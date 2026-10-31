'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ConsoleLayout } from '../../components/ConsoleLayout';
import { useOutlet } from '../../context/OutletContext';
import { customersApi, Customer, CustomerStats } from '../../lib/api';
import { exportToCsv, exportToPdf } from '../../lib/exportUtils';
import { Skeleton, TableRowSkeleton } from '../../components/ui/Skeleton';
import {
  Users,
  Search,
  Award,
  Plus,
  Coins,
  History,
  Download,
  FileText,
  X,
  Phone,
  Mail,
  Edit2,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

export default function CustomersAdminPage() {
  const { selectedOutlet } = useOutlet();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats>({ activeMembers: 0, totalPoints: 0, avgSpend: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [inspectingCustomer, setInspectingCustomer] = useState<Customer | null>(null);

  // Form fields
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

  // Load live customers & CRM metrics from API
  const loadData = useCallback(async (searchQuery?: string) => {
    setIsLoading(true);
    try {
      const [custList, kpiStats] = await Promise.all([
        customersApi.list(searchQuery),
        customersApi.getStats(),
      ]);
      setCustomers(custList);
      setStats(kpiStats);
    } catch (err) {
      console.error('[CustomersAdmin] Error loading data from API:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      loadData(search);
    }, 350);
    return () => clearTimeout(handler);
  }, [search, loadData]);

  // Modal open handlers
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '' });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormData({
      name: cust.name || '',
      phone: cust.phone || '',
      email: cust.email && cust.email !== '—' ? cust.email : '',
    });
    setShowAddModal(true);
  };

  // Create or Update submit handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone.trim()) {
      alert('Phone number is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        await customersApi.update(editingCustomer.id, {
          name: formData.name.trim() || 'Guest Customer',
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
        });
      } else {
        await customersApi.create({
          name: formData.name.trim() || 'Guest Customer',
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
        });
      }
      setShowAddModal(false);
      setEditingCustomer(null);
      await loadData(search);
    } catch (err: any) {
      alert(err?.message || 'Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete customer handler
  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate customer profile for "${name}"?`)) return;
    try {
      await customersApi.delete(id);
      await loadData(search);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete customer');
    }
  };

  // Client filtered list for rapid responsiveness
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return customers;
    return customers.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.phone && c.phone.includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term))
    );
  }, [customers, search]);

  return (
    <ConsoleLayout
      title="Customers & Loyalty CRM"
      subtitle={`Real-time patron directory, visit history & loyalty points for ${selectedOutlet?.name || 'All Outlets'}`}
      actions={
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadData(search)}
            disabled={isLoading}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 transition cursor-pointer"
            title="Refresh Patron Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : 'text-slate-600'}`} />
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={() => {
              const headers = [
                'Customer ID',
                'Full Name',
                'Phone Number',
                'Email',
                'Loyalty Tier',
                'Points Balance',
                'Visit Count',
                'Total Spent (₹)',
              ];
              const rows = filtered.map((c) => [
                c.id,
                c.name,
                c.phone,
                c.email || '—',
                c.tier || 'BRONZE',
                (c.loyaltyPoints || 0).toString(),
                (c.visitCount || 0).toString(),
                (c.totalSpent || 0).toFixed(2),
              ]);
              exportToCsv(`Customers_CRM_${selectedOutlet?.code || 'BLR01'}`, headers, rows);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer"
            title="Download Customers CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* Export PDF */}
          <button
            type="button"
            onClick={() => {
              const headers = [
                'Customer Name',
                'Phone Number',
                'Loyalty Tier',
                'Points',
                'Visits',
                'Total Spend',
              ];
              const rows = filtered.map((c) => [
                c.name,
                c.phone,
                c.tier || 'BRONZE',
                `${c.loyaltyPoints || 0} pts`,
                `${c.visitCount || 0} visits`,
                `₹${(c.totalSpent || 0).toLocaleString('en-IN')}`,
              ]);
              const totalVal = filtered.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
              const totalPoints = filtered.reduce((acc, c) => acc + (c.loyaltyPoints || 0), 0);

              exportToPdf({
                title: 'Customer Loyalty & CRM Register Report',
                subtitle: `Customer engagement, spending & loyalty balance for ${selectedOutlet?.name || 'All Outlets'}`,
                outlet: selectedOutlet?.name || 'Indiranagar (BLR01)',
                headers,
                rows,
                summary: [
                  { label: 'Total Registered Customers', value: `${filtered.length} Patrons` },
                  { label: 'Customer Lifetime Spend', value: `₹${totalVal.toLocaleString('en-IN')}` },
                  { label: 'Active Loyalty Points', value: `${totalPoints} Points` },
                  { label: 'Gold VIP Members', value: `${filtered.filter((c) => c.tier === 'GOLD' || c.tier === 'Gold').length} Members` },
                ],
              });
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-700 transition cursor-pointer"
            title="Download or Print PDF"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export PDF</span>
          </button>

          {/* Add Customer Modal Trigger */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* KPI Row - Connected to live /v1/customers/stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Active Loyalty Members</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {isLoading ? <Skeleton className="h-7 w-20 mt-1" /> : (stats.activeMembers || customers.length)}
              </div>
            </div>
            <Users className="w-9 h-9 text-indigo-600 p-2 bg-indigo-50 rounded-xl" />
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Points in Circulation</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {isLoading ? <Skeleton className="h-7 w-28 mt-1" /> : `${(stats.totalPoints || 0).toLocaleString('en-IN')} pts`}
              </div>
            </div>
            <Coins className="w-9 h-9 text-emerald-600 p-2 bg-emerald-50 rounded-xl" />
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Avg Member Lifetime Spend</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {isLoading ? <Skeleton className="h-7 w-24 mt-1" /> : `₹${Math.round(stats.avgSpend || 0).toLocaleString('en-IN')}`}
              </div>
            </div>
            <Award className="w-9 h-9 text-amber-500 p-2 bg-amber-50 rounded-xl" />
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers by name, phone number, or email..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
            />
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            Showing <strong>{filtered.length}</strong> of {customers.length} registered patrons
          </span>
        </div>

        {/* Customer Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-center">Tier</th>
                <th className="py-3 px-4 text-right">Points Balance</th>
                <th className="py-3 px-4 text-right">Total Spent</th>
                <th className="py-3 px-4 text-right">Visits</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {isLoading ? (
                <TableRowSkeleton columns={7} rows={5} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-slate-700 text-sm">No customers found</p>
                      <p className="text-xs text-slate-400">
                        {search ? 'Try clearing your search query or' : 'Get started by clicking'}{' '}
                        <button
                          type="button"
                          onClick={handleOpenAddModal}
                          className="text-indigo-600 font-bold hover:underline"
                        >
                          + Add Customer
                        </button>
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition group">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block text-sm">{c.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {c.id.substring(0, 8)}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="text-slate-800 font-bold block">{c.phone}</span>
                      <span className="text-[11px] text-slate-400 font-sans">{c.email || '—'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          c.tier === 'GOLD' || c.tier === 'Gold'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : c.tier === 'SILVER' || c.tier === 'Silver'
                            ? 'bg-slate-200 text-slate-700 border border-slate-300'
                            : 'bg-orange-100 text-orange-800 border border-orange-200'
                        }`}
                      >
                        {c.tier || 'BRONZE'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-600 text-sm">
                      {(c.loyaltyPoints || 0).toLocaleString()} pts
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 font-mono">
                      ₹{(c.totalSpent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-700">
                      {c.visitCount || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setInspectingCustomer(c)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                          title="View Patron History"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(c)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(c.id, c.name)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* ADD / EDIT CUSTOMER MODAL                            */}
      {/* ---------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                {editingCustomer ? 'Edit Patron Profile' : 'Register New Patron'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Phone Number (Required)</label>
                <div className="relative mt-1">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Email Address (Optional)</label>
                <div className="relative mt-1">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>{editingCustomer ? 'Update Profile' : 'Save Patron'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* CUSTOMER LEDGER & DETAILS DRAWER                     */}
      {/* ---------------------------------------------------- */}
      {inspectingCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                  {inspectingCustomer.name?.charAt(0) || 'C'}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{inspectingCustomer.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{inspectingCustomer.phone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Tier</span>
                <p className="text-xs font-black text-indigo-600 mt-0.5 uppercase">{inspectingCustomer.tier || 'BRONZE'}</p>
              </div>
              <div className="text-center border-x border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Visits</span>
                <p className="text-xs font-black text-slate-900 mt-0.5">{inspectingCustomer.visitCount || 0} times</p>
              </div>
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Points</span>
                <p className="text-xs font-black text-emerald-600 mt-0.5">{inspectingCustomer.loyaltyPoints || 0} pts</p>
              </div>
            </div>

            {/* Lifetime Spend */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900">Lifetime Spend:</span>
              <strong className="text-base font-black text-emerald-900 font-mono">
                ₹{(inspectingCustomer.totalSpent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setInspectingCustomer(null);
                  handleOpenEditModal(inspectingCustomer);
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => setInspectingCustomer(null)}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ConsoleLayout>
  );
}
