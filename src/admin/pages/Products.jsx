import React, { useState, useEffect } from 'react';
import { menuService } from '../../services/menuService';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { formatNaira } from '../../utils/formatters';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Boxes,
  AlertCircle,
  UploadCloud,
  Link as LinkIcon,
  Loader2,
  X,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Local Image Upload States
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

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

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setSelectedFile(null);
    setImagePreview(null);
    setUrlInput('');
    setShowUrlInput(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setSelectedFile(null);
    setImagePreview(product.image_url || null);
    setUrlInput(product.image_url || '');
    setShowUrlInput(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setSelectedFile(null);
    setImagePreview(null);
    setUrlInput('');
    setShowUrlInput(false);
    setIsUploading(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('Invalid File', 'Please select a valid image file (PNG, JPG, WebP, AVIF).', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('File Too Large', 'Please select an image smaller than 5MB.', 'warning');
      return;
    }

    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDropFile = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('Invalid File', 'Please drop a valid image file (PNG, JPG, WebP, AVIF).', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('File Too Large', 'Please drop an image smaller than 5MB.', 'warning');
      return;
    }

    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setUrlInput('');
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const rawName = (formData.get('name') || '').trim();
    if (!rawName) {
      Swal.fire('Required Field', 'Please enter a product name.', 'warning');
      return;
    }

    const rawSku = (formData.get('sku') || '').trim();
    const sku = rawSku.length > 0 ? rawSku : null;
    const rawCategory = (formData.get('category_id') || '').trim();
    const category_id = rawCategory.length > 0 ? rawCategory : null;
    const rawDesc = (formData.get('description') || '').trim();
    const description = rawDesc.length > 0 ? rawDesc : null;

    const baseSlug = rawName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'product';

    try {
      setIsUploading(true);

      // 1. Handle Image: Local file upload to Supabase Storage or external link
      let finalImageUrl = editingProduct?.image_url || null;

      if (selectedFile) {
        if (isSupabaseConfigured && supabase) {
          const fileExt = selectedFile.name.split('.').pop().toLowerCase();
          const cleanExt = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'].includes(fileExt) ? fileExt : 'jpg';
          const cleanName = `menu-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${cleanExt}`;
          const filePath = `products/${cleanName}`;

          const { error: uploadError } = await supabase.storage
            .from('food-images')
            .upload(filePath, selectedFile, {
              cacheControl: '31536000',
              upsert: true,
            });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw new Error(`Failed to upload image to storage: ${uploadError.message}. Ensure migration 033 has been applied.`);
          }

          const { data: publicUrlData } = supabase.storage
            .from('food-images')
            .getPublicUrl(filePath);

          finalImageUrl = publicUrlData.publicUrl;
        }
      } else if (urlInput && urlInput.trim()) {
        finalImageUrl = urlInput.trim();
      } else if (!imagePreview) {
        finalImageUrl = null;
      }

      let finalSlug = editingProduct?.slug || baseSlug;

      if (isSupabaseConfigured && supabase) {
        // 2. Pre-check SKU uniqueness if SKU was provided
        if (sku) {
          let skuCheck = supabase
            .from('products')
            .select('id, name')
            .eq('sku', sku)
            .is('deleted_at', null);
          if (editingProduct?.id) {
            skuCheck = skuCheck.neq('id', editingProduct.id);
          }
          const { data: existingSku } = await skuCheck.maybeSingle();
          if (existingSku) {
            Swal.fire({
              title: 'Duplicate SKU Code',
              text: `The SKU "${sku}" is already used by "${existingSku.name}". Please enter a different SKU or leave it blank.`,
              icon: 'warning',
            });
            setIsUploading(false);
            return;
          }
        }

        // 3. Ensure Slug is collision-free
        if (!editingProduct?.id || editingProduct.name !== rawName) {
          let candidate = baseSlug;
          let counter = 1;
          let isUnique = false;

          while (!isUnique && counter <= 25) {
            let slugCheck = supabase
              .from('products')
              .select('id')
              .eq('slug', candidate);
            if (editingProduct?.id) {
              slugCheck = slugCheck.neq('id', editingProduct.id);
            }
            const { data: slugMatch } = await slugCheck.maybeSingle();
            if (!slugMatch) {
              isUnique = true;
            } else {
              candidate = `${baseSlug}-${counter}`;
              counter++;
            }
          }
          finalSlug = isUnique ? candidate : `${baseSlug}-${Date.now().toString(36)}`;
        }
      }

      const productPayload = {
        name: rawName,
        slug: finalSlug,
        description,
        category_id,
        price: parseFloat(formData.get('price')) || 0,
        cost_price: formData.get('cost_price') ? parseFloat(formData.get('cost_price')) : null,
        sku,
        stock_quantity: parseInt(formData.get('stock_quantity') || '0', 10),
        low_stock_threshold: parseInt(formData.get('low_stock_threshold') || '5', 10),
        track_stock: formData.get('track_stock') === 'on',
        is_available: formData.get('is_available') === 'on',
        is_featured: formData.get('is_featured') === 'on',
        is_favourite: formData.get('is_favourite') === 'on',
        image_url: finalImageUrl,
      };

      if (isSupabaseConfigured && supabase) {
        if (editingProduct?.id) {
          const { error: updateError } = await supabase
            .from('products')
            .update(productPayload)
            .eq('id', editingProduct.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('products')
            .insert([productPayload]);
          if (insertError) throw insertError;
        }
      }

      Swal.fire({
        title: 'Saved!',
        text: 'Product information updated successfully.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });

      handleCloseModal();
      fetchData();
    } catch (err) {
      console.error('Error saving product:', err);
      let userMsg = err.message || 'Failed to save product.';
      if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('unique constraint')) {
        if (err.message?.includes('sku') || err.details?.includes('sku')) {
          userMsg = 'A product with this SKU code already exists. Please change or remove the SKU code.';
        } else if (err.message?.includes('slug') || err.details?.includes('slug')) {
          userMsg = 'A product with this name already exists. Please slightly modify the product name.';
        } else {
          userMsg = 'A unique constraint was violated. A product with these details already exists.';
        }
      }
      Swal.fire('Error Saving Product', userMsg, 'error');
    } finally {
      setIsUploading(false);
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
          onClick={handleOpenAddModal}
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
                            onClick={() => handleOpenEditModal(prod)}
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
                type="button"
                onClick={handleCloseModal}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
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

              {/* Menu Item Image Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-700">Dish Photo</label>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[11px] text-forest-700 hover:text-forest-900 font-semibold inline-flex items-center gap-1 transition-colors"
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>{showUrlInput ? 'Hide link input' : 'Or paste web link'}</span>
                  </button>
                </div>

                {imagePreview ? (
                  <div className="relative group rounded-2xl border-2 border-dashed border-stone-200 overflow-hidden bg-stone-50 p-2">
                    <div className="relative h-44 w-full rounded-xl overflow-hidden bg-stone-900/5 flex items-center justify-center">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/95 hover:bg-white text-stone-800 text-xs font-bold inline-flex items-center gap-1.5 shadow">
                          <UploadCloud className="w-4 h-4 text-forest-800" />
                          <span>Change Photo</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp, image/avif"
                            className="hidden"
                            onChange={handleFileSelect}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-stone-500">
                      <span className="truncate max-w-[200px]">
                        {selectedFile ? selectedFile.name : (editingProduct ? 'Current dish photo' : 'Image ready')}
                      </span>
                      {selectedFile && (
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDropFile}
                    className={`relative border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                      isDragging
                        ? 'border-forest-600 bg-forest-50/50'
                        : 'border-stone-300 hover:border-forest-500 bg-stone-50/50 hover:bg-forest-50/20'
                    }`}
                  >
                    <input
                      type="file"
                      id="product-photo-upload"
                      accept="image/png, image/jpeg, image/jpg, image/webp, image/avif"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <label htmlFor="product-photo-upload" className="cursor-pointer block space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-forest-100 text-forest-800 flex items-center justify-center shadow-sm">
                        <UploadCloud className="w-6 h-6 stroke-[2]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-forest-950">
                          Click to upload or drag & drop photo from your computer
                        </p>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          PNG, JPG, WebP, AVIF (Max 5MB)
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {showUrlInput && (
                  <div className="pt-1">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        if (e.target.value.trim()) {
                          setImagePreview(e.target.value.trim());
                          setSelectedFile(null);
                        }
                      }}
                      placeholder="https://example.com/photo.jpg"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800 text-xs"
                    />
                  </div>
                )}
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
                  disabled={isUploading}
                  className="flex-1 py-2.5 bg-forest-800 hover:bg-forest-700 text-gold-400 font-bold rounded-xl shadow flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
                      <span>Uploading & Saving...</span>
                    </>
                  ) : (
                    <span>Save Product</span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold rounded-xl transition-colors disabled:opacity-50"
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

