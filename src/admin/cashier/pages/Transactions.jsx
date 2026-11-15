import React, { useState, useEffect } from 'react';
import { cashierService } from '../services/cashierService';
import {
  FileText,
  Search,
  Calendar,
  Filter,
  Receipt,
  Download,
  RefreshCw,
  Loader2,
  DollarSign,
  Building,
  CreditCard,
  Split,
} from 'lucide-react';
import ThermalReceiptModal from '../components/ThermalReceiptModal';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await cashierService.getPOSTransactions({
        date: dateFilter || null,
        limit: 100,
      });
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load POS transactions:', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [dateFilter]);

  const filtered = transactions.filter((tx) => {
    const matchesMethod = methodFilter === 'all' || tx.payment_method === methodFilter;
    const matchesSearch =
      !searchTerm ||
      tx.transaction_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.customer_name && tx.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.order?.order_number && tx.order.order_number.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesMethod && matchesSearch;
  });

  const totalAmount = filtered.reduce((sum, tx) => sum + Number(tx.total), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-forest-950">
            Counter Transactions Log
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Complete audit trail of all walk-in POS counter sales and payment settlements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 text-xs font-semibold focus:ring-1 focus:ring-forest-800"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-stone-500 hover:text-stone-800 font-semibold px-2 py-1"
            >
              Clear
            </button>
          )}
          <button
            onClick={loadTransactions}
            disabled={loading}
            className="p-2.5 bg-stone-100 hover:bg-stone-200 rounded-xl transition"
            title="Refresh transactions"
          >
            <RefreshCw className={`w-4 h-4 text-stone-700 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Transaction #, Customer, or Order Ref..."
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-stone-200 text-xs focus:ring-2 focus:ring-forest-800 shadow-sm"
          />
        </div>

        <div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-white rounded-2xl border border-stone-200 text-xs font-semibold focus:ring-1 focus:ring-forest-800 shadow-sm"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash Only</option>
            <option value="bank_transfer">Bank Transfer Only</option>
            <option value="pos_terminal">POS Card Terminal Only</option>
            <option value="split">Split Payments Only</option>
          </select>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between text-xs">
          <span className="text-stone-500 font-medium">Filtered Total:</span>
          <span className="font-serif font-black text-sm text-forest-950">
            ₦{totalAmount.toLocaleString()} ({filtered.length})
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/70 text-stone-500 uppercase font-semibold">
                <th className="py-3 px-4">Transaction #</th>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Subtotal</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Total Paid</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-stone-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-forest-800" />
                    Loading transactions...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-stone-400">
                    No transactions found for the specified filters.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-stone-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-forest-950">
                      {tx.transaction_number}
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-600">
                      {tx.order?.order_number || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-800">
                      {tx.customer_name || 'Walk-in Customer'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold text-[10px] uppercase">
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-600">
                      ₦{Number(tx.subtotal).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-emerald-700 font-medium">
                      {Number(tx.discount_amount) > 0 ? `-₦${Number(tx.discount_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-4 font-serif font-black text-forest-950 text-sm">
                      ₦{Number(tx.total).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-stone-600">
                      {tx.cashier?.full_name || 'Cashier'}
                    </td>
                    <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                      {new Date(tx.completed_at).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() =>
                          setSelectedReceipt({
                            id: tx.id,
                            receipt_number: `REC-${tx.transaction_number.replace('POS-', '')}`,
                            issued_at: tx.completed_at,
                            reprint_count: 0,
                            order: tx.order,
                            payment: {
                              payment_method: tx.payment_method,
                              amount: tx.total,
                            },
                            cashier: tx.cashier,
                            metadata: {
                              customer_name: tx.customer_name,
                              order_number: tx.order?.order_number,
                            },
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-[11px] transition"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Slip</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReceipt && (
        <ThermalReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
