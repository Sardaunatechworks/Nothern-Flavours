import React, { useState, useEffect } from 'react';
import { menuService } from '../../services/menuService';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCats = async () => {
    setLoading(true);
    try {
      const cats = await menuService.getCategories();
      setCategories(cats.filter((c) => c.slug !== 'all'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCats();
  }, []);

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const description = formData.get('description');
    const sort_order = parseInt(formData.get('sort_order') || '0', 10);
    const is_active = formData.get('is_active') === 'on';

    try {
      if (isSupabaseConfigured && supabase) {
        if (editingCategory?.id) {
          await supabase
            .from('categories')
            .update({ name, slug, description, sort_order, is_active })
            .eq('id', editingCategory.id);
        } else {
          await supabase.from('categories').insert({ name, slug, description, sort_order, is_active });
        }
      }

      Swal.fire({
        title: 'Saved',
        text: 'Category updated successfully',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });

      setIsModalOpen(false);
      setEditingCategory(null);
      fetchCats();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
            Menu Categories
          </h1>
          <p className="text-xs text-stone-500">
            Manage food divisions (Rice, Swallow, Proteins, Sides, Meals, Snacks, Drinks)
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCategory(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-forest-800 text-gold-400 font-bold text-xs shadow hover:bg-forest-700 transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Category</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-stone-400">Loading categories...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4">Slug</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-stone-400">#{cat.sort_order}</td>
                    <td className="py-3 px-4 font-bold text-forest-950">{cat.name}</td>
                    <td className="py-3 px-4 font-mono text-stone-500">{cat.slug}</td>
                    <td className="py-3 px-4 text-stone-500 max-w-xs truncate">{cat.description || '—'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          cat.is_active !== false
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {cat.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-stone-100 hover:bg-forest-800 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-stone-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif text-lg font-bold text-forest-950">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400">✕</button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Category Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingCategory?.name || ''}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Display Sort Order</label>
                <input
                  type="number"
                  name="sort_order"
                  defaultValue={editingCategory?.sort_order ?? 1}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingCategory?.description || ''}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-700">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={editingCategory ? editingCategory.is_active : true}
                />
                <span>Active in Menu Navigation</span>
              </label>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-forest-800 text-gold-400 font-bold rounded-xl shadow"
                >
                  Save Category
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

