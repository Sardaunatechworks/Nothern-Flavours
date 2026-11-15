import React, { useState, useEffect } from 'react';
import { cashierService } from '../services/cashierService';
import { useShift } from '../context/ShiftContext';
import {
  Clock,
  Unlock,
  Lock,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { OpenShiftModal, CloseShiftModal, CashMovementModal } from '../components/ShiftModals';

export default function Shifts() {
  const { activeShift, isShiftOpen, loadingShift, refreshShift } = useShift();
  const [shiftHistory, setShiftHistory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [error, setError] = useState('');

  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [cashMoveModal, setCashMoveModal] = useState(false);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      setError('');
      const data = await cashierService.getShiftHistory({ limit: 50 });
      setShiftHistory(data);
    } catch (err) {
      console.error('Failed to load shift history:', err);
      setError(err.message || 'Failed to load shifts');
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadMovements = async (shiftId) => {
    if (!shiftId) {
      setMovements([]);
      return;
    }
    try {
      setLoadingMovements(true);
      const data = await cashierService.getShiftMovements(shiftId);
      setMovements(data);
    } catch (err) {
      console.error('Failed to load shift movements:', err);
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (activeShift?.id) {
      loadMovements(activeShift.id);
    } else {
      setMovements([]);
    }
  }, [activeShift]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-forest-950">
            Cashier Shift & Drawer Reconciliation
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Register work sessions, cash floats, drawer movements, and closing counts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isShiftOpen ? (
            <>
              <button
                onClick={() => setCashMoveModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition"
              >
                <ArrowLeftRight className="w-4 h-4 text-forest-800" />
                <span>Cash In / Out</span>
              </button>
              <button
                onClick={() => setCloseModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                <Lock className="w-4 h-4" />
                <span>Close Shift</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setOpenModal(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-forest-800 hover:bg-forest-900 text-gold-300 text-xs font-bold rounded-xl transition shadow-md"
            >
              <Unlock className="w-4 h-4" />
              <span>Open New Shift</span>
            </button>
          )}

          <button
            onClick={() => {
              refreshShift();
              loadHistory();
            }}
            className="p-2.5 bg-stone-100 hover:bg-stone-200 rounded-xl transition"
            title="Refresh shift data"
          >
            <RefreshCw className="w-4 h-4 text-stone-700" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
          {error}
        </div>
      )}

      {/* ACTIVE SHIFT SUMMARY CARD */}
      {isShiftOpen ? (
        <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-lg text-forest-950">
                    Active Session: {activeShift.shift_number}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                    Open Register
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Opened on {new Date(activeShift.opened_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-stone-500 block">Current Drawer Balance</span>
              <span className="font-serif font-black text-2xl text-emerald-800">
                ₦{Number(activeShift.expected_cash || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
              <span className="text-stone-500 block">Initial Float</span>
              <span className="font-serif font-bold text-base text-stone-900 mt-1 block">
                ₦{Number(activeShift.opening_cash || 0).toLocaleString()}
              </span>
            </div>
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
              <span className="text-stone-500 block">Cash Movements</span>
              <span className="font-serif font-bold text-base text-forest-950 mt-1 block">
                {movements.length} logged
              </span>
            </div>
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
              <span className="text-stone-500 block">Register Status</span>
              <span className="font-bold text-emerald-700 mt-1 inline-flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Normal Operational
              </span>
            </div>
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
              <span className="text-stone-500 block">Shift Notes</span>
              <span className="text-stone-700 mt-1 block truncate">
                {activeShift.notes || 'None recorded'}
              </span>
            </div>
          </div>

          {/* Movements Ledger Table for this Shift */}
          <div className="space-y-3 pt-2">
            <h4 className="font-serif font-bold text-sm text-forest-950">
              Active Shift Cash Drawer Ledger
            </h4>
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 uppercase font-semibold border-b border-stone-200">
                    <th className="py-2.5 px-4">Time</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Amount</th>
                    <th className="py-2.5 px-4">Reason / Narration</th>
                    <th className="py-2.5 px-4">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {loadingMovements ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-stone-400">
                        Loading ledger movements...
                      </td>
                    </tr>
                  ) : movements.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-stone-400">
                        No cash transactions recorded in this shift yet.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => (
                      <tr key={m.id} className="hover:bg-stone-50 transition">
                        <td className="py-2.5 px-4 text-stone-500 font-mono">
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              m.movement_type === 'sale'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.movement_type === 'in'
                                ? 'bg-blue-100 text-blue-800'
                                : m.movement_type === 'out'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {m.movement_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-serif font-bold text-stone-900">
                          {m.movement_type === 'out' || m.movement_type === 'refund' ? '-' : '+'}₦{Number(m.amount).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-stone-700">{m.reason || '—'}</td>
                        <td className="py-2.5 px-4 font-mono text-stone-500">{m.reference || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-base text-forest-950">No Active Shift Open</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Your counter register is currently closed. Click "Open New Shift" to declare your starting cash float and begin taking orders.
          </p>
          <button
            onClick={() => setOpenModal(true)}
            className="px-5 py-2.5 bg-forest-800 hover:bg-forest-900 text-gold-300 font-bold text-xs rounded-xl transition shadow-sm inline-flex items-center gap-1.5"
          >
            <Unlock className="w-4 h-4" />
            <span>Open Shift Register</span>
          </button>
        </div>
      )}

      {/* PAST SHIFTS AUDIT HISTORY TABLE */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
        <div>
          <h3 className="font-serif font-bold text-lg text-forest-950">
            Closed Shift History & Reconciliation
          </h3>
          <p className="text-xs text-stone-500">
            Archived register records with expected vs. actual closing cash audits
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/70 text-stone-500 uppercase font-semibold">
                <th className="py-3 px-4">Shift #</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Opened</th>
                <th className="py-3 px-4">Closed</th>
                <th className="py-3 px-4">Opening Float</th>
                <th className="py-3 px-4">Expected Cash</th>
                <th className="py-3 px-4">Actual Counted</th>
                <th className="py-3 px-4">Difference</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loadingHistory ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-stone-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-forest-800" />
                    Loading shift history...
                  </td>
                </tr>
              ) : shiftHistory.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-stone-400">
                    No past shifts found.
                  </td>
                </tr>
              ) : (
                shiftHistory.map((s) => {
                  const diff = Number(s.cash_difference || 0);
                  const isClosed = s.status === 'closed';

                  return (
                    <tr key={s.id} className="hover:bg-stone-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-forest-950">
                        {s.shift_number}
                      </td>
                      <td className="py-3 px-4 font-medium text-stone-800">
                        {s.cashier?.full_name || 'Cashier'}
                      </td>
                      <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                        {new Date(s.opened_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        {new Date(s.opened_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                        {s.closed_at
                          ? new Date(s.closed_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="py-3 px-4 font-serif text-stone-700">
                        ₦{Number(s.opening_cash).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-serif text-stone-900 font-bold">
                        ₦{Number(s.expected_cash).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-serif text-stone-900 font-bold">
                        {s.closing_cash !== null ? `₦${Number(s.closing_cash).toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        {!isClosed ? (
                          <span className="text-stone-400 font-mono">—</span>
                        ) : diff === 0 ? (
                          <span className="text-emerald-700 font-bold">₦0 (Exact)</span>
                        ) : diff > 0 ? (
                          <span className="text-blue-700 font-bold">
                            +₦{diff.toLocaleString()} (Surplus)
                          </span>
                        ) : (
                          <span className="text-red-700 font-bold">
                            -₦{Math.abs(diff).toLocaleString()} (Shortage)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            s.status === 'open'
                              ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <OpenShiftModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        onSuccess={() => {
          refreshShift();
          loadHistory();
        }}
      />
      <CloseShiftModal
        isOpen={closeModal}
        onClose={() => setCloseModal(false)}
        onSuccess={() => {
          refreshShift();
          loadHistory();
        }}
      />
      <CashMovementModal
        isOpen={cashMoveModal}
        onClose={() => setCashMoveModal(false)}
        onSuccess={() => {
          refreshShift();
          if (activeShift?.id) loadMovements(activeShift.id);
        }}
      />
    </div>
  );
}

