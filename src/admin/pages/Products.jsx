import React, { useState, useEffect } from 'react';
import { menuService } from '../../services/menuService';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { formatNaira } from '../../utils/formatters';
import { Plus, Search, Edit2, Trash2, Eye, EyeOff, Boxes, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([
        menuService.getCategories(),
        menuService.getProducts(),
      ]);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleAvailability = async (product) => {
    const newStatus = !product.is_available;
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('products')
        .update({ is_available: newStatus })
        .eq('id', product.id);
    }
    setProducts(products.map((p) => (p.id === product.id ? { ...p, is_available: newStatus } : p)));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const productPayload = {
      name: formData.get('name'),
      slug: formData.get('name').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      description: formData.get('description'),
      category_id: formData.get('category_id'),
      price: parseFloat(formData.get('price')),
      cost_price: formData.get('cost_price') ? parseFloat(formData.get('cost_price')) : null,
      sku: formData.get('sku'),
      stock_quantity: parseInt(formData.get('stock_quantity') || '0', 10),
      low_stock_threshold: parseInt(formData.get('low_stock_threshold') || '5', 10),
      track_stock: formData.get('track_stock') === 'on',
      is_available: formData.get('is_available') === 'on',
      is_featured: formData.get('is_featured') === 'on',
      is_favourite: formData.get('is_favourite') === 'on',
      image_url: formData.get('image_url'),
    };

    try {
      if (isSupabaseConfigured && supabase) {
        if (editingProduct?.id) {
          await supabase
            .from('products')
            .update(productPayload)
            .eq('id', editingProduct.id);
        } else {
          await supabase.from('products').insert(productPayload);
        }
      }

      Swal.fire({
        title: 'Saved!',
        text: 'Product information updated successfully.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });

      setIsModalOpen(false);
      setEditingProduct(null);
      fetchData();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleDeleteProduct = async (product) => {
    const res = await Swal.fire({
      title: `Archive ${product.name}?`,
      text: 'Archived products will no longer be visible on the public ordering menu.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Yes, Archive Product',
    });

    if (res.isConfirmed) {
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('products')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', product.id);
      }
      setProducts(products.filter((p) => p.id !== product.id));
      Swal.fire('Archived', `${product.name} archived successfully.`, 'success');
    }
  };

  const filtered = products.filter((p) => {
    const matchesCat = categoryFilter === 'all' || p.category_id === categoryFilter;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
            Menu Products
          </h1>
          <p className="text-xs text-stone-500">
            Create, edit, price, and manage meal items in the ordering catalog
          </p>
        </div>

        <button
          onClick={() => {
            setEditingProduct(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-forest-800 text-gold-400 font-bold text-xs shadow hover:bg-forest-700 transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-3.5 rounded-2xl border border-stone-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by meal name or SKU..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-forest-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-stone-500 shrink-0">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-forest-800 bg-white"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.slug === 'all' ? 'all' : c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-forest-800 border-t-gold-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-stone-400">Loading catalog...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Dish</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Cost Price</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                {filtered.map((prod) => {
                  const isLow = prod.track_stock && prod.stock_quantity <= prod.low_stock_threshold;
                  return (
                    <tr key={prod.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=100&q=80'}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover bg-stone-100 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-forest-950">{prod.name}</p>
                            <p className="text-[10px] text-stone-400 line-clamp-1">{prod.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-500">{prod.sku || '—'}</td>
                      <td className="py-3 px-4 font-bold text-forest-900">{formatNaira(prod.price)}</td>
                      <td className="py-3 px-4 text-stone-500">
                        {prod.cost_price ? formatNaira(prod.cost_price) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {prod.track_stock ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              prod.stock_quantity === 0
                                ? 'bg-red-100 text-red-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {prod.stock_quantity} left
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[11px]">Untracked</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleAvailability(prod)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                            prod.is_available
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {prod.is_available ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{prod.is_available ? 'Available' : 'Hidden'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProduct(prod);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-stone-100 hover:bg-forest-800 hover:text-white transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            className="p-1.5 rounded-lg bg-stone-100 hover:bg-rose-700 hover:text-white transition-colors"
                            title="Archive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-stone-200 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif text-lg font-bold text-forest-950">
                {editingProduct ? 'Edit Menu Product' : 'Add New Menu Product'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingProduct(null);
                }}
                className="text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Dish Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingProduct?.name || ''}
                  placeholder="e.g. Special Northern Rice"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Category *</label>
                  <select
                    name="category_id"
                    defaultValue={editingProduct?.category_id || categories[1]?.id}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800 bg-white"
                  >
                    {categories
                      .filter((c) => c.slug !== 'all')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700">SKU Code</label>
                  <input
                    type="text"
                    name="sku"
                    defaultValue={editingProduct?.sku || ''}
                    placeholder="e.g. MEL-01"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Selling Price (₦) *</label>
                  <input
                    type="number"
                    step="50"
                    name="price"
                    required
                    defaultValue={editingProduct?.price || ''}
                    placeholder="1800"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Cost Price (₦)</label>
                  <input
                    type="number"
                    step="50"
                    name="cost_price"
                    defaultValue={editingProduct?.cost_price || ''}
                    placeholder="900"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Current Stock Quantity</label>
                  <input
                    type="number"
                    name="stock_quantity"
                    defaultValue={editingProduct?.stock_quantity ?? 50}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Low Stock Alert Level</label>
                  <input
                    type="number"
                    name="low_stock_threshold"
                    defaultValue={editingProduct?.low_stock_threshold ?? 8}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Image URL</label>
                <input
                  type="url"
                  name="image_url"
                  defaultValue={editingProduct?.image_url || ''}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Description</label>
                <textarea
                  rows={2}
                  name="description"
                  defaultValue={editingProduct?.description || ''}
                  placeholder="Describe meal ingredients and taste..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-700">
                  <input
                    type="checkbox"
                    name="track_stock"
                    defaultChecked={editingProduct ? editingProduct.track_stock : true}
                  />
                  <span>Track Stock Quantities</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-700">
                  <input
                    type="checkbox"
                    name="is_available"
                    defaultChecked={editingProduct ? editingProduct.is_available : true}
                  />
                  <span>Publicly Available</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-700">
                  <input
                    type="checkbox"
                    name="is_favourite"
                    defaultChecked={editingProduct ? editingProduct.is_favourite : false}
                  />
                  <span>Customer Favourite</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-700">
                  <input
                    type="checkbox"
                    name="is_featured"
                    defaultChecked={editingProduct ? editingProduct.is_featured : false}
                  />
                  <span>Featured Dish</span>
                </label>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-forest-800 hover:bg-forest-700 text-gold-400 font-bold rounded-xl shadow"
                >
                  Save Product
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-stone-200 text-stone-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
