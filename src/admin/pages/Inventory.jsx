import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { formatNaira, formatDateLagos } from '../../utils/formatters';
import {
  Boxes,
  PlusCircle,
  SlidersHorizontal,
  History,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Search,
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'history'
  const [search, setSearch] = useState('');
  const [stockModal, setStockModal] = useState(null); // { type: 'in' | 'adjust', product }

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prods, movs] = await Promise.all([
        inventoryService.getInventoryProducts(),
        inventoryService.getMovements(),
      ]);
      setProducts(prods);
      setMovements(movs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStockAction = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const prod = stockModal.product;
    const qty = parseInt(formData.get('quantity'), 10);
    const reason = formData.get('reason');

    try {
      if (stockModal.type === 'in') {
        await inventoryService.addStock(prod.id, qty, reason);
        Swal.fire('Restocked', `Added ${qty} items to ${prod.name}`, 'success');
      } else {
        const movementType = formData.get('movement_type');
        const direction = formData.get('direction') === 'reduce' ? -qty : qty;
        await inventoryService.adjustStock(prod.id, direction, movementType, reason);
        Swal.fire('Adjusted', `Inventory updated for ${prod.name}`, 'success');
      }

      setStockModal(null);
      fetchData();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  // Stock valuation calculations
  const totalItemsCount = products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
  const retailValuation = products.reduce((sum, p) => sum + (p.stock_quantity || 0) * (p.price || 0), 0);
  const costValuation = products.reduce((sum, p) => sum + (p.stock_quantity || 0) * (p.cost_price || 0), 0);
  const lowStockCount = products.filter((p) => p.track_stock && p.stock_quantity <= p.low_stock_threshold).length;

  const filteredProducts = products.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
            Inventory & Stock
          </h1>
          <p className="text-xs text-stone-500">
            Product quantity tracking, stock-in replenishment, adjustments, and movement auditing
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-stone-200 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'stock' ? 'bg-white text-forest-950 shadow-sm' : 'text-stone-600'
            }`}
          >
            Product Quantities
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'history' ? 'bg-white text-forest-950 shadow-sm' : 'text-stone-600'
            }`}
          >
            Movement Audit Log
          </button>
        </div>
      </div>

      {/* Valuation & Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-soft">
          <span className="text-[11px] font-semibold text-stone-500">Total Units in Stock</span>
          <p className="font-serif text-2xl font-bold text-forest-950 mt-1">{totalItemsCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-soft">
          <span className="text-[11px] font-semibold text-stone-500">Estimated Cost Valuation</span>
          <p className="font-serif text-2xl font-bold text-forest-900 mt-1">{formatNaira(costValuation)}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-soft">
          <span className="text-[11px] font-semibold text-stone-500">Potential Retail Value</span>
          <p className="font-serif text-2xl font-bold text-emerald-800 mt-1">{formatNaira(retailValuation)}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-soft">
          <span className="text-[11px] font-semibold text-stone-500">Low Stock Warnings</span>
          <p className="font-serif text-2xl font-bold text-amber-600 mt-1">{lowStockCount} items</p>
        </div>
      </div>

      {activeTab === 'stock' ? (
        /* Stock List View */
        <div className="space-y-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product stock..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-forest-800"
            />
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Dish</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Stock Level</th>
                    <th className="py-3 px-4">Low Alert Level</th>
                    <th className="py-3 px-4">Cost / Unit</th>
                    <th className="py-3 px-4">Total Value</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                  {filteredProducts.map((prod) => {
                    const isLow = prod.track_stock && prod.stock_quantity <= prod.low_stock_threshold;
                    return (
                      <tr key={prod.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-forest-950">{prod.name}</td>
                        <td className="py-3.5 px-4 font-mono text-stone-400">{prod.sku || '—'}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              prod.stock_quantity === 0
                                ? 'bg-red-100 text-red-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isLow && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                            <span>{prod.stock_quantity} units</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-500">≤ {prod.low_stock_threshold} units</td>
                        <td className="py-3.5 px-4 text-stone-500">
                          {prod.cost_price ? formatNaira(prod.cost_price) : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-forest-900">
                          {formatNaira(prod.stock_quantity * prod.price)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setStockModal({ type: 'in', product: prod })}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-colors"
                            >
                              + Restock
                            </button>
                            <button
                              onClick={() => setStockModal({ type: 'adjust', product: prod })}
                              className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 text-xs font-bold transition-colors"
                            >
                              Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Audit Movements View */
        <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Previous → New</th>
                  <th className="py-3 px-4">Reason / Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                {movements.length > 0 ? (
                  movements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-stone-50/60">
                      <td className="py-3 px-4 text-stone-400">{formatDateLagos(mov.created_at)}</td>
                      <td className="py-3 px-4 font-bold text-forest-950">
                        {mov.product?.name || 'Product'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            mov.movement_type === 'stock_in'
                              ? 'bg-emerald-100 text-emerald-800'
                              : mov.movement_type === 'order_deduction'
                              ? 'bg-blue-100 text-blue-800'
                              : mov.movement_type === 'order_reversal'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-stone-100 text-stone-800'
                          }`}
                        >
                          {mov.movement_type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold">
                        {mov.movement_type === 'stock_in' || mov.movement_type === 'order_reversal'
                          ? `+${mov.quantity}`
                          : `-${mov.quantity}`}
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-500">
                        {mov.previous_quantity} → {mov.new_quantity}
                      </td>
                      <td className="py-3 px-4 text-stone-600 max-w-xs truncate">{mov.reason || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-stone-400">
                      No stock movement audit records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock In / Adjustment Modal */}
      {stockModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-stone-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif text-lg font-bold text-forest-950">
                {stockModal.type === 'in' ? 'Record Stock In' : 'Manual Inventory Adjustment'}
              </h3>
              <button onClick={() => setStockModal(null)} className="text-stone-400">✕</button>
            </div>

            <div className="p-3 rounded-xl bg-forest-50 border border-forest-100 text-xs">
              <p className="font-bold text-forest-950">{stockModal.product.name}</p>
              <p className="text-stone-500">Current Stock: {stockModal.product.stock_quantity} units</p>
            </div>

            <form onSubmit={handleStockAction} className="space-y-4 text-xs">
              {stockModal.type === 'adjust' && (
                <>
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700">Direction</label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center justify-center p-2 rounded-xl border border-stone-200 cursor-pointer">
                        <input type="radio" name="direction" value="reduce" defaultChecked className="mr-2" />
                        <span>Reduce (-)</span>
                      </label>
                      <label className="flex items-center justify-center p-2 rounded-xl border border-stone-200 cursor-pointer">
                        <input type="radio" name="direction" value="add" className="mr-2" />
                        <span>Increase (+)</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-stone-700">Movement Type</label>
                    <select
                      name="movement_type"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800 bg-white"
                    >
                      <option value="adjustment">Manual Adjustment</option>
                      <option value="waste">Kitchen Waste / Spoilage</option>
                      <option value="damaged">Damaged Goods</option>
                      <option value="stock_out">Manual Stock-Out</option>
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  name="quantity"
                  defaultValue="10"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Audit Reason *</label>
                <input
                  type="text"
                  required
                  name="reason"
                  placeholder="e.g. Weekly vendor delivery from Yalwawa market"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-forest-800 text-gold-400 font-bold rounded-xl shadow"
                >
                  Save Movement
                </button>
                <button
                  type="button"
                  onClick={() => setStockModal(null)}
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
