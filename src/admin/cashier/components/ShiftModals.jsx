import React, { useState } from 'react';
import { X, Lock, Unlock, ArrowDownRight, ArrowUpRight, AlertCircle, Loader2 } from 'lucide-react';
import { useShift } from '../context/ShiftContext';

export function OpenShiftModal({ isOpen, onClose, onSuccess }) {
  const { openShift } = useShift();
  const [openingCash, setOpeningCash] = useState('5000');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await openShift({
        openingCash: parseFloat(openingCash) || 0,
        notes: notes.trim(),
      });
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to open shift');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2 text-forest-900">
            <Unlock className="w-5 h-5 text-emerald-600" />
            <h3 className="font-serif font-bold text-lg">Open Cashier Shift</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Starting Cash Float (₦)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              required
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-forest-800"
              placeholder="e.g. 5000"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Count the physical cash in drawer before starting transactions.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Shift Notes / Counter Tag
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-forest-800"
              placeholder="e.g. Morning counter station 1"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-forest-800 text-gold-300 rounded-xl text-xs font-bold hover:bg-forest-900 flex items-center justify-center gap-1.5 shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Open Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CloseShiftModal({ isOpen, onClose, onSuccess }) {
  const { activeShift, closeShift } = useShift();
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !activeShift) return null;

  const expectedCash = Number(activeShift.expected_cash) || 0;
  const actualCash = parseFloat(closingCash) || 0;
  const difference = closingCash !== '' ? actualCash - expectedCash : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (closingCash === '') {
      setError('Please enter the counted closing cash in drawer.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await closeShift({
        closingCash: actualCash,
        notes: notes.trim(),
      });
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to close shift');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2 text-forest-900">
            <Lock className="w-5 h-5 text-amber-600" />
            <h3 className="font-serif font-bold text-lg">Close Register Shift</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Expected vs Actual Breakdown */}
        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
          <div className="flex justify-between text-stone-600">
            <span>Shift Identifier:</span>
            <span className="font-mono font-bold text-forest-900">{activeShift.shift_number}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Opening Float:</span>
            <span className="font-semibold">₦{Number(activeShift.opening_cash).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-stone-800 pt-1 border-t border-stone-200">
            <span>System Expected Cash:</span>
            <span className="text-forest-900 text-sm">₦{expectedCash.toLocaleString()}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Actual Physical Cash Counted (₦)
            </label>
            <input
              type="number"
              min="0"
              step="50"
              required
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-base font-bold focus:outline-none focus:ring-2 focus:ring-forest-800"
              placeholder="e.g. 45200"
            />
          </div>

          {closingCash !== '' && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between font-bold ${
                difference === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : difference > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <span>Cash Drawer Difference:</span>
              <span>
                {difference > 0 ? `+₦${difference.toLocaleString()} (Overage)` : difference < 0 ? `-₦${Math.abs(difference).toLocaleString()} (Shortage)` : '₦0 (Exact Match)'}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Closing Handover Notes
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-forest-800"
              placeholder="Explain any discrepancies or handover notes"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 flex items-center justify-center gap-1.5 shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reconcile & Close Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CashMovementModal({ isOpen, onClose, onSuccess }) {
  const { activeShift, recordCashMovement } = useShift();
  const [movementType, setMovementType] = useState('in');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !activeShift) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for the cash movement.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await recordCashMovement({
        movementType,
        amount: parseFloat(amount),
        reason: reason.trim(),
        reference: reference.trim() || null,
      });
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record cash movement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2 text-forest-900">
            {movementType === 'in' ? (
              <ArrowDownRight className="w-5 h-5 text-emerald-600" />
            ) : (
              <ArrowUpRight className="w-5 h-5 text-amber-600" />
            )}
            <h3 className="font-serif font-bold text-lg">Cash In / Cash Out</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMovementType('in')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                movementType === 'in'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-stone-50 border-stone-200 text-stone-600'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              Cash In (Float Add)
            </button>
            <button
              type="button"
              onClick={() => setMovementType('out')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                movementType === 'out'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-stone-50 border-stone-200 text-stone-600'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Cash Out (Expense)
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Amount (₦)
            </label>
            <input
              type="number"
              min="1"
              step="50"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-forest-800"
              placeholder="e.g. 2000"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Reason / Description
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-forest-800"
              placeholder="e.g. Bought ice blocks / Petty cash replenishment"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Reference / Receipt Voucher (Optional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-forest-800"
              placeholder="e.g. VOUCHER-098"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-forest-800 text-gold-300 rounded-xl text-xs font-bold hover:bg-forest-900 flex items-center justify-center gap-1.5 shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Cash Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

