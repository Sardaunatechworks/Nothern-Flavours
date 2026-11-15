import React, { useState, useEffect } from 'react';
import { cashierService } from '../services/cashierService';
import {
  Receipt,
  Search,
  Printer,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import ThermalReceiptModal from '../components/ThermalReceiptModal';

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await cashierService.getReceipts({
        search: searchTerm,
        limit: 100,
      });
      setReceipts(data);
    } catch (err) {
      console.error('Failed to load receipts:', err);
      setError(err.message || 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadReceipts();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-forest-950">
            Receipts History
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Search, print, and reprint customer sales receipts and invoice vouchers
          </p>
        </div>

        <button
          onClick={loadReceipts}
          disabled={loading}
          className="p-2.5 bg-stone-100 hover:bg-stone-200 rounded-xl transition inline-flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 text-stone-700 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Receipt Number (e.g. REC-20261115-0001)..."
          className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-stone-200 text-xs focus:ring-2 focus:ring-forest-800 shadow-sm"
        />
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Receipts Table (Section 11: Receipt #, Order #, Amount, Order type, Issued date, Cashier, Print/reprint) */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/70 text-stone-500 uppercase font-semibold">
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Order Type</th>
                <th className="py-3 px-4">Issued Date</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4 text-center">Reprints</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-stone-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-forest-800" />
                    Loading receipts...
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-stone-400">
                    No receipts found.
                  </td>
                </tr>
              ) : (
                receipts.map((rc) => {
                  const amount = Number(rc.order?.total_amount || rc.payment?.amount || 0);
                  const orderType = rc.order?.order_type || rc.metadata?.order_type || 'dine_in';

                  return (
                    <tr key={rc.id} className="hover:bg-stone-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-forest-950">
                        {rc.receipt_number}
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-600">
                        {rc.order?.order_number || 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-serif font-bold text-forest-900">
                        ₦{amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-bold uppercase">
                          {orderType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                        {new Date(rc.issued_at).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        {rc.cashier?.full_name || 'Cashier'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {rc.reprint_count > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                            {rc.reprint_count}x
                          </span>
                        ) : (
                          <span className="text-stone-400 font-mono">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedReceipt(rc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-forest-800 text-gold-300 hover:bg-forest-900 font-bold text-xs rounded-xl transition shadow-sm"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print / Reprint</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReceipt && (
        <ThermalReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          onReprintSuccess={(updated) => {
            setReceipts((prev) =>
              prev.map((r) =>
                r.id === updated.receipt_id ? { ...r, reprint_count: updated.reprint_count } : r
              )
            );
          }}
        />
      )}
    </div>
  );
}
