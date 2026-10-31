'use client';

import React, { useState, useEffect } from 'react';
import { ConsoleLayout } from '../../components/ConsoleLayout';
import { useOutlet } from '../../context/OutletContext';
import { getApiBaseUrl } from '../../lib/config';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Layers,
  Tag,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Filter,
} from 'lucide-react';

interface MenuItemAdmin {
  id: string;
  name: string;
  category: string;
  categoryId?: string;
  foodType: 'veg' | 'non_veg';
  hsnSac: string;
  dineInPrice: number;
  takeawayPrice: number;
  swiggyPrice: number;
  zomatoPrice: number;
  isAvailable: boolean; // 86'd status
}

export default function MenuAdminPage() {
  const { selectedOutlet } = useOutlet();
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'modifiers' | 'pricing'>('items');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemAdmin | null>(null);

  // New item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Hot Coffee');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemVeg, setNewItemVeg] = useState(true);

  const [categories, setCategories] = useState<string[]>(['All', 'Hot Coffee', 'Cold Coffee', 'Sandwiches', 'Pasta', 'Desserts', 'Bakery']);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [menuItems, setMenuItems] = useState<MenuItemAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLiveCatalog = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/catalog/22222222-2222-2222-2222-222222222222/menu`);
      if (res.ok) {
        const json = await res.json();
        const catMap: Record<string, string> = {};
        if (json.categories && json.categories.length > 0) {
          const catNames = ['All', ...json.categories.map((c: any) => {
            catMap[c.id] = c.name;
            return c.name;
          })];
          setCategories(catNames);
          setCategoryMap(catMap);
        }

        if (json.items && json.items.length > 0) {
          const mapped: MenuItemAdmin[] = json.items.map((it: any) => {
            const primaryPrice = it.variants?.[0]?.price ? parseFloat(it.variants[0].price) : 150;
            return {
              id: it.id,
              name: it.name,
              category: catMap[it.category_id] || 'Hot Coffee',
              categoryId: it.category_id,
              foodType: it.food_type === 'N' ? 'non_veg' : 'veg',
              hsnSac: it.hsn_sac || '996331',
              dineInPrice: primaryPrice,
              takeawayPrice: primaryPrice,
              swiggyPrice: Math.round(primaryPrice * 1.15),
              zomatoPrice: Math.round(primaryPrice * 1.15),
              isAvailable: it.is_active !== false,
            };
          });
          setMenuItems(mapped);
        }
      }
    } catch (e) {
      console.warn('Backend not reached in menu admin', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveCatalog();
  }, []);

  const toggleAvailability = async (id: string) => {
    const target = menuItems.find((m) => m.id === id);
    if (!target) return;
    const newStatus = !target.isAvailable;

    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isAvailable: newStatus } : item))
    );

    try {
      await fetch(`${getApiBaseUrl()}/catalog/items/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });
    } catch (e) {
      console.warn('Failed to sync item toggle to backend', e);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;

    const priceNum = parseFloat(newItemPrice);

    // Find category ID
    const catEntry = Object.entries(categoryMap).find(([_, name]) => name === newItemCategory);
    const categoryId = catEntry ? catEntry[0] : undefined;

    try {
      await fetch(`${getApiBaseUrl()}/catalog/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemName,
          price: priceNum,
          foodType: newItemVeg ? 'V' : 'N',
          categoryId,
          hsnSac: '996331',
        }),
      });
      await fetchLiveCatalog();
    } catch (e) {
      console.warn('Failed to save item to backend', e);
      const fallbackItem: MenuItemAdmin = {
        id: `item-${Date.now()}`,
        name: newItemName,
        category: newItemCategory,
        foodType: newItemVeg ? 'veg' : 'non_veg',
        hsnSac: '996331',
        dineInPrice: priceNum,
        takeawayPrice: priceNum,
        swiggyPrice: Math.round(priceNum * 1.15),
        zomatoPrice: Math.round(priceNum * 1.15),
        isAvailable: true,
      };
      setMenuItems([fallbackItem, ...menuItems]);
    }

    setShowAddItemModal(false);
    setNewItemName('');
    setNewItemPrice('');
  };

  const openAddModal = () => {
    setEditingItem(null);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemCategory(categories[1] || 'Hot Coffee');
    setNewItemVeg(true);
    setShowAddItemModal(true);
  };

  const openEditModal = (item: MenuItemAdmin) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setNewItemPrice(String(item.dineInPrice));
    setNewItemCategory(item.category);
    setNewItemVeg(item.foodType === 'veg');
    setShowAddItemModal(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !newItemName || !newItemPrice) return;
    const priceNum = parseFloat(newItemPrice);

    const catEntry = Object.entries(categoryMap).find(([_, name]) => name === newItemCategory);
    const categoryId = catEntry ? catEntry[0] : undefined;

    try {
      await fetch(`${getApiBaseUrl()}/catalog/items/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemName,
          price: priceNum,
          foodType: newItemVeg ? 'V' : 'N',
          categoryId,
        }),
      });
      await fetchLiveCatalog();
    } catch (e) {
      console.warn('Failed to update item:', e);
      setMenuItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                name: newItemName,
                category: newItemCategory,
                dineInPrice: priceNum,
                takeawayPrice: priceNum,
                swiggyPrice: Math.round(priceNum * 1.15),
                zomatoPrice: Math.round(priceNum * 1.15),
                foodType: newItemVeg ? 'veg' : 'non_veg',
              }
            : item
        )
      );
    }
    setShowAddItemModal(false);
    setEditingItem(null);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to remove this item from the active menu?')) return;
    try {
      await fetch(`${getApiBaseUrl()}/catalog/items/${id}`, {
        method: 'DELETE',
      });
      await fetchLiveCatalog();
    } catch (e) {
      console.warn('Failed to delete item:', e);
    }
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
  };

  const filteredItems = menuItems.filter((i) => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || i.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <ConsoleLayout
      title="Menu & Catalog"
      subtitle={`Manage catalog, channel pricing, and 86'd items for ${selectedOutlet?.name || 'Indiranagar (BLR01)'}`}
      actions={
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#E91E7B] hover:bg-[#D0156B] text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Add Menu Item</span>
        </button>
      }
    >
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          {[
            { id: 'items', label: 'Items & Variants' },
            { id: 'categories', label: 'Categories' },
            { id: 'modifiers', label: 'Modifiers & Add-ons' },
            { id: 'pricing', label: 'Channel Pricing Matrix' },
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

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items by name..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#3B4FE0] focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Main Items or Pricing Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">HSN / Tax</th>
                  {activeTab === 'pricing' ? (
                    <>
                      <th className="py-3 px-4 text-right">Dine-in (₹)</th>
                      <th className="py-3 px-4 text-right">Takeaway (₹)</th>
                      <th className="py-3 px-4 text-right">Swiggy (₹)</th>
                      <th className="py-3 px-4 text-right">Zomato (₹)</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-4 text-right">Base Price</th>
                      <th className="py-3 px-4 text-center">86'd / Live Stock</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {isLoading ? (
                  <TableRowSkeleton columns={activeTab === 'pricing' ? 7 : 6} rows={6} />
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'pricing' ? 7 : 6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Layers className="w-8 h-8 text-slate-300" />
                        <p className="font-bold text-slate-700 text-sm">No menu items found</p>
                        <p className="text-xs text-slate-400">Add dishes, beverages, or snacks to this category.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            item.foodType === 'veg' ? 'border-emerald-600' : 'border-rose-600'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.foodType === 'veg' ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          ></div>
                        </div>
                        <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600">
                      {item.category}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {item.hsnSac} (5% GST)
                    </td>

                    {activeTab === 'pricing' ? (
                      <>
                        <td className="py-3.5 px-4 text-right font-extrabold text-slate-800">
                          ₹{item.dineInPrice}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-slate-800">
                          ₹{item.takeawayPrice}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-amber-600">
                          ₹{item.swiggyPrice}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-rose-600">
                          ₹{item.zomatoPrice}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 text-sm">
                          ₹{item.dineInPrice}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleAvailability(item.id)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 mx-auto ${
                              item.isAvailable
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                : 'bg-rose-50 text-rose-700 border border-rose-300'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                item.isAvailable ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                            ></span>
                            <span>{item.isAvailable ? 'In Stock' : "86'd (Out)"}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition"
                              title="Edit Item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <form
            onSubmit={editingItem ? handleUpdateItem : handleCreateItem}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-black text-lg text-slate-900">
                {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddItemModal(false);
                  setEditingItem(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                Item Name
              </label>
              <input
                type="text"
                required
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. Vanilla Cold Brew"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4FE0]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                  Category
                </label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4FE0]"
                >
                  {categories.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                  Price (₹)
                </label>
                <input
                  type="number"
                  required
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  placeholder="e.g. 210"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4FE0]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                Dietary Type
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setNewItemVeg(true)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 ${
                    newItemVeg
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  Vegetarian
                </button>
                <button
                  type="button"
                  onClick={() => setNewItemVeg(false)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 ${
                    !newItemVeg
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                  Non-Veg
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="flex-1 py-2.5 text-slate-600 font-bold text-xs bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-[#E91E7B] hover:bg-[#D0156B] text-white font-bold text-xs rounded-xl shadow-sm"
              >
                {editingItem ? 'Update Item' : 'Save Item'}
              </button>
            </div>
          </form>
        </div>
      )}
    </ConsoleLayout>
  );
}
